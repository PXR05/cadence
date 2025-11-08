import { average } from "color.js";
import { BASE_URL, PLAYLIST_URL } from "$lib/api";
import type { CarouselAPI } from "$lib/components/ui/carousel/context";
import { createNestedLocalStorageState } from "./localStorage.svelte";
import { getAudioUrl, revokeAudioUrl } from "$lib/utils/offline";
import Color from "colorjs.io";
import { updateTrackColor } from "$lib/db/cache";
import { AudioEngine } from "./audioEngine";

export const getStreamUrl = (id: string) => `${BASE_URL}/${id}/stream`;
export const getImageUrl = (id: string) => `${BASE_URL}/${id}/image`;
export const getPlaylistImageUrl = (id: string) =>
  `${PLAYLIST_URL}/${id}/image`;

export type FilterType =
  | "lowshelf"
  | "peaking"
  | "highshelf"
  | "lowpass"
  | "highpass"
  | "notch"
  | "allpass"
  | "bandpass";

export interface EqualizerBand {
  id: number;
  type: FilterType;
  frequency: number;
  gain: number;
  Q: number;
  enabled: boolean;
  prevGain?: number;
}

interface PersistedPlayerState {
  currentTrack: AudioFile | null;
  trackColor: string;
  trackQueue: AudioFile[];
  shuffledIndices?: number[];
  queueIndex: number;
  isShuffled: boolean;
  isRepeated: boolean;
  isMuted: boolean;
  volume: number;
  currentTime: number;
  equalizerBands: EqualizerBand[];
  equalizerEnabled: boolean;
  reverbEnabled: boolean;
  reverbPreset: string;
}

class PlayerState {
  audioEngine = new AudioEngine();
  playerRef: HTMLAudioElement | null = $state(null);
  isPlaying: boolean = $state(false);
  duration: number = $state(0);
  private carousels = new Map<
    string,
    { api: CarouselAPI; handler: () => void }
  >();
  private currentBlobUrl: string | null = null;
  private cachedShuffledQueue: AudioFile[] | null = null;

  private persistedState = createNestedLocalStorageState<PersistedPlayerState>(
    "cadence.player_state",
    {
      currentTrack: null,
      trackColor: "",
      trackQueue: [],
      queueIndex: 0,
      isShuffled: false,
      isRepeated: false,
      isMuted: false,
      volume: 1,
      currentTime: 0,
      equalizerBands: [
        {
          id: 0,
          type: "lowshelf",
          frequency: 100,
          gain: 0,
          Q: 1,
          enabled: true,
        },
        {
          id: 1,
          type: "peaking",
          frequency: 400,
          gain: 0,
          Q: 1,
          enabled: true,
        },
        {
          id: 2,
          type: "peaking",
          frequency: 1000,
          gain: 0,
          Q: 1,
          enabled: true,
        },
        {
          id: 3,
          type: "peaking",
          frequency: 3000,
          gain: 0,
          Q: 1,
          enabled: true,
        },
        {
          id: 4,
          type: "highshelf",
          frequency: 8000,
          gain: 0,
          Q: 1,
          enabled: true,
        },
      ],
      equalizerEnabled: true,
      reverbEnabled: false,
      reverbPreset: "Small Hall 1",
    }
  );

  get currentTrack() {
    return this.persistedState.currentTrack;
  }
  set currentTrack(value: AudioFile | null) {
    this.persistedState.currentTrack = value;
  }

  get trackColor() {
    return this.persistedState.trackColor;
  }

  get trackQueue() {
    if (this.isShuffled && this.shuffledIndices) {
      if (!this.cachedShuffledQueue) {
        this.cachedShuffledQueue = this.shuffledIndices.map(
          (i) => this.persistedState.trackQueue[i]
        );
      }
      return this.cachedShuffledQueue;
    }
    return this.persistedState.trackQueue;
  }
  set trackQueue(value: AudioFile[]) {
    this.cachedShuffledQueue = null;
    this.persistedState.trackQueue = value;
  }

  get queueIndex() {
    return this.persistedState.queueIndex;
  }
  set queueIndex(value: number) {
    this.persistedState.queueIndex = value;
  }

  get shuffledIndices() {
    return this.persistedState.shuffledIndices;
  }
  set shuffledIndices(value: number[] | undefined) {
    this.cachedShuffledQueue = null;
    this.persistedState.shuffledIndices = value;
  }

  get isShuffled() {
    return this.persistedState.isShuffled;
  }
  set isShuffled(value: boolean) {
    this.cachedShuffledQueue = null;
    this.persistedState.isShuffled = value;
    if (!value && this.shuffledIndices) {
      this.queueIndex = this.shuffledIndices[this.queueIndex];
      this.syncCarouselToTrack(this.queueIndex);
      this.shuffledIndices = undefined;
    } else if (value) {
      this.shuffledIndices = this.shuffleQueue();
      this.queueIndex = this.shuffledIndices?.indexOf(this.queueIndex) ?? 0;
      this.syncCarouselToTrack(this.queueIndex);
    }
  }

  get isRepeated() {
    return this.persistedState.isRepeated;
  }
  set isRepeated(value: boolean) {
    this.persistedState.isRepeated = value;
  }

  get isMuted() {
    return this.persistedState.isMuted;
  }
  set isMuted(value: boolean) {
    this.persistedState.isMuted = value;
  }

  get volume() {
    return this.persistedState.volume;
  }
  set volume(value: number) {
    this.persistedState.volume = value;
    this.audioEngine.setVolume(value);
  }

  get currentTime() {
    return this.persistedState.currentTime;
  }
  set currentTime(value: number) {
    this.persistedState.currentTime = value;
  }

  get progress() {
    return this.duration ? this.currentTime / this.duration : 0;
  }

  get isLoaded() {
    return this.playerRef !== null;
  }

  get currentStreamUrl() {
    return this.currentTrack ? getStreamUrl(this.currentTrack.id) : "";
  }

  get currentImageUrl() {
    return this.currentTrack ? getImageUrl(this.currentTrack.id) : "";
  }

  get currentQueuePosition() {
    return this.queueIndex + 1;
  }

  get queueLength() {
    return this.trackQueue.length;
  }

  get equalizerBands() {
    return this.persistedState.equalizerBands;
  }

  get equalizerNodes() {
    return this.audioEngine.equalizerNodes;
  }

  get audioContext() {
    return this.audioEngine.audioContext;
  }

  get equalizerEnabled() {
    return this.persistedState.equalizerEnabled;
  }
  set equalizerEnabled(value: boolean) {
    this.persistedState.equalizerEnabled = value;
  }

  get reverbEnabled() {
    return this.persistedState.reverbEnabled;
  }
  set reverbEnabled(value: boolean) {
    this.persistedState.reverbEnabled = value;
  }

  get reverbPreset() {
    return this.persistedState.reverbPreset;
  }
  set reverbPreset(value: string) {
    this.persistedState.reverbPreset = value;
  }

  initialize(player: HTMLAudioElement) {
    this.playerRef = player;

    this.audioEngine.initialize(
      player,
      this.equalizerBands,
      this.equalizerEnabled,
      this.reverbEnabled,
      this.reverbPreset,
      this.volume
    );

    if (this.isMuted) {
      this.playerRef.muted = true;
    }

    if (this.currentTrack) {
      this.updateMetadata(this.currentTrack);
    }

    this.playerRef.addEventListener("loadedmetadata", () => {
      this.duration = this.playerRef!.duration || 0;
      if (this.currentTime > 0 && this.currentTime < this.duration) {
        this.playerRef!.currentTime = this.currentTime;
      }
    });

    this.playerRef.addEventListener("timeupdate", () => {
      if (this.playerRef && this.playerRef?.currentTime > 0) {
        this.currentTime = this.playerRef.currentTime;
      }
    });

    this.playerRef.addEventListener("ended", () => {
      this.isPlaying = false;
      this.playNext();
    });
  }

  cleanup() {
    if (this.currentBlobUrl) {
      revokeAudioUrl(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }

    this.audioEngine.cleanup();
  }

  getFrequencyData(): Uint8Array | null {
    return this.audioEngine.getFrequencyData();
  }

  getTimeDomainData(): Uint8Array | null {
    return this.audioEngine.getTimeDomainData();
  }

  setAnalyzerFFTSize(
    size: 32 | 64 | 128 | 256 | 512 | 1024 | 2048 | 4096 | 8192 | 16384 | 32768
  ) {
    this.audioEngine.setAnalyzerFFTSize(size);
  }

  setAnalyzerSmoothing(value: number) {
    this.audioEngine.setAnalyzerSmoothing(value);
  }

  updateEqualizerBand(id: number, updates: Partial<EqualizerBand>) {
    const bands = [...this.equalizerBands];
    const bandIndex = bands.findIndex((b) => b.id === id);

    if (bandIndex === -1) return;

    bands[bandIndex] = { ...bands[bandIndex], ...updates };

    this.persistedState.equalizerBands = bands;

    this.audioEngine.updateEqualizerBand(id, updates, bands);
  }

  toggleEqualizer() {
    this.equalizerEnabled = !this.equalizerEnabled;
    this.audioEngine.toggleEqualizer(this.equalizerEnabled);
  }

  resetEqualizer() {
    const resetBands = this.equalizerBands.map((band) => ({
      ...band,
      gain: 0,
    }));

    this.persistedState.equalizerBands = resetBands;

    this.audioEngine.resetEqualizer();
  }

  toggleReverb() {
    this.reverbEnabled = !this.reverbEnabled;
    this.audioEngine.toggleReverb(this.reverbEnabled);
  }

  async setReverbPreset(preset: string) {
    this.reverbPreset = preset;
    await this.audioEngine.setReverbPreset(preset);
  }

  initializeCarousel(id: string, api: CarouselAPI) {
    const existing = this.carousels.get(id);
    if (existing) {
      existing.api.off("select", existing.handler);
    }

    const handler = () => {
      const carousel = this.carousels.get(id);
      if (!carousel) return;

      const newIndex = carousel.api.selectedScrollSnap() ?? 0;
      if (newIndex !== this.queueIndex) {
        this.playAtIndex(newIndex);
      }
    };

    this.carousels.set(id, { api, handler });
    api.on("select", handler);

    if (this.currentTrack && this.trackQueue.length > 0) {
      this.syncCarouselToTrack(this.queueIndex, true);
    }
  }

  async updateMetadata(track: AudioFile) {
    if (!this.playerRef) return;

    if (this.currentBlobUrl) {
      revokeAudioUrl(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }

    const audioUrl = await getAudioUrl(track.id);
    this.playerRef.src = audioUrl;
    this.playerRef.load();

    if (audioUrl.startsWith("blob:")) {
      this.currentBlobUrl = audioUrl;
    }

    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.metadata?.title || track.filename || "Unknown Title",
        artist: track.metadata?.artist || "Unknown Artist",
        album:
          track.metadata?.album || track.metadata?.title || "Unknown Album",
        artwork: [
          {
            src: getImageUrl(track.id),
            type: "image/png",
          },
        ],
      });

      navigator.mediaSession.setActionHandler("play", () => this.play());
      navigator.mediaSession.setActionHandler("pause", () => this.pause());
      navigator.mediaSession.setActionHandler("seekto", (e) =>
        this.seek(e.seekTime ?? 0)
      );
      navigator.mediaSession.setActionHandler("previoustrack", () =>
        this.playPrevious()
      );
      navigator.mediaSession.setActionHandler("nexttrack", () =>
        this.playNext()
      );
    }

    await this.loadTrackColor(track);
  }

  async play(opts?: { track?: AudioFile; index?: number }) {
    const { track, index } = opts || {};
    if (this.playerRef) {
      await this.audioEngine.resumeContext();

      let newTrack: AudioFile | undefined = undefined;
      let newIndex: number | undefined = undefined;

      if (track && this.currentTrack?.id !== track.id) {
        newTrack = track;
        newIndex = this.trackQueue.findIndex((t) => t.id === track.id);
      } else if (
        index !== undefined &&
        this.currentTrack?.id !== this.trackQueue[index].id
      ) {
        newTrack = this.trackQueue[index];
        newIndex = index;
      }

      if (
        (track !== undefined || index !== undefined) &&
        newIndex !== undefined &&
        newTrack !== undefined
      ) {
        this.currentTrack = newTrack;
        this.queueIndex = newIndex;
        this.currentTime = 0;
        this.syncCarouselToTrack(newIndex);
        await this.updateMetadata(newTrack);
      }

      this.isPlaying = true;

      try {
        await this.playerRef.play();
      } catch (error) {
        console.error("Failed to play audio:", error);
        this.isPlaying = false;
      }
    }
  }

  pause() {
    if (this.playerRef && this.isPlaying) {
      this.isPlaying = false;
      this.playerRef.pause();
    }
  }

  togglePlayPause() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  playNext() {
    if (this.isRepeated) {
      this.seek(0);
      return;
    }
    if (this.queueIndex < this.trackQueue.length - 1) {
      this.queueIndex++;
      this.play({ index: this.queueIndex });
    } else if (this.trackQueue.length > 0) {
      this.queueIndex = 0;
      this.play({ index: 0 });
    } else {
      this.pause();
    }
  }

  playPrevious() {
    if (this.isRepeated) {
      this.seek(0);
      return;
    }
    if (this.queueIndex > 0) {
      this.queueIndex--;
      this.play({ index: this.queueIndex });
    } else if (this.trackQueue[0]) {
      this.play({ index: this.trackQueue.length - 1 });
    }
  }

  playAtIndex(index: number) {
    if (this.trackQueue[index]) {
      this.queueIndex = index;
      this.syncCarouselToTrack(index);
      this.play({ index });
    }
  }

  seek(time: number) {
    if (this.playerRef) {
      this.playerRef.currentTime = time;
      this.currentTime = time;
    }
  }

  setQueue(tracks: AudioFile[], startIndex: number = 0) {
    this.trackQueue = tracks;
    this.queueIndex = startIndex;
    if (tracks[startIndex]) {
      this.play({ index: startIndex });
    }
  }

  addToQueue(track: AudioFile) {
    this.cachedShuffledQueue = null;
    this.trackQueue.push(track);
  }

  addNextInQueue(track: AudioFile) {
    this.cachedShuffledQueue = null;
    this.trackQueue.splice(this.queueIndex + 1, 0, track);
  }

  removeFromQueue(index: number) {
    this.cachedShuffledQueue = null;
    if (index === this.queueIndex) {
      this.trackQueue.splice(index, 1);
      if (this.queueIndex >= this.trackQueue.length) {
        this.queueIndex = this.trackQueue.length - 1;
      }
      if (this.trackQueue[this.queueIndex]) {
        this.play({ index: this.queueIndex });
      } else {
        this.pause();
        this.currentTrack = null;
      }
    } else {
      this.trackQueue.splice(index, 1);
      if (index < this.queueIndex) {
        this.queueIndex--;
      }
    }
  }

  clearQueue() {
    this.trackQueue = [];
    this.queueIndex = -1;
  }

  shuffleQueue() {
    const trackLength = this.trackQueue.length;
    if (trackLength <= 1) return;

    const indices = Array.from({ length: trackLength }, (_, i) => i);
    for (let i = trackLength - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    return indices;
  }

  syncCarouselToTrack(index: number, jump: boolean = false) {
    for (const { api } of this.carousels.values()) {
      api.scrollTo(index, jump);
    }
  }

  async loadTrackColor(track: AudioFile) {
    if (track.color) {
      const color = new Color(track.color);
      document.body.style.setProperty(
        "--primary",
        `oklch(${color.coords[0]} ${color.coords[1]} ${color.coords[2]})`
      );

      this.persistedState.trackColor = track.color;
      return;
    }

    const imageColor = (await average(getImageUrl(track.id), {
      amount: 1,
      format: "hex",
    })) as string;

    const color = new Color(imageColor).to("oklch");

    const brighter = color.set({
      "oklch.l": 0.7,
      "oklch.c": 0.1,
    }) as Color;

    document.body.style.setProperty(
      "--primary",
      `oklch(${brighter.coords[0]} ${brighter.coords[1]} ${brighter.coords[2]})`
    );
    const brighterString = brighter.toString({ format: "hex" });

    this.persistedState.trackColor = brighterString;

    await updateTrackColor(track.id, brighterString);
  }
}

export const playerStore = new PlayerState();

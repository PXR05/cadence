import { average } from "color.js";
import { BASE_URL, PLAYLIST_URL } from "$lib/api";
import type { CarouselAPI } from "$lib/components/ui/carousel/context";
import { createLocalStorageState } from "./localStorage.svelte";
import { getAudioUrl, revokeAudioUrl } from "$lib/utils/offline";
import Color from "colorjs.io";

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
}

class PlayerState {
  audioContext: AudioContext | null = $state(null);
  playerRef: HTMLAudioElement | null = $state(null);
  sourceNode: MediaElementAudioSourceNode | null = $state(null);
  gainNode: GainNode | null = $state(null);
  analyzerNode: AnalyserNode | null = $state(null);
  equalizerNodes: BiquadFilterNode[] = $state([]);
  isPlaying: boolean = $state(false);
  duration: number = $state(0);
  private carousels = new Map<
    string,
    { api: CarouselAPI; handler: () => void }
  >();
  private currentBlobUrl: string | null = null;

  private persistedState = createLocalStorageState<PersistedPlayerState>(
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
    },
  );

  get currentTrack() {
    return this.persistedState.value.currentTrack;
  }
  set currentTrack(value: AudioFile | null) {
    this.persistedState.value = {
      ...this.persistedState.value,
      currentTrack: value,
    };
  }

  get trackColor() {
    return this.persistedState.value.trackColor;
  }

  get trackQueue() {
    return this.persistedState.value.trackQueue;
  }
  set trackQueue(value: AudioFile[]) {
    this.persistedState.value = {
      ...this.persistedState.value,
      trackQueue: value,
    };
  }

  get queueIndex() {
    return this.persistedState.value.queueIndex;
  }
  set queueIndex(value: number) {
    this.persistedState.value = {
      ...this.persistedState.value,
      queueIndex: value,
    };
  }

  get isShuffled() {
    return this.persistedState.value.isShuffled;
  }
  set isShuffled(value: boolean) {
    this.persistedState.value = {
      ...this.persistedState.value,
      isShuffled: value,
    };
  }

  get isRepeated() {
    return this.persistedState.value.isRepeated;
  }
  set isRepeated(value: boolean) {
    this.persistedState.value = {
      ...this.persistedState.value,
      isRepeated: value,
    };
  }

  get isMuted() {
    return this.persistedState.value.isMuted;
  }
  set isMuted(value: boolean) {
    this.persistedState.value = {
      ...this.persistedState.value,
      isMuted: value,
    };
  }

  get volume() {
    return this.persistedState.value.volume;
  }
  set volume(value: number) {
    this.persistedState.value = { ...this.persistedState.value, volume: value };
    if (this.gainNode) {
      this.gainNode.gain.value = value;
    }
  }

  get currentTime() {
    return this.persistedState.value.currentTime;
  }
  set currentTime(value: number) {
    this.persistedState.value = {
      ...this.persistedState.value,
      currentTime: value,
    };
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
    return this.persistedState.value.equalizerBands;
  }

  get equalizerEnabled() {
    return this.persistedState.value.equalizerEnabled;
  }
  set equalizerEnabled(value: boolean) {
    this.persistedState.value = {
      ...this.persistedState.value,
      equalizerEnabled: value,
    };
  }

  initialize(player: HTMLAudioElement) {
    this.playerRef = player;

    this.audioContext = new AudioContext();

    this.sourceNode = this.audioContext.createMediaElementSource(player);
    this.gainNode = this.audioContext.createGain();
    this.analyzerNode = this.audioContext.createAnalyser();

    this.analyzerNode.fftSize = 2048;
    this.analyzerNode.smoothingTimeConstant = 0.8;

    this.equalizerNodes = this.equalizerBands.map((band) => {
      const filter = this.audioContext!.createBiquadFilter();
      filter.type = band.type;
      filter.frequency.value = band.frequency;
      filter.gain.value = band.gain;
      filter.Q.value = band.Q;
      return filter;
    });

    this.sourceNode.connect(this.gainNode);

    if (this.equalizerEnabled && this.equalizerNodes.length > 0) {
      this.gainNode.connect(this.equalizerNodes[0]);

      for (let i = 0; i < this.equalizerNodes.length - 1; i++) {
        this.equalizerNodes[i].connect(this.equalizerNodes[i + 1]);
      }

      this.equalizerNodes[this.equalizerNodes.length - 1].connect(
        this.analyzerNode,
      );
    } else {
      this.gainNode.connect(this.analyzerNode);
    }

    this.analyzerNode.connect(this.audioContext.destination);

    this.gainNode.gain.value = this.volume;

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

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    if (this.equalizerNodes.length > 0) {
      this.equalizerNodes.forEach((node) => node.disconnect());
      this.equalizerNodes = [];
    }
    if (this.analyzerNode) {
      this.analyzerNode.disconnect();
      this.analyzerNode = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  getFrequencyData(): Uint8Array | null {
    if (!this.analyzerNode) return null;
    const bufferLength = this.analyzerNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyzerNode.getByteFrequencyData(dataArray);
    return dataArray;
  }

  getTimeDomainData(): Uint8Array | null {
    if (!this.analyzerNode) return null;
    const bufferLength = this.analyzerNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyzerNode.getByteTimeDomainData(dataArray);
    return dataArray;
  }

  setAnalyzerFFTSize(
    size: 32 | 64 | 128 | 256 | 512 | 1024 | 2048 | 4096 | 8192 | 16384 | 32768,
  ) {
    if (this.analyzerNode) {
      this.analyzerNode.fftSize = size;
    }
  }

  setAnalyzerSmoothing(value: number) {
    if (this.analyzerNode) {
      this.analyzerNode.smoothingTimeConstant = Math.max(0, Math.min(1, value));
    }
  }

  updateEqualizerBand(id: number, updates: Partial<EqualizerBand>) {
    const bands = [...this.equalizerBands];
    const bandIndex = bands.findIndex((b) => b.id === id);

    if (bandIndex === -1) return;

    bands[bandIndex] = { ...bands[bandIndex], ...updates };

    this.persistedState.value = {
      ...this.persistedState.value,
      equalizerBands: bands,
    };

    const node = this.equalizerNodes[bandIndex];
    if (node) {
      if (updates.type !== undefined) node.type = updates.type;
      if (updates.frequency !== undefined)
        node.frequency.value = updates.frequency;
      if (updates.gain !== undefined) node.gain.value = updates.gain;
      if (updates.Q !== undefined) node.Q.value = updates.Q;
      console.log(node);
    }
  }

  toggleEqualizer() {
    this.equalizerEnabled = !this.equalizerEnabled;
    this.reconnectAudioGraph();
  }

  resetEqualizer() {
    const resetBands = this.equalizerBands.map((band) => ({
      ...band,
      gain: 0,
    }));

    this.persistedState.value = {
      ...this.persistedState.value,
      equalizerBands: resetBands,
    };

    this.equalizerNodes.forEach((node) => {
      node.gain.value = 0;
    });
  }

  private reconnectAudioGraph() {
    if (!this.gainNode || !this.analyzerNode) return;

    this.gainNode.disconnect();
    this.equalizerNodes.forEach((node) => node.disconnect());

    if (this.equalizerEnabled && this.equalizerNodes.length > 0) {
      this.gainNode.connect(this.equalizerNodes[0]);

      for (let i = 0; i < this.equalizerNodes.length - 1; i++) {
        this.equalizerNodes[i].connect(this.equalizerNodes[i + 1]);
      }

      this.equalizerNodes[this.equalizerNodes.length - 1].connect(
        this.analyzerNode,
      );
    } else {
      this.gainNode.connect(this.analyzerNode);
    }
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
        this.seek(e.seekTime ?? 0),
      );
      navigator.mediaSession.setActionHandler("previoustrack", () =>
        this.playPrevious(),
      );
      navigator.mediaSession.setActionHandler("nexttrack", () =>
        this.playNext(),
      );
    }

    await this.loadTrackColor(track);
  }

  async play(opts?: { track?: AudioFile; index?: number }) {
    const { track, index } = opts || {};
    if (this.playerRef) {
      if (this.audioContext?.state === "suspended") {
        await this.audioContext.resume();
      }

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
    this.trackQueue.push(track);
  }

  addNextInQueue(track: AudioFile) {
    this.trackQueue.splice(this.queueIndex + 1, 0, track);
  }

  removeFromQueue(index: number) {
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
    // 1. create array of shuffled indices
    // 2. set isShuffled to true
  }

  syncCarouselToTrack(index: number, jump: boolean = false) {
    for (const { api } of this.carousels.values()) {
      api.scrollTo(index, jump);
    }
  }

  async loadTrackColor(track: AudioFile) {
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
      `oklch(${brighter.coords[0]} ${brighter.coords[1]} ${brighter.coords[2]})`,
    );

    this.persistedState.value = {
      ...this.persistedState.value,
      trackColor: brighter.toString(),
    };
  }
}

export const playerStore = new PlayerState();

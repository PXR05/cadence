import { average } from "color.js";
import { getStreamUrl, getImageUrl } from "$lib/constants";
import type { CarouselAPI } from "$lib/components/ui/carousel/context";
import { createNestedLocalStorageState } from "./localStorage.svelte";
import { getAudioUrl, revokeAudioUrl } from "$lib/utils/offline";
import Color from "colorjs.io";
import { updateTrackColor } from "$lib/db/cache";
import { authFetch } from "$lib/api/fetch";
import { AudioEngine } from "./audioEngine";
import type { AudioFile, PlaylistDetail } from "$lib/schemas";
import { resolvePlaybackSource } from "$lib/utils/trackSources";
import { historyStore } from "./history.svelte";
import { tracksStore } from "./tracks.svelte";
import { authStore } from "./auth.svelte";
import { nativeBridgeStore } from "./nativeBridge.svelte";
import { PlayerNativeDomain } from "./playerNative.svelte";
import { PlayerEqPresetSync } from "./playerEqPresetSync.svelte";
import {
  createDefaultEqualizerState,
  FLAT_EQUALIZER_PRESET_ID,
  type FilterType,
  PlayerEqualizerDomain,
  type EqualizerBand,
  type EqualizerPreset,
} from "./playerEqualizer.svelte";

export type {
  EqualizerBand,
  EqualizerPreset,
  FilterType,
} from "./playerEqualizer.svelte";

interface PersistedPlayerState {
  currentTrack: AudioFile | null;
  trackColor: string | null;
  trackQueue: AudioFile[];
  shuffledIndices?: number[];
  queueIndex: number;
  currentPlaylist: PlaylistDetail | null;
  isShuffled: boolean;
  isRepeated: boolean;
  isMuted: boolean;
  volume: number;
  currentTime: number;
  equalizerBands: EqualizerBand[];
  equalizerEnabled: boolean;
  preAmpDb: number;
  pureBypassEnabled: boolean;
  equalizerPresets: EqualizerPreset[];
  activeEqualizerPresetId: string | null;
}

class PlayerState {
  isPlaying: boolean = $state(false);
  duration: number = $state(0);
  private audioEngine = new AudioEngine();
  private playerRef: HTMLAudioElement | null = $state(null);
  private isWebSourceChanging = false;
  private webLoadRequestId = 0;
  private playRequestId = 0;
  private carousels = new Map<
    string,
    { api: CarouselAPI; handler: () => void }
  >();
  private currentBlobUrl: string | null = null;
  private cachedShuffledQueue: AudioFile[] | null = null;
  private mediaSessionHandlersInitialized = false;

  private persistedState = createNestedLocalStorageState<PersistedPlayerState>(
    "cadence.player_state",
    {
      currentTrack: null,
      trackColor: null,
      trackQueue: [],
      queueIndex: 0,
      currentPlaylist: null,
      isShuffled: false,
      isRepeated: false,
      isMuted: false,
      volume: 1,
      currentTime: 0,
      ...createDefaultEqualizerState(),
    },
  );

  private equalizerDomain = new PlayerEqualizerDomain(
    this.persistedState,
    this.audioEngine,
  );

  private eqPresetSync = new PlayerEqPresetSync({
    getSnapshot: () => ({
      schemaVersion: 1,
      presets: this.persistedState.equalizerPresets,
    }),
    applySnapshot: (snapshot) => {
      const previousActivePresetId =
        this.persistedState.activeEqualizerPresetId;
      this.persistedState.equalizerPresets = snapshot.presets;
      if (previousActivePresetId) {
        this.persistedState.activeEqualizerPresetId = previousActivePresetId;
      }
      this.equalizerDomain.migrateState();

      const activePresetId =
        this.persistedState.activeEqualizerPresetId ?? FLAT_EQUALIZER_PRESET_ID;
      this.equalizerDomain.applyEqualizerPreset(activePresetId);
    },
    isAuthenticated: () => authStore.isAuthenticated,
  });

  private nativeDomain = new PlayerNativeDomain({
    shouldUseNativePlayback: () => this.shouldUseNativePlayback(),
    getRuntimeContext: () => ({
      queueIndex: this.queueIndex,
      queueLength: this.trackQueue.length,
      trackId: this.currentTrack?.id ?? null,
      playlistId: this.currentPlaylist?.id ?? null,
    }),
    getCurrentTrackId: () => this.currentTrack?.id ?? null,
    applyNativeTiming: (positionSeconds?: number, durationSeconds?: number) =>
      this.applyNativeTiming(positionSeconds, durationSeconds),
    setIsPlaying: (isPlaying: boolean) => {
      this.isPlaying = isPlaying;
    },
    setMediaSessionPlaybackState: (state: MediaSessionPlaybackState) =>
      this.setMediaSessionPlaybackState(state),
    playNext: () => this.playNext(),
  });

  constructor() {
    this.equalizerDomain.migrateState();
  }

  get currentTrack() {
    return this.persistedState.currentTrack;
  }
  set currentTrack(value: AudioFile | null) {
    this.persistedState.currentTrack = value;
  }

  get trackColor() {
    return this.persistedState.trackColor;
  }

  get lightTrackColor() {
    return `color-mix(in oklab, ${playerStore.trackColor} 40%, var(--foreground))`;
  }

  get darkTrackColor() {
    return `color-mix(in oklab, ${playerStore.trackColor} 20%, transparent)`;
  }

  get trackQueue() {
    if (this.isShuffled && this.shuffledIndices) {
      if (!this.cachedShuffledQueue) {
        this.cachedShuffledQueue = this.shuffledIndices.map(
          (i) => this.persistedState.trackQueue[i],
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

  get currentPlaylist() {
    return this.persistedState.currentPlaylist;
  }
  set currentPlaylist(value: PlaylistDetail | null) {
    this.persistedState.currentPlaylist = value;
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

    if (this.shouldUseNativePlayback()) {
      this.nativeDomain.setVolume(value);
      return;
    }

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

  get bitPerfectSupported() {
    return nativeBridgeStore.info !== null;
  }

  get bitPerfectEnabled() {
    return true;
  }

  get isBitPerfectActive() {
    return this.shouldUseNativePlayback();
  }

  refreshBitPerfectSupport() {
    nativeBridgeStore.refreshNativeInfo();
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
    return this.equalizerDomain.equalizerBands;
  }

  get equalizerNodes() {
    return this.audioEngine.equalizerNodes;
  }

  get audioContext() {
    return this.audioEngine.audioContext;
  }

  get equalizerEnabled() {
    return this.equalizerDomain.equalizerEnabled;
  }
  set equalizerEnabled(value: boolean) {
    this.equalizerDomain.setEqualizerEnabled(value);
    this.eqPresetSync.notifyLocalChange();
  }

  get preAmpDb() {
    return this.equalizerDomain.preAmpDb;
  }
  set preAmpDb(value: number) {
    this.equalizerDomain.setPreAmpDb(value);
    this.eqPresetSync.notifyLocalChange();
  }

  get pureBypassEnabled() {
    return this.equalizerDomain.pureBypassEnabled;
  }
  set pureBypassEnabled(value: boolean) {
    this.equalizerDomain.setPureBypassEnabled(value);
  }

  get equalizerPresets() {
    return this.equalizerDomain.equalizerPresets;
  }

  get activeEqualizerPresetId() {
    return this.equalizerDomain.activeEqualizerPresetId;
  }

  get eqPresetSyncStatus() {
    return this.eqPresetSync.status;
  }

  get eqPresetSyncError() {
    return this.eqPresetSync.errorMessage;
  }

  initialize(player: HTMLAudioElement) {
    this.playerRef = player;
    this.initializeMediaSessionHandlers();

    if (this.currentTrack) {
      this.updateMediaSessionMetadata(this.currentTrack);
    }

    if (this.shouldUseNativePlayback()) {
      this.nativeDomain.initialize(this.volume, this.isMuted);
      this.setMediaSessionPlaybackState(this.isPlaying ? "playing" : "paused");
      return;
    }

    this.audioEngine.initialize(
      player,
      this.equalizerBands,
      this.equalizerEnabled,
      this.preAmpDb,
      this.pureBypassEnabled,
      this.volume,
    );

    if (this.isMuted) {
      this.playerRef.muted = true;
    }

    if (this.currentTrack) {
      this.updateMetadata(this.currentTrack, { resetProgress: false });
    }

    this.playerRef.addEventListener("loadedmetadata", () => {
      this.duration = this.playerRef!.duration || 0;
      if (this.currentTime >= 0 && this.currentTime <= this.duration) {
        this.playerRef!.currentTime = this.currentTime;
      }
      this.isWebSourceChanging = false;
    });

    this.playerRef.addEventListener("timeupdate", () => {
      if (
        this.playerRef &&
        !this.isWebSourceChanging &&
        this.playerRef.currentTime >= 0
      ) {
        this.currentTime = this.playerRef.currentTime;
      }
    });

    this.playerRef.addEventListener("ended", () => {
      this.isPlaying = false;
      this.playNext();
    });

    this.playerRef.addEventListener("error", async () => {
      if (this.currentTrack && !this.shouldUseNativePlayback()) {
        console.warn(
          "Audio playback error encountered. Attempting stream ticket recovery...",
        );
        try {
          const savedTime = this.currentTime;
          const audioUrl = await getAudioUrl(this.currentTrack.id, {
            forceRefreshTicket: true,
          });
          if (this.playerRef && this.currentTrack) {
            this.isWebSourceChanging = true;
            this.playerRef.src = audioUrl;
            this.playerRef.currentTime = savedTime;
            this.playerRef.load();
            if (this.isPlaying) {
              await this.playerRef.play().catch(() => {});
            }
          }
        } catch (recoveryErr) {
          console.error("Audio stream ticket recovery failed:", recoveryErr);
        }
      }
    });

    this.setMediaSessionPlaybackState(this.isPlaying ? "playing" : "paused");
  }

  cleanup() {
    if (this.currentBlobUrl) {
      revokeAudioUrl(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }

    if (this.shouldUseNativePlayback()) {
      this.nativeDomain.cleanup();
      return;
    }

    this.audioEngine.cleanup();
  }

  toggleMute() {
    this.isMuted = !this.isMuted;

    if (this.shouldUseNativePlayback()) {
      this.nativeDomain.setMuted(this.isMuted);
      return;
    }

    if (this.playerRef) {
      this.playerRef.muted = this.isMuted;
    }
  }

  getFrequencyData(): Uint8Array | null {
    return this.audioEngine.getFrequencyData();
  }

  updateEqualizerBand(id: number, updates: Partial<EqualizerBand>) {
    this.equalizerDomain.updateEqualizerBand(id, updates);
    this.eqPresetSync.notifyLocalChange();
  }

  toggleEqualizer() {
    this.equalizerDomain.toggleEqualizer();
    this.eqPresetSync.notifyLocalChange();
  }

  togglePureBypass() {
    this.equalizerDomain.togglePureBypass();
  }

  setPreAmpDb(value: number) {
    this.equalizerDomain.setPreAmpDb(value);
    this.eqPresetSync.notifyLocalChange();
  }

  resetEqualizer() {
    this.equalizerDomain.resetEqualizer();
    this.eqPresetSync.notifyLocalChange();
  }

  getEqualizerPresetById(presetId: string | null | undefined) {
    return this.equalizerDomain.getEqualizerPresetById(presetId);
  }

  createEqualizerPreset(name: string) {
    const created = this.equalizerDomain.createEqualizerPreset(name);
    this.eqPresetSync.notifyLocalChange();
    return created;
  }

  saveCurrentEqualizerPreset(presetId: string, name?: string) {
    const saved = this.equalizerDomain.saveCurrentEqualizerPreset(
      presetId,
      name,
    );
    if (saved) {
      this.eqPresetSync.notifyLocalChange();
    }
    return saved;
  }

  renameEqualizerPreset(presetId: string, name: string) {
    const renamed = this.equalizerDomain.renameEqualizerPreset(presetId, name);
    if (renamed) {
      this.eqPresetSync.notifyLocalChange();
    }
    return renamed;
  }

  applyEqualizerPreset(presetId: string) {
    const applied = this.equalizerDomain.applyEqualizerPreset(presetId);
    if (applied) {
      this.eqPresetSync.notifyLocalChange();
    }
    return applied;
  }

  deleteEqualizerPreset(presetId: string) {
    const deleted = this.equalizerDomain.deleteEqualizerPreset(presetId);
    if (deleted) {
      this.eqPresetSync.notifyLocalChange();
    }
    return deleted;
  }

  exportEqualizerPresetToText(presetId?: string) {
    return this.equalizerDomain.exportEqualizerPresetToText(presetId);
  }

  importEqualizerPresetFromText(text: string, nameHint?: string) {
    const imported = this.equalizerDomain.importEqualizerPresetFromText(
      text,
      nameHint,
    );
    this.eqPresetSync.notifyLocalChange();
    return imported;
  }

  findAvailableFrequency(): number | null {
    return this.equalizerDomain.findAvailableFrequency();
  }

  addEqualizerBand(options?: {
    frequency?: number;
    type?: FilterType;
    gain?: number;
    Q?: number;
    enabled?: boolean;
  }): EqualizerBand | null {
    const createdBand = this.equalizerDomain.addEqualizerBand(options);
    if (createdBand) {
      this.eqPresetSync.notifyLocalChange();
    }
    return createdBand;
  }

  removeEqualizerBand(id: number): boolean {
    const removed = this.equalizerDomain.removeEqualizerBand(id);
    if (removed) {
      this.eqPresetSync.notifyLocalChange();
    }
    return removed;
  }

  async hydrateEqPresetsFromBackend() {
    await this.eqPresetSync.hydrateFromBackend();
  }

  onAuthStateChanged() {
    if (!authStore.isAuthenticated) {
      this.eqPresetSync.resetHydration();
      return;
    }

    void this.hydrateEqPresetsFromBackend();
  }

  canUseFrequency(frequency: number, excludeBandId?: number): boolean {
    return this.equalizerDomain.canUseFrequency(frequency, excludeBandId);
  }

  private shouldUseNativePlayback() {
    return this.bitPerfectSupported;
  }

  private applyNativeTiming(
    positionSeconds?: number,
    durationSeconds?: number,
  ) {
    if (
      typeof durationSeconds === "number" &&
      Number.isFinite(durationSeconds)
    ) {
      this.duration = Math.max(0, durationSeconds);
    }

    if (
      typeof positionSeconds === "number" &&
      Number.isFinite(positionSeconds)
    ) {
      this.currentTime = Math.max(0, positionSeconds);
    }
  }

  get maxBands(): number {
    return this.equalizerDomain.maxBands;
  }

  private isMediaSessionSupported() {
    return typeof navigator !== "undefined" && "mediaSession" in navigator;
  }

  private setMediaSessionPlaybackState(state: MediaSessionPlaybackState) {
    if (!this.isMediaSessionSupported()) return;

    navigator.mediaSession.playbackState = state;
  }

  private updateMediaSessionMetadata(track: AudioFile) {
    if (!this.isMediaSessionSupported()) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.metadata?.title || track.filename || "Unknown Title",
      artist: track.metadata?.artist || "Unknown Artist",
      album: track.metadata?.album || track.metadata?.title || "Unknown Album",
      artwork: [
        {
          src: getImageUrl(track.id),
          type: "image/png",
        },
      ],
    });
  }

  private initializeMediaSessionHandlers() {
    if (
      !this.isMediaSessionSupported() ||
      this.mediaSessionHandlersInitialized
    ) {
      return;
    }

    navigator.mediaSession.setActionHandler("play", () => this.play());
    navigator.mediaSession.setActionHandler("pause", () => this.pause());
    navigator.mediaSession.setActionHandler("seekto", (e) =>
      this.seek(e.seekTime ?? 0),
    );
    navigator.mediaSession.setActionHandler("previoustrack", () =>
      this.playPrevious(),
    );
    navigator.mediaSession.setActionHandler("nexttrack", () => this.playNext());

    this.mediaSessionHandlersInitialized = true;
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

  async updateMetadata(
    track: AudioFile,
    opts?: {
      resetProgress?: boolean;
    },
  ) {
    const { resetProgress = true } = opts ?? {};

    this.initializeMediaSessionHandlers();

    const usingNative = this.shouldUseNativePlayback();
    const webRequestId = usingNative ? 0 : ++this.webLoadRequestId;

    if (!usingNative && this.playerRef) {
      this.isWebSourceChanging = true;
      if (resetProgress) {
        this.currentTime = 0;
      }
      this.duration = 0;
      this.playerRef.pause();
    }

    const sourceTrack = await resolvePlaybackSource(
      track,
      tracksStore.getSourcesForTrack(track),
    );

    if (usingNative) {
      this.updateMediaSessionMetadata(track);
      this.nativeDomain.updateTrack(track, sourceTrack);
      this.loadTrackColor(track).catch((error) => {
        console.error("Failed to load track color:", error);
      });
      return;
    }

    if (!this.playerRef) return;
    if (
      webRequestId !== this.webLoadRequestId ||
      this.currentTrack?.id !== track.id
    ) {
      return;
    }

    if (this.currentBlobUrl) {
      revokeAudioUrl(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }

    const audioUrl = await getAudioUrl(sourceTrack.id, {
      useCustomAuthFetch: authStore.shouldUseCustomMediaAuthFetch,
    });

    if (
      webRequestId !== this.webLoadRequestId ||
      this.currentTrack?.id !== track.id
    ) {
      if (audioUrl.startsWith("blob:")) {
        revokeAudioUrl(audioUrl);
      }
      return;
    }

    this.isWebSourceChanging = true;
    this.playerRef.src = audioUrl;
    if (resetProgress) {
      this.playerRef.currentTime = 0;
    }
    this.playerRef.load();
    this.updateMediaSessionMetadata(track);

    if (audioUrl.startsWith("blob:")) {
      this.currentBlobUrl = audioUrl;
    }

    this.loadTrackColor(track).catch((error) => {
      console.error("Failed to load track color:", error);
    });
  }

  async play(opts?: {
    track?: AudioFile;
    index?: number;
    forceTrackReload?: boolean;
  }) {
    const { track, index, forceTrackReload = false } = opts || {};
    const requestId = ++this.playRequestId;
    if (this.playerRef || this.shouldUseNativePlayback()) {
      await this.audioEngine.resumeContext();

      let newTrack: AudioFile | undefined = undefined;
      let newIndex: number | undefined = undefined;

      if (track && this.currentTrack?.id !== track.id) {
        newTrack = track;
        newIndex = this.trackQueue.findIndex((t) => t.id === track.id);
      } else if (
        index !== undefined &&
        this.trackQueue[index] &&
        (forceTrackReload ||
          this.currentTrack?.id !== this.trackQueue[index].id)
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
        this.initializeMediaSessionHandlers();
        await this.updateMetadata(newTrack);
        if (requestId !== this.playRequestId) {
          return;
        }

        await historyStore.addToHistory(newTrack.id, this.currentPlaylist?.id);
        if (requestId !== this.playRequestId) {
          return;
        }
      } else if (index !== undefined && this.trackQueue[index]) {
        this.queueIndex = index;
        this.syncCarouselToTrack(index, true);
      }

      if (requestId !== this.playRequestId) {
        return;
      }

      this.isPlaying = true;
      this.setMediaSessionPlaybackState("playing");

      if (this.shouldUseNativePlayback()) {
        this.nativeDomain.play({ track, index }, this.currentTime);
        return;
      }

      try {
        await this.playerRef!.play();
      } catch (error) {
        const replayed = await this.retryWebPlayAfterLoad();
        if (!replayed) {
          console.error("Failed to play audio:", error);
          this.isPlaying = false;
          this.setMediaSessionPlaybackState("paused");
        }
      }
    }
  }

  private async retryWebPlayAfterLoad() {
    if (!this.playerRef || this.shouldUseNativePlayback()) {
      return false;
    }

    const player = this.playerRef;

    if (player.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      await new Promise<void>((resolve) => {
        let settled = false;

        const cleanup = () => {
          if (settled) return;
          settled = true;
          player.removeEventListener("canplay", onReady);
          player.removeEventListener("loadeddata", onReady);
          clearTimeout(timeoutId);
          resolve();
        };

        const onReady = () => cleanup();

        const timeoutId = window.setTimeout(() => cleanup(), 2000);
        player.addEventListener("canplay", onReady, { once: true });
        player.addEventListener("loadeddata", onReady, { once: true });
      });
    }

    try {
      await player.play();
      this.isPlaying = true;
      this.setMediaSessionPlaybackState("playing");
      return true;
    } catch {
      return false;
    }
  }

  pause() {
    if (!this.isPlaying) return;

    if (this.shouldUseNativePlayback()) {
      this.isPlaying = false;
      this.nativeDomain.pause(this.currentTime);
      this.setMediaSessionPlaybackState("paused");
      return;
    }

    if (this.playerRef) {
      this.isPlaying = false;
      this.playerRef.pause();
      this.setMediaSessionPlaybackState("paused");
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
      this.play({ index: this.queueIndex });
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
      this.play({ index: this.queueIndex });
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
    if (this.shouldUseNativePlayback()) {
      this.currentTime = time;
      this.nativeDomain.seek(time);
      return;
    }

    if (this.playerRef) {
      this.playerRef.currentTime = time;
      this.currentTime = time;
    }
  }

  setQueue(
    tracks: AudioFile[],
    startIndex: number = 0,
    playlist: PlaylistDetail | null = null,
  ) {
    this.currentPlaylist = playlist;
    this.isShuffled = false;
    this.trackQueue = tracks;
    this.queueIndex = startIndex;
    if (tracks[startIndex]) {
      this.syncCarouselToTrack(startIndex, true);
      const shouldForceReload = this.currentTrack?.id !== tracks[startIndex].id;
      this.play({ index: startIndex, forceTrackReload: shouldForceReload });
    }
  }

  addToQueue(track: AudioFile) {
    this.cachedShuffledQueue = null;

    if (this.trackQueue.length === 0 || !this.currentTrack) {
      this.setQueue([track], 0);
    } else {
      this.trackQueue.push(track);
    }
  }

  addPlaylistToQueue(tracks: AudioFile[]) {
    if (tracks.length === 0) return;

    this.cachedShuffledQueue = null;

    if (this.trackQueue.length === 0 || !this.currentTrack) {
      this.setQueue(tracks, 0);
    } else {
      this.trackQueue.push(...tracks);
    }
  }

  addNextInQueue(track: AudioFile) {
    this.cachedShuffledQueue = null;

    if (this.trackQueue.length === 0 || !this.currentTrack) {
      this.setQueue([track], 0);
    } else {
      this.trackQueue.splice(this.queueIndex + 1, 0, track);
    }
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
        this.currentPlaylist = null;
      }
    } else {
      this.trackQueue.splice(index, 1);
      if (index < this.queueIndex) {
        this.queueIndex--;
      }
    }
  }

  reorderQueue(from: number, to: number) {
    if (from === to) return;

    if (this.isShuffled && this.shuffledIndices) {
      const newIndices = [...this.shuffledIndices];
      const [movedIndex] = newIndices.splice(from, 1);
      newIndices.splice(to, 0, movedIndex);
      this.shuffledIndices = newIndices;
    } else {
      const newQueue = [...this.persistedState.trackQueue];
      const [movedTrack] = newQueue.splice(from, 1);
      newQueue.splice(to, 0, movedTrack);
      this.trackQueue = newQueue;
    }

    if (this.queueIndex === from) {
      this.queueIndex = to;
    } else if (from < this.queueIndex && to >= this.queueIndex) {
      this.queueIndex--;
    } else if (from > this.queueIndex && to <= this.queueIndex) {
      this.queueIndex++;
    }

    this.syncCarouselToTrack(this.queueIndex);
  }

  clearQueue() {
    this.trackQueue = [];
    this.queueIndex = -1;
    this.currentPlaylist = null;
  }

  resetContentState() {
    this.pause();

    if (this.shouldUseNativePlayback()) {
      this.nativeDomain.stop();
    }

    this.clearQueue();
    this.currentTrack = null;
    this.currentTime = 0;
    this.duration = 0;
    this.shuffledIndices = undefined;
    this.isShuffled = false;
    this.persistedState.trackColor = null;

    if (this.playerRef) {
      this.playerRef.src = "";
      this.playerRef.load();
    }
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
      const color = new Color(track.color).to("oklch");
      document.body.style.setProperty(
        "--primary",
        `oklch(${color.coords[0]?.toFixed(3)} ${color.coords[1]?.toFixed(3)} ${color.coords[2]?.toFixed(3)})`,
      );
      this.persistedState.trackColor = track.color;
      return;
    }

    const imageUrl = getImageUrl(track.id);
    const imageResponse = authStore.shouldUseCustomMediaAuthFetch
      ? await authFetch(imageUrl)
      : await fetch(imageUrl, {
          credentials: "include",
        });
    const imageBlob = await imageResponse.blob();
    const imageBlobUrl = URL.createObjectURL(imageBlob);

    const imageColor = (await average(imageBlobUrl, {
      amount: 1,
      format: "hex",
    })) as string;

    URL.revokeObjectURL(imageBlobUrl);

    const color = new Color(imageColor).to("oklch");

    const brighter = color.set({
      "oklch.l": 0.7,
      "oklch.c": 0.1,
    }) as Color;

    document.body.style.setProperty(
      "--primary",
      `oklch(${brighter.coords[0]} ${brighter.coords[1]} ${brighter.coords[2]})`,
    );
    const brighterString = brighter.toString({ format: "hex" });

    this.persistedState.trackColor = brighterString;

    await updateTrackColor(track.id, brighterString);
  }
}

export const playerStore = new PlayerState();

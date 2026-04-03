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

export interface EqualizerPreset {
  id: string;
  name: string;
  bands: EqualizerBand[];
  preAmpDb: number;
  equalizerEnabled: boolean;
}

const FLAT_EQUALIZER_PRESET_ID = "flat";
const FLAT_EQUALIZER_PRESET_NAME = "Flat";
const MIN_PREAMP_DB = -30;
const MAX_PREAMP_DB = 30;
const MIN_BAND_FREQUENCY = 20;
const MAX_BAND_FREQUENCY = 20000;
const MIN_BAND_Q = 0.1;
const MAX_BAND_Q = 10;
const DEFAULT_NEW_BAND_FREQUENCY = 1000;

const FILTER_TYPE_TOKENS: Record<FilterType, string> = {
  peaking: "PK",
  lowshelf: "LS",
  highshelf: "HS",
  lowpass: "LP",
  highpass: "HP",
  notch: "NT",
  bandpass: "BP",
  allpass: "AP",
};

const TOKEN_TO_FILTER_TYPE: Record<string, FilterType> = {
  PK: "peaking",
  LS: "lowshelf",
  HS: "highshelf",
  LP: "lowpass",
  HP: "highpass",
  NT: "notch",
  BP: "bandpass",
  AP: "allpass",
};

const FILTER_TYPES: FilterType[] = [
  "lowshelf",
  "peaking",
  "highshelf",
  "lowpass",
  "highpass",
  "notch",
  "allpass",
  "bandpass",
];

const DEFAULT_EQUALIZER_BANDS: EqualizerBand[] = [
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
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function isFilterType(value: unknown): value is FilterType {
  return (
    typeof value === "string" && FILTER_TYPES.includes(value as FilterType)
  );
}

function cloneEqualizerBands(bands: EqualizerBand[]): EqualizerBand[] {
  return bands.map((band) => ({ ...band }));
}

interface ParsedEqPresetText {
  preAmpDb: number;
  bands: EqualizerBand[];
  truncated: boolean;
}

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
      equalizerBands: cloneEqualizerBands(DEFAULT_EQUALIZER_BANDS),
      equalizerEnabled: true,
      preAmpDb: 0,
      pureBypassEnabled: false,
      equalizerPresets: [
        {
          id: FLAT_EQUALIZER_PRESET_ID,
          name: FLAT_EQUALIZER_PRESET_NAME,
          bands: cloneEqualizerBands(DEFAULT_EQUALIZER_BANDS),
          preAmpDb: 0,
          equalizerEnabled: true,
        },
      ],
      activeEqualizerPresetId: FLAT_EQUALIZER_PRESET_ID,
    },
  );

  constructor() {
    this.migrateEqualizerState();
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
    this.syncActivePresetFromCurrentEq();
  }

  get preAmpDb() {
    return this.persistedState.preAmpDb ?? 0;
  }
  set preAmpDb(value: number) {
    const clampedDb = Math.max(-30, Math.min(30, value));
    this.persistedState.preAmpDb = clampedDb;
    this.audioEngine.setPreAmpDb(clampedDb);
    this.syncActivePresetFromCurrentEq();
  }

  get pureBypassEnabled() {
    return this.persistedState.pureBypassEnabled;
  }
  set pureBypassEnabled(value: boolean) {
    this.persistedState.pureBypassEnabled = value;
  }

  get equalizerPresets() {
    return this.persistedState.equalizerPresets;
  }

  get activeEqualizerPresetId() {
    return this.persistedState.activeEqualizerPresetId;
  }

  initialize(player: HTMLAudioElement) {
    this.playerRef = player;
    this.initializeMediaSessionHandlers();

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
      this.updateMediaSessionMetadata(this.currentTrack);
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

    this.setMediaSessionPlaybackState(this.isPlaying ? "playing" : "paused");
  }

  cleanup() {
    if (this.currentBlobUrl) {
      revokeAudioUrl(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }

    this.audioEngine.cleanup();
  }

  toggleMute() {
    this.isMuted = !this.isMuted;

    if (this.playerRef) {
      this.playerRef.muted = this.isMuted;
    }
  }

  getFrequencyData(): Uint8Array | null {
    return this.audioEngine.getFrequencyData();
  }

  getTimeDomainData(): Uint8Array | null {
    return this.audioEngine.getTimeDomainData();
  }

  setAnalyzerFFTSize(
    size: 32 | 64 | 128 | 256 | 512 | 1024 | 2048 | 4096 | 8192 | 16384 | 32768,
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
    this.syncActivePresetFromCurrentEq();
  }

  toggleEqualizer() {
    this.equalizerEnabled = !this.equalizerEnabled;
    this.audioEngine.toggleEqualizer(this.equalizerEnabled);
  }

  togglePureBypass() {
    this.pureBypassEnabled = !this.pureBypassEnabled;
    this.audioEngine.togglePureBypass(this.pureBypassEnabled);
  }

  setPreAmpDb(value: number) {
    this.preAmpDb = value;
  }

  resetEqualizer() {
    const resetBands = this.equalizerBands.map((band) => ({
      ...band,
      gain: 0,
    }));

    this.persistedState.equalizerBands = resetBands;

    this.audioEngine.resetEqualizer();
    this.syncActivePresetFromCurrentEq();
  }

  getEqualizerPresetById(presetId: string | null | undefined) {
    if (!presetId) return null;
    return (
      this.equalizerPresets.find((preset) => preset.id === presetId) ?? null
    );
  }

  createEqualizerPreset(name: string) {
    const uniqueName = this.getUniquePresetName(name || "Preset");
    const preset: EqualizerPreset = {
      id: this.createPresetId(),
      name: uniqueName,
      bands: cloneEqualizerBands(this.equalizerBands),
      preAmpDb: this.preAmpDb,
      equalizerEnabled: this.equalizerEnabled,
    };

    this.persistedState.equalizerPresets = [...this.equalizerPresets, preset];
    this.persistedState.activeEqualizerPresetId = preset.id;

    return preset;
  }

  saveCurrentEqualizerPreset(presetId: string, name?: string) {
    const presetIndex = this.equalizerPresets.findIndex(
      (preset) => preset.id === presetId,
    );
    if (presetIndex === -1) return null;

    const presets = [...this.equalizerPresets];
    const currentPreset = presets[presetIndex];
    const nextName =
      name !== undefined
        ? this.getUniquePresetName(name, currentPreset.id)
        : currentPreset.name;

    presets[presetIndex] = {
      ...currentPreset,
      name: nextName,
      bands: cloneEqualizerBands(this.equalizerBands),
      preAmpDb: this.preAmpDb,
      equalizerEnabled: this.equalizerEnabled,
    };

    this.persistedState.equalizerPresets = presets;

    return presets[presetIndex];
  }

  renameEqualizerPreset(presetId: string, name: string) {
    const presetIndex = this.equalizerPresets.findIndex(
      (preset) => preset.id === presetId,
    );
    if (presetIndex === -1 || presetId === FLAT_EQUALIZER_PRESET_ID)
      return null;

    const presets = [...this.equalizerPresets];
    presets[presetIndex] = {
      ...presets[presetIndex],
      name: this.getUniquePresetName(name, presetId),
    };

    this.persistedState.equalizerPresets = presets;

    return presets[presetIndex];
  }

  applyEqualizerPreset(presetId: string) {
    const preset = this.getEqualizerPresetById(presetId);
    if (!preset) return false;

    this.applyEqualizerSnapshot(preset);
    this.persistedState.activeEqualizerPresetId = preset.id;

    return true;
  }

  deleteEqualizerPreset(presetId: string) {
    if (presetId === FLAT_EQUALIZER_PRESET_ID) {
      return false;
    }

    const presetExists = this.equalizerPresets.some(
      (preset) => preset.id === presetId,
    );
    if (!presetExists) {
      return false;
    }

    const remainingPresets = this.equalizerPresets.filter(
      (preset) => preset.id !== presetId,
    );

    this.persistedState.equalizerPresets = remainingPresets;

    if (this.activeEqualizerPresetId === presetId) {
      const fallbackPreset =
        this.getEqualizerPresetById(FLAT_EQUALIZER_PRESET_ID) ??
        remainingPresets[0];

      if (fallbackPreset) {
        this.applyEqualizerSnapshot(fallbackPreset);
        this.persistedState.activeEqualizerPresetId = fallbackPreset.id;
      } else {
        this.persistedState.activeEqualizerPresetId = null;
      }
    }

    return true;
  }

  exportEqualizerPresetToText(presetId?: string) {
    const targetPresetId =
      presetId ?? this.activeEqualizerPresetId ?? this.equalizerPresets[0]?.id;
    const preset = this.getEqualizerPresetById(targetPresetId);

    if (!preset) {
      return null;
    }

    const lines = [`Preamp: ${preset.preAmpDb.toFixed(1)} dB`];

    preset.bands.forEach((band, index) => {
      const token = FILTER_TYPE_TOKENS[band.type] ?? "PK";
      const gain = band.enabled ? band.gain : (band.prevGain ?? band.gain);
      lines.push(
        `Filter ${index + 1}: ${band.enabled ? "ON" : "OFF"} ${token} Fc ${Math.round(band.frequency)} Hz Gain ${gain.toFixed(1)} dB Q ${band.Q.toFixed(3)}`,
      );
    });

    return lines.join("\n");
  }

  importEqualizerPresetFromText(text: string, nameHint?: string) {
    const parsed = this.parseEqualizerPresetText(text);
    const preferredName =
      typeof nameHint === "string" && nameHint.trim().length > 0
        ? nameHint.trim()
        : "Imported preset";

    const preset: EqualizerPreset = {
      id: this.createPresetId(),
      name: this.getUniquePresetName(preferredName),
      bands: parsed.bands,
      preAmpDb: parsed.preAmpDb,
      equalizerEnabled: true,
    };

    this.persistedState.equalizerPresets = [...this.equalizerPresets, preset];
    this.applyEqualizerSnapshot(preset);
    this.persistedState.activeEqualizerPresetId = preset.id;

    return {
      preset,
      truncated: parsed.truncated,
    };
  }

  private parseEqualizerPresetText(text: string): ParsedEqPresetText {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      throw new Error("Preset file is empty.");
    }

    let preAmpDb = 0;
    const parsedBands: Array<{ order: number; band: EqualizerBand }> = [];

    for (const line of lines) {
      const preampMatch = line.match(/^Preamp:\s*([+-]?\d+(?:\.\d+)?)\s*dB$/i);
      if (preampMatch) {
        preAmpDb = clamp(
          parseFloat(preampMatch[1]),
          MIN_PREAMP_DB,
          MAX_PREAMP_DB,
        );
        continue;
      }

      const filterMatch = line.match(
        /^Filter\s+(\d+):\s*(ON|OFF)\s+([A-Z]+)\s+Fc\s+([+-]?\d+(?:\.\d+)?)\s*Hz\s+Gain\s+([+-]?\d+(?:\.\d+)?)\s*dB\s+Q\s+([+-]?\d+(?:\.\d+)?)/i,
      );

      if (!filterMatch) {
        continue;
      }

      const order = Math.max(1, parseInt(filterMatch[1], 10));
      const enabled = filterMatch[2].toUpperCase() === "ON";
      const token = filterMatch[3].toUpperCase();
      const mappedType = TOKEN_TO_FILTER_TYPE[token];
      if (!mappedType) {
        throw new Error(`Unsupported filter type token: ${token}`);
      }

      const frequency = clamp(
        parseFloat(filterMatch[4]),
        MIN_BAND_FREQUENCY,
        MAX_BAND_FREQUENCY,
      );
      const parsedGain = clamp(
        parseFloat(filterMatch[5]),
        MIN_PREAMP_DB,
        MAX_PREAMP_DB,
      );
      const q = clamp(parseFloat(filterMatch[6]), MIN_BAND_Q, MAX_BAND_Q);

      parsedBands.push({
        order,
        band: {
          id: 0,
          type: mappedType,
          frequency,
          gain: enabled ? parsedGain : 0,
          Q: q,
          enabled,
          prevGain: enabled ? undefined : parsedGain,
        },
      });
    }

    if (parsedBands.length === 0) {
      throw new Error("No filter lines found in preset file.");
    }

    parsedBands.sort((a, b) => a.order - b.order);
    const truncated = parsedBands.length > this.maxBands;
    const bands = parsedBands
      .slice(0, this.maxBands)
      .map((entry, index) => this.normalizeBand(entry.band, index));

    return {
      preAmpDb,
      bands,
      truncated,
    };
  }

  private migrateEqualizerState() {
    this.persistedState.equalizerBands = this.normalizeBands(
      this.persistedState.equalizerBands,
      1,
    );

    const basePresets = Array.isArray(this.persistedState.equalizerPresets)
      ? this.persistedState.equalizerPresets
      : [];

    let presets = this.dedupePresets(
      basePresets.map((preset, index) => this.normalizePreset(preset, index)),
    );

    if (!presets.some((preset) => preset.id === FLAT_EQUALIZER_PRESET_ID)) {
      presets = [this.createFlatPreset(), ...presets];
    }

    if (presets.length === 1 && presets[0].id === FLAT_EQUALIZER_PRESET_ID) {
      const currentPreset: EqualizerPreset = {
        id: this.createPresetId(),
        name: "Current",
        bands: cloneEqualizerBands(this.persistedState.equalizerBands),
        preAmpDb: this.preAmpDb,
        equalizerEnabled: this.equalizerEnabled,
      };

      if (!this.isSamePresetShape(currentPreset, presets[0])) {
        presets.push(currentPreset);
      }
    }

    this.persistedState.equalizerPresets = presets;

    const requestedActiveId = this.persistedState.activeEqualizerPresetId;
    const resolvedActiveId =
      typeof requestedActiveId === "string" &&
      presets.some((preset) => preset.id === requestedActiveId)
        ? requestedActiveId
        : (presets[0]?.id ?? FLAT_EQUALIZER_PRESET_ID);

    this.persistedState.activeEqualizerPresetId = resolvedActiveId;
  }

  private createFlatPreset(): EqualizerPreset {
    return {
      id: FLAT_EQUALIZER_PRESET_ID,
      name: FLAT_EQUALIZER_PRESET_NAME,
      bands: cloneEqualizerBands(DEFAULT_EQUALIZER_BANDS),
      preAmpDb: 0,
      equalizerEnabled: true,
    };
  }

  private normalizePreset(
    preset: Partial<EqualizerPreset> | null | undefined,
    index: number,
  ): EqualizerPreset {
    if (preset?.id === FLAT_EQUALIZER_PRESET_ID) {
      return this.createFlatPreset();
    }

    return {
      id:
        typeof preset?.id === "string" && preset.id.trim().length > 0
          ? preset.id.trim()
          : `preset-${index + 1}`,
      name:
        typeof preset?.name === "string" && preset.name.trim().length > 0
          ? preset.name.trim()
          : `Preset ${index + 1}`,
      bands: this.normalizeBands(preset?.bands, 1),
      preAmpDb: clamp(preset?.preAmpDb ?? 0, MIN_PREAMP_DB, MAX_PREAMP_DB),
      equalizerEnabled: preset?.equalizerEnabled ?? true,
    };
  }

  private dedupePresets(presets: EqualizerPreset[]) {
    const usedIds = new Set<string>();
    const usedNames = new Set<string>();

    return presets.map((preset) => {
      let nextId = preset.id;
      if (usedIds.has(nextId)) {
        nextId = this.createPresetId();
      }
      usedIds.add(nextId);

      let nextName = preset.name;
      if (nextName.trim().length === 0) {
        nextName = "Preset";
      }

      const baseName = nextName;
      let suffix = 2;
      while (usedNames.has(nextName.toLowerCase())) {
        nextName = `${baseName} (${suffix})`;
        suffix += 1;
      }
      usedNames.add(nextName.toLowerCase());

      if (nextId === FLAT_EQUALIZER_PRESET_ID) {
        return this.createFlatPreset();
      }

      return {
        ...preset,
        id: nextId,
        name: nextName,
        bands: this.normalizeBands(preset.bands, 1),
        preAmpDb: clamp(preset.preAmpDb, MIN_PREAMP_DB, MAX_PREAMP_DB),
      };
    });
  }

  private normalizeBands(
    bands: Array<Partial<EqualizerBand>> | EqualizerBand[] | undefined,
    minBands: number,
  ) {
    const normalizedBands = (Array.isArray(bands) ? bands : [])
      .slice(0, this.maxBands)
      .map((band, index) => this.normalizeBand(band, index));

    while (normalizedBands.length < minBands) {
      normalizedBands.push(this.createDisabledBand(normalizedBands.length));
    }

    return normalizedBands;
  }

  private createDisabledBand(id: number): EqualizerBand {
    return {
      id,
      type: "peaking",
      frequency: DEFAULT_NEW_BAND_FREQUENCY,
      gain: 0,
      Q: 1,
      enabled: false,
    };
  }

  private normalizeBand(
    band: Partial<EqualizerBand> | EqualizerBand,
    id: number,
  ): EqualizerBand {
    const fallbackBand =
      DEFAULT_EQUALIZER_BANDS[id] ?? this.createDisabledBand(id);

    const frequency = clamp(
      Number.isFinite(band.frequency)
        ? Number(band.frequency)
        : fallbackBand.frequency,
      MIN_BAND_FREQUENCY,
      MAX_BAND_FREQUENCY,
    );
    const gain = clamp(
      Number.isFinite(band.gain) ? Number(band.gain) : fallbackBand.gain,
      MIN_PREAMP_DB,
      MAX_PREAMP_DB,
    );
    const Q = clamp(
      Number.isFinite(band.Q) ? Number(band.Q) : fallbackBand.Q,
      MIN_BAND_Q,
      MAX_BAND_Q,
    );

    const prevGain =
      Number.isFinite(band.prevGain) && typeof band.prevGain === "number"
        ? clamp(band.prevGain, MIN_PREAMP_DB, MAX_PREAMP_DB)
        : undefined;

    return {
      id,
      type: isFilterType(band.type) ? band.type : fallbackBand.type,
      frequency,
      gain,
      Q,
      enabled:
        typeof band.enabled === "boolean" ? band.enabled : fallbackBand.enabled,
      prevGain,
    };
  }

  private createPresetId() {
    return `eq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private getUniquePresetName(name: string, excludePresetId?: string) {
    const trimmed = name.trim();
    const baseName = trimmed.length > 0 ? trimmed : "Preset";

    const existingNames = new Set(
      this.equalizerPresets
        .filter((preset) => preset.id !== excludePresetId)
        .map((preset) => preset.name.toLowerCase()),
    );

    if (!existingNames.has(baseName.toLowerCase())) {
      return baseName;
    }

    let suffix = 2;
    let nextName = `${baseName} (${suffix})`;
    while (existingNames.has(nextName.toLowerCase())) {
      suffix += 1;
      nextName = `${baseName} (${suffix})`;
    }

    return nextName;
  }

  private syncActivePresetFromCurrentEq() {
    const activePresetId = this.persistedState.activeEqualizerPresetId;
    if (!activePresetId) {
      return;
    }

    this.saveCurrentEqualizerPreset(activePresetId);
  }

  private applyEqualizerSnapshot(
    snapshot: Pick<EqualizerPreset, "bands" | "preAmpDb" | "equalizerEnabled">,
  ) {
    const normalizedBands = this.normalizeBands(snapshot.bands, 1);
    const normalizedPreAmpDb = clamp(
      snapshot.preAmpDb,
      MIN_PREAMP_DB,
      MAX_PREAMP_DB,
    );

    this.persistedState.equalizerBands = normalizedBands;
    this.persistedState.preAmpDb = normalizedPreAmpDb;
    this.persistedState.equalizerEnabled = snapshot.equalizerEnabled;

    this.audioEngine.applyEqualizerPreset(
      normalizedBands,
      snapshot.equalizerEnabled,
      normalizedPreAmpDb,
    );
  }

  private isSamePresetShape(a: EqualizerPreset, b: EqualizerPreset) {
    if (a.equalizerEnabled !== b.equalizerEnabled) return false;
    if (Math.abs(a.preAmpDb - b.preAmpDb) > 0.001) return false;
    if (a.bands.length !== b.bands.length) return false;

    return a.bands.every((band, index) => {
      const nextBand = b.bands[index];
      if (!nextBand) return false;

      return (
        band.type === nextBand.type &&
        band.enabled === nextBand.enabled &&
        Math.abs(band.frequency - nextBand.frequency) < 0.001 &&
        Math.abs(band.gain - nextBand.gain) < 0.001 &&
        Math.abs(band.Q - nextBand.Q) < 0.001
      );
    });
  }

  private isFrequencyOverlapping(
    frequency: number,
    excludeBandId?: number,
  ): boolean {
    const MIN_FREQUENCY_RATIO = 1.5;

    for (const band of this.equalizerBands) {
      if (excludeBandId !== undefined && band.id === excludeBandId) continue;

      const ratio =
        frequency > band.frequency
          ? frequency / band.frequency
          : band.frequency / frequency;

      if (ratio < MIN_FREQUENCY_RATIO) {
        return true;
      }
    }
    return false;
  }

  findAvailableFrequency(): number | null {
    const MIN_FREQ = 20;
    const MAX_FREQ = 20000;
    const candidateFrequencies = [
      60, 150, 250, 400, 630, 1000, 1600, 2500, 4000, 6300, 10000, 16000,
    ];

    const sortedBands = [...this.equalizerBands].sort(
      (a, b) => a.frequency - b.frequency,
    );

    for (const freq of candidateFrequencies) {
      if (!this.isFrequencyOverlapping(freq)) {
        return freq;
      }
    }

    for (let i = 0; i < sortedBands.length - 1; i++) {
      const lowFreq = sortedBands[i].frequency;
      const highFreq = sortedBands[i + 1].frequency;
      const midFreq = Math.sqrt(lowFreq * highFreq);

      if (!this.isFrequencyOverlapping(midFreq)) {
        return Math.round(midFreq);
      }
    }

    if (sortedBands.length > 0) {
      const lowestFreq = sortedBands[0].frequency;
      const belowFreq = lowestFreq / 2;
      if (belowFreq >= MIN_FREQ && !this.isFrequencyOverlapping(belowFreq)) {
        return Math.round(belowFreq);
      }
    }

    if (sortedBands.length > 0) {
      const highestFreq = sortedBands[sortedBands.length - 1].frequency;
      const aboveFreq = highestFreq * 2;
      if (aboveFreq <= MAX_FREQ && !this.isFrequencyOverlapping(aboveFreq)) {
        return Math.round(aboveFreq);
      }
    }

    return null;
  }

  addEqualizerBand(options?: {
    frequency?: number;
    type?: FilterType;
    gain?: number;
    Q?: number;
    enabled?: boolean;
  }): EqualizerBand | null {
    if (this.equalizerBands.length >= this.maxBands) {
      return null;
    }

    const newBand = this.normalizeBand(
      {
        id: this.equalizerBands.length,
        type: options?.type ?? "peaking",
        frequency: options?.frequency ?? DEFAULT_NEW_BAND_FREQUENCY,
        gain: options?.gain ?? 0,
        Q: options?.Q ?? 1,
        enabled: options?.enabled ?? false,
      },
      this.equalizerBands.length,
    );

    const bands = [...this.equalizerBands, newBand].map((band, index) => ({
      ...band,
      id: index,
    }));

    this.persistedState.equalizerBands = bands;
    this.audioEngine.rebuildEqualizer(bands);
    this.syncActivePresetFromCurrentEq();

    return bands[bands.length - 1];
  }

  removeEqualizerBand(id: number): boolean {
    const MIN_BANDS = 1;

    if (this.equalizerBands.length <= MIN_BANDS) {
      return false;
    }

    const bandIndex = this.equalizerBands.findIndex((b) => b.id === id);
    if (bandIndex === -1) {
      return false;
    }

    const bands = this.equalizerBands.filter((b) => b.id !== id);
    bands.sort((a, b) => a.frequency - b.frequency);
    bands.forEach((band, index) => {
      band.id = index;
    });

    this.persistedState.equalizerBands = bands;
    this.audioEngine.rebuildEqualizer(bands);
    this.syncActivePresetFromCurrentEq();

    return true;
  }

  canUseFrequency(frequency: number, excludeBandId?: number): boolean {
    return !this.isFrequencyOverlapping(frequency, excludeBandId);
  }

  get maxBands(): number {
    return 10;
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

  async updateMetadata(track: AudioFile) {
    this.initializeMediaSessionHandlers();
    this.updateMediaSessionMetadata(track);

    if (!this.playerRef) return;

    const sourceTrack = await resolvePlaybackSource(
      track,
      tracksStore.getSourcesForTrack(track),
    );

    if (this.currentBlobUrl) {
      revokeAudioUrl(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }

    const audioUrl = await getAudioUrl(sourceTrack.id, {
      useCustomAuthFetch: authStore.shouldUseCustomMediaAuthFetch,
    });
    this.playerRef.src = audioUrl;
    this.playerRef.load();

    if (audioUrl.startsWith("blob:")) {
      this.currentBlobUrl = audioUrl;
    }

    this.loadTrackColor(track).catch((error) => {
      console.error("Failed to load track color:", error);
    });
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
        this.initializeMediaSessionHandlers();
        this.updateMediaSessionMetadata(newTrack);
        this.setMediaSessionPlaybackState("playing");
        await this.updateMetadata(newTrack);

        await historyStore.addToHistory(newTrack.id, this.currentPlaylist?.id);
      }

      this.isPlaying = true;
      this.setMediaSessionPlaybackState("playing");

      try {
        await this.playerRef.play();
      } catch (error) {
        console.error("Failed to play audio:", error);
        this.isPlaying = false;
        this.setMediaSessionPlaybackState("paused");
      }
    }
  }

  pause() {
    if (this.playerRef && this.isPlaying) {
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
      this.play({ index: startIndex });
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
      document.body.style.setProperty(
        "--ring",
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
    document.body.style.setProperty(
      "--ring",
      `oklch(${brighter.coords[0]} ${brighter.coords[1]} ${brighter.coords[2]})`,
    );
    const brighterString = brighter.toString({ format: "hex" });

    this.persistedState.trackColor = brighterString;

    await updateTrackColor(track.id, brighterString);
  }
}

export const playerStore = new PlayerState();

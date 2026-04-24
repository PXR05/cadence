import type { AudioEngine } from "./audioEngine";

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

export interface EqualizerStateSlice {
  equalizerBands: EqualizerBand[];
  equalizerEnabled: boolean;
  preAmpDb: number;
  pureBypassEnabled: boolean;
  equalizerPresets: EqualizerPreset[];
  activeEqualizerPresetId: string | null;
}

interface ParsedEqPresetText {
  preAmpDb: number;
  bands: EqualizerBand[];
  truncated: boolean;
}

export const FLAT_EQUALIZER_PRESET_ID = "flat";
export const FLAT_EQUALIZER_PRESET_NAME = "Flat";

export const MIN_PREAMP_DB = -30;
export const MAX_PREAMP_DB = 30;
export const MIN_BAND_FREQUENCY = 20;
export const MAX_BAND_FREQUENCY = 20000;
export const MIN_BAND_Q = 0.1;
export const MAX_BAND_Q = 10;
const DEFAULT_NEW_BAND_FREQUENCY = 1000;
export const MIN_BANDS = 1;
export const MAX_BANDS = 10;

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

export const FILTER_TYPES: FilterType[] = [
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

export function cloneEqualizerBands(bands: EqualizerBand[]): EqualizerBand[] {
  return bands.map((band) => ({ ...band }));
}

function createFlatPreset(): EqualizerPreset {
  return {
    id: FLAT_EQUALIZER_PRESET_ID,
    name: FLAT_EQUALIZER_PRESET_NAME,
    bands: cloneEqualizerBands(DEFAULT_EQUALIZER_BANDS),
    preAmpDb: 0,
    equalizerEnabled: true,
  };
}

export function createDefaultEqualizerState(): EqualizerStateSlice {
  const flatPreset = createFlatPreset();
  return {
    equalizerBands: cloneEqualizerBands(DEFAULT_EQUALIZER_BANDS),
    equalizerEnabled: true,
    preAmpDb: 0,
    pureBypassEnabled: false,
    equalizerPresets: [flatPreset],
    activeEqualizerPresetId: flatPreset.id,
  };
}

export class PlayerEqualizerDomain {
  constructor(
    private state: EqualizerStateSlice,
    private audioEngine: AudioEngine,
  ) {}

  get equalizerBands() {
    return this.state.equalizerBands;
  }

  get equalizerEnabled() {
    return this.state.equalizerEnabled;
  }

  get preAmpDb() {
    return this.state.preAmpDb ?? 0;
  }

  get pureBypassEnabled() {
    return this.state.pureBypassEnabled;
  }

  get equalizerPresets() {
    return this.state.equalizerPresets;
  }

  get activeEqualizerPresetId() {
    return this.state.activeEqualizerPresetId;
  }

  get maxBands(): number {
    return MAX_BANDS;
  }

  setEqualizerEnabled(value: boolean) {
    this.state.equalizerEnabled = value;
    this.syncActivePresetFromCurrentEq();
  }

  setPreAmpDb(value: number) {
    const clampedDb = clamp(value, MIN_PREAMP_DB, MAX_PREAMP_DB);
    this.state.preAmpDb = clampedDb;
    this.audioEngine.setPreAmpDb(clampedDb);
    this.syncActivePresetFromCurrentEq();
  }

  setPureBypassEnabled(value: boolean) {
    this.state.pureBypassEnabled = value;
  }

  updateEqualizerBand(id: number, updates: Partial<EqualizerBand>) {
    const bands = [...this.equalizerBands];
    const bandIndex = bands.findIndex((b) => b.id === id);

    if (bandIndex === -1) return;

    bands[bandIndex] = { ...bands[bandIndex], ...updates };

    this.state.equalizerBands = bands;

    this.audioEngine.updateEqualizerBand(id, updates, bands);
    this.syncActivePresetFromCurrentEq();
  }

  toggleEqualizer() {
    this.setEqualizerEnabled(!this.equalizerEnabled);
    this.audioEngine.toggleEqualizer(this.equalizerEnabled);
  }

  togglePureBypass() {
    this.setPureBypassEnabled(!this.pureBypassEnabled);
    this.audioEngine.togglePureBypass(this.pureBypassEnabled);
  }

  resetEqualizer() {
    const resetBands = this.equalizerBands.map((band) => ({
      ...band,
      gain: 0,
    }));

    this.state.equalizerBands = resetBands;

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

    this.state.equalizerPresets = [...this.equalizerPresets, preset];
    this.state.activeEqualizerPresetId = preset.id;

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

    this.state.equalizerPresets = presets;

    return presets[presetIndex];
  }

  renameEqualizerPreset(presetId: string, name: string) {
    const presetIndex = this.equalizerPresets.findIndex(
      (preset) => preset.id === presetId,
    );
    if (presetIndex === -1 || presetId === FLAT_EQUALIZER_PRESET_ID) {
      return null;
    }

    const presets = [...this.equalizerPresets];
    presets[presetIndex] = {
      ...presets[presetIndex],
      name: this.getUniquePresetName(name, presetId),
    };

    this.state.equalizerPresets = presets;

    return presets[presetIndex];
  }

  applyEqualizerPreset(presetId: string) {
    const preset = this.getEqualizerPresetById(presetId);
    if (!preset) return false;

    this.applyEqualizerSnapshot(preset);
    this.state.activeEqualizerPresetId = preset.id;

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

    this.state.equalizerPresets = remainingPresets;

    if (this.activeEqualizerPresetId === presetId) {
      const fallbackPreset =
        this.getEqualizerPresetById(FLAT_EQUALIZER_PRESET_ID) ??
        remainingPresets[0];

      if (fallbackPreset) {
        this.applyEqualizerSnapshot(fallbackPreset);
        this.state.activeEqualizerPresetId = fallbackPreset.id;
      } else {
        this.state.activeEqualizerPresetId = null;
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

    this.state.equalizerPresets = [...this.equalizerPresets, preset];
    this.applyEqualizerSnapshot(preset);
    this.state.activeEqualizerPresetId = preset.id;

    return {
      preset,
      truncated: parsed.truncated,
    };
  }

  migrateState() {
    this.state.equalizerBands = this.normalizeBands(
      this.state.equalizerBands,
      MIN_BANDS,
    );

    const basePresets = Array.isArray(this.state.equalizerPresets)
      ? this.state.equalizerPresets
      : [];

    let presets = this.dedupePresets(
      basePresets.map((preset, index) => this.normalizePreset(preset, index)),
    );

    if (!presets.some((preset) => preset.id === FLAT_EQUALIZER_PRESET_ID)) {
      presets = [createFlatPreset(), ...presets];
    }

    if (presets.length === 1 && presets[0].id === FLAT_EQUALIZER_PRESET_ID) {
      const currentPreset: EqualizerPreset = {
        id: this.createPresetId(),
        name: "Current",
        bands: cloneEqualizerBands(this.state.equalizerBands),
        preAmpDb: this.preAmpDb,
        equalizerEnabled: this.equalizerEnabled,
      };

      if (!this.isSamePresetShape(currentPreset, presets[0])) {
        presets.push(currentPreset);
      }
    }

    this.state.equalizerPresets = presets;

    const requestedActiveId = this.state.activeEqualizerPresetId;
    const resolvedActiveId =
      typeof requestedActiveId === "string" &&
      presets.some((preset) => preset.id === requestedActiveId)
        ? requestedActiveId
        : (presets[0]?.id ?? FLAT_EQUALIZER_PRESET_ID);

    this.state.activeEqualizerPresetId = resolvedActiveId;
  }

  findAvailableFrequency(): number | null {
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
      if (
        belowFreq >= MIN_BAND_FREQUENCY &&
        !this.isFrequencyOverlapping(belowFreq)
      ) {
        return Math.round(belowFreq);
      }
    }

    if (sortedBands.length > 0) {
      const highestFreq = sortedBands[sortedBands.length - 1].frequency;
      const aboveFreq = highestFreq * 2;
      if (
        aboveFreq <= MAX_BAND_FREQUENCY &&
        !this.isFrequencyOverlapping(aboveFreq)
      ) {
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

    this.state.equalizerBands = bands;
    this.audioEngine.rebuildEqualizer(bands);
    this.syncActivePresetFromCurrentEq();

    return bands[bands.length - 1];
  }

  removeEqualizerBand(id: number): boolean {
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

    this.state.equalizerBands = bands;
    this.audioEngine.rebuildEqualizer(bands);
    this.syncActivePresetFromCurrentEq();

    return true;
  }

  canUseFrequency(frequency: number, excludeBandId?: number): boolean {
    return !this.isFrequencyOverlapping(frequency, excludeBandId);
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

  private normalizePreset(
    preset: Partial<EqualizerPreset> | null | undefined,
    index: number,
  ): EqualizerPreset {
    if (preset?.id === FLAT_EQUALIZER_PRESET_ID) {
      return createFlatPreset();
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
      bands: this.normalizeBands(preset?.bands, MIN_BANDS),
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
        return createFlatPreset();
      }

      return {
        ...preset,
        id: nextId,
        name: nextName,
        bands: this.normalizeBands(preset.bands, MIN_BANDS),
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
    const activePresetId = this.state.activeEqualizerPresetId;
    if (!activePresetId) {
      return;
    }

    this.saveCurrentEqualizerPreset(activePresetId);
  }

  private applyEqualizerSnapshot(
    snapshot: Pick<EqualizerPreset, "bands" | "preAmpDb" | "equalizerEnabled">,
  ) {
    const normalizedBands = this.normalizeBands(snapshot.bands, MIN_BANDS);
    const normalizedPreAmpDb = clamp(
      snapshot.preAmpDb,
      MIN_PREAMP_DB,
      MAX_PREAMP_DB,
    );

    this.state.equalizerBands = normalizedBands;
    this.state.preAmpDb = normalizedPreAmpDb;
    this.state.equalizerEnabled = snapshot.equalizerEnabled;

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
}

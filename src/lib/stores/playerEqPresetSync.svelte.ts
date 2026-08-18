import * as v from "valibot";
import {
  getUserSetting,
  upsertUserSetting,
} from "$lib/backend/services/settings";
import { backendCapabilities } from "$lib/backend/config";
import { EqPresetsSettingPayloadSchema } from "$lib/schemas/settings";
import type { EqualizerPreset } from "./playerEqualizer.svelte";

const EQ_PRESET_SETTING_KEY = "audio.eq.presets";
const EQ_PRESET_SCHEMA_VERSION = 1;

type EqPresetSnapshot = {
  schemaVersion: number;
  presets: EqualizerPreset[];
};

type SyncState = "idle" | "syncing" | "synced" | "error";

interface PlayerEqPresetSyncOptions {
  getSnapshot: () => EqPresetSnapshot;
  applySnapshot: (snapshot: EqPresetSnapshot) => void;
  isAuthenticated: () => boolean;
}

function cloneSnapshot(snapshot: EqPresetSnapshot): EqPresetSnapshot {
  return {
    schemaVersion: snapshot.schemaVersion,
    presets: snapshot.presets.map((preset) => ({
      ...preset,
      bands: preset.bands.map((band) => ({ ...band })),
    })),
  };
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function mergeSnapshots(
  localSnapshot: EqPresetSnapshot,
  remoteSnapshot: EqPresetSnapshot,
): EqPresetSnapshot {
  const mergedPresets = localSnapshot.presets.map((preset) => ({
    ...preset,
    bands: preset.bands.map((band) => ({ ...band })),
  }));

  const localIndexById = new Map(
    mergedPresets.map((preset, index) => [preset.id, index]),
  );
  const localNames = new Set(
    mergedPresets.map((preset) => normalizeName(preset.name)),
  );

  for (const remotePreset of remoteSnapshot.presets) {
    const remotePresetClone = {
      ...remotePreset,
      bands: remotePreset.bands.map((band) => ({ ...band })),
    };

    const localIndex = localIndexById.get(remotePreset.id);
    if (localIndex !== undefined) {
      const existingLocalPreset = mergedPresets[localIndex];
      if (
        JSON.stringify(existingLocalPreset) !==
        JSON.stringify(remotePresetClone)
      ) {
        localNames.delete(normalizeName(existingLocalPreset.name));
        mergedPresets[localIndex] = remotePresetClone;
        localNames.add(normalizeName(remotePresetClone.name));
      }

      continue;
    }

    if (localNames.has(normalizeName(remotePreset.name))) {
      continue;
    }

    localIndexById.set(remotePreset.id, mergedPresets.length);
    localNames.add(normalizeName(remotePreset.name));
    mergedPresets.push(remotePresetClone);
  }

  return {
    schemaVersion: EQ_PRESET_SCHEMA_VERSION,
    presets: mergedPresets,
  };
}

export class PlayerEqPresetSync {
  private syncTimeout: ReturnType<typeof setTimeout> | null = null;
  private hasHydrated = false;
  private isHydrating = false;
  private isApplyingRemoteMerge = false;
  private lastKnownRemoteUpdatedAt: number | null = null;

  private syncState: SyncState = $state("idle");
  private syncError: string | null = $state(null);

  constructor(private options: PlayerEqPresetSyncOptions) {}

  get status(): SyncState {
    return this.syncState;
  }

  get errorMessage(): string | null {
    return this.syncError;
  }

  resetHydration() {
    this.hasHydrated = false;
  }

  async hydrateFromBackend() {
    if (!backendCapabilities.settingsSync || !this.options.isAuthenticated()) {
      return;
    }

    if (this.hasHydrated || this.isHydrating) {
      return;
    }

    this.isHydrating = true;

    try {
      const localSnapshot = cloneSnapshot(this.options.getSnapshot());
      const setting = await getUserSetting(EQ_PRESET_SETTING_KEY);

      if (!setting) {
        this.lastKnownRemoteUpdatedAt = null;
        this.hasHydrated = true;
        this.scheduleSync(0);
        return;
      }

      this.lastKnownRemoteUpdatedAt = setting.updatedAt.getTime();

      const parsedJson = JSON.parse(setting.value);
      const remoteSnapshot = v.parse(EqPresetsSettingPayloadSchema, parsedJson);

      const mergedSnapshot = mergeSnapshots(localSnapshot, {
        schemaVersion: remoteSnapshot.schemaVersion,
        presets: remoteSnapshot.presets,
      });

      this.options.applySnapshot(mergedSnapshot);
      this.hasHydrated = true;
      this.scheduleSync(0);
    } catch (error) {
      this.syncState = "error";
      this.syncError =
        error instanceof Error ? error.message : "Failed to hydrate EQ presets";
      this.hasHydrated = true;
    } finally {
      this.isHydrating = false;
    }
  }

  notifyLocalChange() {
    if (
      !backendCapabilities.settingsSync ||
      !this.options.isAuthenticated() ||
      this.isHydrating ||
      this.isApplyingRemoteMerge
    ) {
      return;
    }

    this.scheduleSync(400);
  }

  private scheduleSync(delayMs: number) {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }

    this.syncTimeout = setTimeout(() => {
      this.syncTimeout = null;
      void this.syncToBackend();
    }, delayMs);
  }

  private async syncToBackend() {
    if (!backendCapabilities.settingsSync || !this.options.isAuthenticated()) {
      return;
    }

    try {
      this.syncState = "syncing";
      this.syncError = null;

      const localSnapshot = cloneSnapshot(this.options.getSnapshot());
      let snapshotToUpload = localSnapshot;

      const latestSetting = await getUserSetting(EQ_PRESET_SETTING_KEY);
      const latestRemoteUpdatedAt = latestSetting?.updatedAt.getTime() ?? null;

      if (
        latestSetting &&
        latestRemoteUpdatedAt !== null &&
        (this.lastKnownRemoteUpdatedAt === null ||
          latestRemoteUpdatedAt > this.lastKnownRemoteUpdatedAt)
      ) {
        const parsedLatestRemote = JSON.parse(latestSetting.value);
        const latestRemoteSnapshot = v.parse(
          EqPresetsSettingPayloadSchema,
          parsedLatestRemote,
        );

        snapshotToUpload = mergeSnapshots(localSnapshot, {
          schemaVersion: latestRemoteSnapshot.schemaVersion,
          presets: latestRemoteSnapshot.presets,
        });

        if (
          JSON.stringify(snapshotToUpload) !== JSON.stringify(localSnapshot)
        ) {
          this.isApplyingRemoteMerge = true;

          try {
            this.options.applySnapshot(snapshotToUpload);
          } finally {
            this.isApplyingRemoteMerge = false;
          }
        }
      }

      const payload = {
        schemaVersion: EQ_PRESET_SCHEMA_VERSION,
        presets: snapshotToUpload.presets,
      };

      const validated = v.parse(EqPresetsSettingPayloadSchema, payload);
      const upserted = await upsertUserSetting(
        EQ_PRESET_SETTING_KEY,
        JSON.stringify(validated),
      );

      this.lastKnownRemoteUpdatedAt = upserted.updatedAt.getTime();

      this.syncState = "synced";
    } catch (error) {
      this.syncState = "error";
      this.syncError =
        error instanceof Error ? error.message : "Failed to sync EQ presets";
    }
  }
}

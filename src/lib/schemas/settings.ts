import * as v from "valibot";
import {
  FILTER_TYPES,
  MAX_BANDS,
  MAX_BAND_FREQUENCY,
  MAX_BAND_Q,
  MAX_PREAMP_DB,
  MIN_BANDS,
  MIN_BAND_FREQUENCY,
  MIN_BAND_Q,
  MIN_PREAMP_DB,
} from "$lib/stores/playerEqualizer.svelte";

export const UserSettingItemSchema = v.object({
  id: v.string(),
  userId: v.string(),
  key: v.string(),
  value: v.string(),
  updatedAt: v.pipe(
    v.string(),
    v.transform((s) => new Date(s)),
  ),
});

export const UserSettingResponseSchema = v.object({
  data: UserSettingItemSchema,
});

export const UserSettingsListResponseSchema = v.object({
  data: v.array(UserSettingItemSchema),
});

export const UserSettingMessageResponseSchema = v.object({
  message: v.string(),
});

export const EqFilterTypeSchema = v.picklist(FILTER_TYPES);

export const EqBandSettingSchema = v.object({
  id: v.pipe(v.number(), v.integer(), v.minValue(0)),
  type: EqFilterTypeSchema,
  frequency: v.pipe(
    v.number(),
    v.minValue(MIN_BAND_FREQUENCY),
    v.maxValue(MAX_BAND_FREQUENCY),
  ),
  gain: v.pipe(
    v.number(),
    v.minValue(MIN_PREAMP_DB),
    v.maxValue(MAX_PREAMP_DB),
  ),
  Q: v.pipe(v.number(), v.minValue(MIN_BAND_Q), v.maxValue(MAX_BAND_Q)),
  enabled: v.boolean(),
  prevGain: v.optional(
    v.pipe(v.number(), v.minValue(MIN_PREAMP_DB), v.maxValue(MAX_PREAMP_DB)),
  ),
});

export const EqPresetSettingSchema = v.object({
  id: v.string(),
  name: v.string(),
  bands: v.pipe(
    v.array(EqBandSettingSchema),
    v.minLength(MIN_BANDS),
    v.maxLength(MAX_BANDS),
  ),
  preAmpDb: v.pipe(
    v.number(),
    v.minValue(MIN_PREAMP_DB),
    v.maxValue(MAX_PREAMP_DB),
  ),
  equalizerEnabled: v.boolean(),
});

export const EqPresetsSettingPayloadSchema = v.object({
  schemaVersion: v.number(),
  presets: v.array(EqPresetSettingSchema),
});

export type UserSettingItem = v.InferOutput<typeof UserSettingItemSchema>;
export type UserSettingResponse = v.InferOutput<
  typeof UserSettingResponseSchema
>;
export type UserSettingsListResponse = v.InferOutput<
  typeof UserSettingsListResponseSchema
>;
export type UserSettingMessageResponse = v.InferOutput<
  typeof UserSettingMessageResponseSchema
>;
export type EqBandSetting = v.InferOutput<typeof EqBandSettingSchema>;
export type EqPresetSetting = v.InferOutput<typeof EqPresetSettingSchema>;
export type EqPresetsSettingPayload = v.InferOutput<
  typeof EqPresetsSettingPayloadSchema
>;

import * as v from "valibot";

export const AudioMetadataSchema = v.object({
  title: v.optional(v.string()),
  artist: v.optional(v.string()),
  album: v.optional(v.string()),
  year: v.optional(v.number()),
  genre: v.optional(v.array(v.string())),
  duration: v.optional(v.number()),
  bitrate: v.optional(v.number()),
  sampleRate: v.optional(v.number()),
  channels: v.optional(v.number()),
  format: v.optional(v.string()),
});

export const AudioFileSchema = v.object({
  id: v.string(),
  filename: v.string(),
  size: v.number(),
  uploadedAt: v.pipe(
    v.string(),
    v.transform((s) => new Date(s)),
  ),
  metadata: v.optional(AudioMetadataSchema),
  imageFile: v.optional(v.string()),
  color: v.optional(v.string()),
  youtubeId: v.optional(v.string()),
  tidalId: v.optional(v.string()),
});

export type AudioMetadata = v.InferOutput<typeof AudioMetadataSchema>;
export type AudioFile = v.InferOutput<typeof AudioFileSchema>;

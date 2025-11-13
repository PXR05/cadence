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
    v.transform((s) => new Date(s))
  ),
  metadata: v.optional(AudioMetadataSchema),
  imageFile: v.optional(v.string()),
  color: v.optional(v.string()),
  youtubeId: v.optional(v.string()),
});

export const AudioListResponseSchema = v.object({
  files: v.array(AudioFileSchema),
  count: v.number(),
  page: v.number(),
  limit: v.number(),
  totalPages: v.number(),
  hasNext: v.boolean(),
  hasPrev: v.boolean(),
});

export const SearchSuggestionSchema = v.object({
  type: v.picklist(["title", "artist", "album"]),
  value: v.string(),
  score: v.number(),
});

export const SearchSuggestionsResponseSchema = v.object({
  suggestions: v.array(SearchSuggestionSchema),
});

export const UploadResponseSchema = v.object({
  success: v.boolean(),
  id: v.string(),
  filename: v.string(),
  imageFile: v.optional(v.string()),
  message: v.string(),
});

export const MultiUploadResponseSchema = v.object({
  success: v.boolean(),
  results: v.array(
    v.union([
      UploadResponseSchema,
      v.object({
        success: v.literal(false),
        filename: v.string(),
        error: v.string(),
      }),
    ])
  ),
  totalFiles: v.number(),
  successfulUploads: v.number(),
  failedUploads: v.number(),
  message: v.string(),
});

export const DeleteTrackResponseSchema = v.object({
  success: v.boolean(),
  message: v.string(),
});

export const YoutubeDownloadResponseSchema = v.object({
  success: v.boolean(),
  id: v.string(),
  filename: v.string(),
  title: v.string(),
  imageFile: v.optional(v.string()),
  message: v.string(),
});

export const FetchTracksOptionsSchema = v.object({
  page: v.optional(v.number()),
  limit: v.optional(v.number()),
  sortBy: v.optional(v.picklist(["filename", "size", "uploadedAt", "title"])),
  sortOrder: v.optional(v.picklist(["asc", "desc"])),
});

export const SearchTracksOptionsSchema = v.object({
  q: v.string(),
  page: v.optional(v.number()),
  limit: v.optional(v.number()),
});

export const SearchSuggestionsOptionsSchema = v.object({
  q: v.string(),
  limit: v.optional(v.number()),
});

export const FetchRandomTracksOptionsSchema = v.object({
  page: v.optional(v.number()),
  limit: v.optional(v.number()),
  seed: v.optional(v.string()),
  firstTrackId: v.optional(v.string()),
});

export type AudioMetadata = v.InferOutput<typeof AudioMetadataSchema>;
export type AudioFile = v.InferOutput<typeof AudioFileSchema>;
export type AudioListResponse = v.InferOutput<typeof AudioListResponseSchema>;
export type SearchSuggestion = v.InferOutput<typeof SearchSuggestionSchema>;
export type UploadResponse = v.InferOutput<typeof UploadResponseSchema>;
export type MultiUploadResponse = v.InferOutput<
  typeof MultiUploadResponseSchema
>;
export type DeleteTrackResponse = v.InferOutput<
  typeof DeleteTrackResponseSchema
>;
export type YoutubeDownloadResponse = v.InferOutput<
  typeof YoutubeDownloadResponseSchema
>;
export type FetchTracksOptions = v.InferOutput<typeof FetchTracksOptionsSchema>;
export type SearchTracksOptions = v.InferOutput<
  typeof SearchTracksOptionsSchema
>;
export type SearchSuggestionsOptions = v.InferOutput<
  typeof SearchSuggestionsOptionsSchema
>;
export type FetchRandomTracksOptions = v.InferOutput<
  typeof FetchRandomTracksOptionsSchema
>;

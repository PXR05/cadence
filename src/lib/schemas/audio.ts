import * as v from "valibot";
import { AudioFileSchema } from "./base";

export {
  AudioMetadataSchema,
  AudioFileSchema,
  type AudioMetadata,
  type AudioFile,
} from "./base";

export const AudioListResponseSchema = v.object({
  files: v.array(AudioFileSchema),
  deletedIds: v.array(v.string()),
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
    ]),
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

export const RemoteDownloadResponseSchema = v.object({
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
  total: v.optional(v.number()),
  sortBy: v.optional(v.picklist(["filename", "size", "uploadedAt", "title"])),
  sortOrder: v.optional(v.picklist(["asc", "desc"])),
  lastFetchedAt: v.optional(v.number()),
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

export const FetchRadioOptionsSchema = v.object({
  seed: v.string(),
  limit: v.optional(v.number()),
  lambda: v.optional(v.number()),
  temperature: v.optional(v.number()),
  seedNonce: v.optional(v.string()),
  artistCooldown: v.optional(v.number()),
  albumCooldown: v.optional(v.number()),
});

export const RadioResponseSchema = v.object({
  files: v.array(AudioFileSchema),
  seedId: v.string(),
  model: v.string(),
  dim: v.number(),
  coverage: v.number(),
  indexedCount: v.number(),
  totalCount: v.number(),
});

export const RadioStatusResponseSchema = v.object({
  model: v.string(),
  dim: v.number(),
  sampleRate: v.number(),
  indexedCount: v.number(),
  totalCount: v.number(),
  coverage: v.number(),
});

export type AudioListResponse = v.InferOutput<typeof AudioListResponseSchema>;
export type SearchSuggestion = v.InferOutput<typeof SearchSuggestionSchema>;
export type UploadResponse = v.InferOutput<typeof UploadResponseSchema>;
export type MultiUploadResponse = v.InferOutput<
  typeof MultiUploadResponseSchema
>;
export type DeleteTrackResponse = v.InferOutput<
  typeof DeleteTrackResponseSchema
>;
export type RemoteDownloadResponse = v.InferOutput<
  typeof RemoteDownloadResponseSchema
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
export type FetchRadioOptions = v.InferOutput<typeof FetchRadioOptionsSchema>;
export type RadioResponse = v.InferOutput<typeof RadioResponseSchema>;
export type RadioStatusResponse = v.InferOutput<
  typeof RadioStatusResponseSchema
>;


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

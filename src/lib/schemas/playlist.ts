import * as v from "valibot";
import { AudioFileSchema } from "./audio";

export const PlaylistItemSchema = v.object({
  id: v.string(),
  position: v.number(),
  addedAt: v.pipe(
    v.string(),
    v.transform((s) => new Date(s))
  ),
  audio: AudioFileSchema,
});

export const PlaylistSchema = v.object({
  id: v.string(),
  name: v.string(),
  userId: v.string(),
  coverImage: v.optional(v.string()),
  createdAt: v.pipe(
    v.string(),
    v.transform((s) => new Date(s))
  ),
  updatedAt: v.pipe(
    v.string(),
    v.transform((s) => new Date(s))
  ),
  itemCount: v.optional(v.number()),
});

export const CreatePlaylistResponseSchema = v.object({
  success: v.boolean(),
  playlist: PlaylistSchema,
  message: v.string(),
});

export const UpdatePlaylistResponseSchema = v.object({
  success: v.boolean(),
  playlist: PlaylistSchema,
  message: v.string(),
});

export const DeletePlaylistResponseSchema = v.object({
  success: v.boolean(),
  message: v.string(),
});

export const GetPlaylistResponseSchema = v.object({
  playlist: v.object({
    id: v.string(),
    name: v.string(),
    userId: v.string(),
    coverImage: v.optional(v.string()),
    createdAt: v.pipe(
      v.string(),
      v.transform((s) => new Date(s))
    ),
    updatedAt: v.pipe(
      v.string(),
      v.transform((s) => new Date(s))
    ),
    itemCount: v.optional(v.number()),
    items: v.array(PlaylistItemSchema),
  }),
});

export const AddItemToPlaylistResponseSchema = v.object({
  success: v.boolean(),
  item: PlaylistItemSchema,
  message: v.string(),
});

export const RemoveItemFromPlaylistResponseSchema = v.object({
  success: v.boolean(),
  message: v.string(),
});

export const GetUserPlaylistsResponseSchema = v.object({
  playlists: v.array(PlaylistSchema),
});

export const GetUserPlaylistsOptionsSchema = v.object({
  type: v.optional(v.picklist(["user", "artist", "album", "auto", "youtube"])),
  limit: v.optional(v.number()),
});

export const CreatePlaylistSchema = v.object({
  name: v.string(),
  coverImage: v.optional(v.any()),
});

export const UpdatePlaylistSchema = v.object({
  id: v.string(),
  name: v.optional(v.string()),
  coverImage: v.optional(v.any()),
});

export const AddItemToPlaylistSchema = v.object({
  playlistId: v.string(),
  audioId: v.string(),
});

export const RemoveItemFromPlaylistSchema = v.object({
  playlistId: v.string(),
  itemId: v.string(),
});

export const ReorderPlaylistItemSchema = v.object({
  playlistId: v.string(),
  itemId: v.string(),
  position: v.number(),
});

export type PlaylistItem = v.InferOutput<typeof PlaylistItemSchema>;
export type Playlist = v.InferOutput<typeof PlaylistSchema>;
export type PlaylistDetail = v.InferOutput<
  typeof GetPlaylistResponseSchema
>["playlist"];
export type CreatePlaylistResponse = v.InferOutput<
  typeof CreatePlaylistResponseSchema
>;
export type UpdatePlaylistResponse = v.InferOutput<
  typeof UpdatePlaylistResponseSchema
>;
export type DeletePlaylistResponse = v.InferOutput<
  typeof DeletePlaylistResponseSchema
>;
export type GetPlaylistResponse = v.InferOutput<
  typeof GetPlaylistResponseSchema
>;
export type AddItemToPlaylistResponse = v.InferOutput<
  typeof AddItemToPlaylistResponseSchema
>;
export type RemoveItemFromPlaylistResponse = v.InferOutput<
  typeof RemoveItemFromPlaylistResponseSchema
>;
export type GetUserPlaylistsOptions = v.InferOutput<
  typeof GetUserPlaylistsOptionsSchema
>;
export type CreatePlaylistInput = v.InferOutput<typeof CreatePlaylistSchema>;
export type UpdatePlaylistInput = v.InferOutput<typeof UpdatePlaylistSchema>;
export type AddItemToPlaylistInput = v.InferOutput<
  typeof AddItemToPlaylistSchema
>;
export type RemoveItemFromPlaylistInput = v.InferOutput<
  typeof RemoveItemFromPlaylistSchema
>;
export type ReorderPlaylistItemInput = v.InferOutput<
  typeof ReorderPlaylistItemSchema
>;

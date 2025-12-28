import * as v from "valibot";
import {
  CreatePlaylistResponseSchema,
  UpdatePlaylistResponseSchema,
  DeletePlaylistResponseSchema,
  GetPlaylistResponseSchema,
  AddItemToPlaylistResponseSchema,
  RemoveItemFromPlaylistResponseSchema,
  GetUserPlaylistsResponseSchema,
} from "$lib/schemas/playlist";
import { authFetch } from "./fetch";

export interface GetUserPlaylistsOptions {
  type?: "user" | "artist" | "album" | "auto" | "youtube";
  limit?: number;
}

export interface CreatePlaylistInput {
  name: string;
  coverImage?: File;
}

export interface UpdatePlaylistInput {
  id: string;
  name?: string;
  coverImage?: File;
}

export interface AddItemToPlaylistInput {
  playlistId: string;
  audioId: string;
}

export interface RemoveItemFromPlaylistInput {
  playlistId: string;
  itemId: string;
}

export interface ReorderPlaylistItemInput {
  playlistId: string;
  itemId: string;
  position: number;
}

export async function getUserPlaylists(options: GetUserPlaylistsOptions = {}) {
  const { type, limit } = options;

  const params = new URLSearchParams();
  if (type) params.append("type", type);
  if (limit) params.append("limit", limit.toString());

  const queryString = params.toString();
  const path = `/playlist${queryString ? `?${queryString}` : ""}`;

  const response = await authFetch(path);

  if (!response.ok) {
    throw new Error(`Failed to get playlists: ${response.statusText}`);
  }

  const data = await response.json();
  const validated = v.parse(GetUserPlaylistsResponseSchema, data);
  return validated.playlists;
}

export async function getPlaylistById(id: string) {
  const response = await authFetch(`/playlist/${id}`);

  if (!response.ok) {
    throw new Error(`Failed to get playlist: ${response.statusText}`);
  }

  const data = await response.json();
  return v.parse(GetPlaylistResponseSchema, data);
}

export async function createPlaylist(input: CreatePlaylistInput) {
  const formData = new FormData();
  formData.append("name", input.name);
  if (input.coverImage) {
    formData.append("coverImage", input.coverImage);
  }

  const response = await authFetch("/playlist", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Failed to create playlist: ${response.statusText}`);
  }

  const data = await response.json();
  return v.parse(CreatePlaylistResponseSchema, data);
}

export async function updatePlaylist(input: UpdatePlaylistInput) {
  const formData = new FormData();
  if (input.name) formData.append("name", input.name);
  if (input.coverImage) formData.append("coverImage", input.coverImage);

  const response = await authFetch(`/playlist/${input.id}`, {
    method: "PATCH",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Failed to update playlist: ${response.statusText}`);
  }

  const data = await response.json();
  return v.parse(UpdatePlaylistResponseSchema, data);
}

export async function deletePlaylist(id: string) {
  const response = await authFetch(`/playlist/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    if (response.status === 404) {
      return;
    }
    throw new Error(`Failed to delete playlist: ${response.statusText}`);
  }

  const data = await response.json();
  return v.parse(DeletePlaylistResponseSchema, data);
}

export async function addItemToPlaylist(input: AddItemToPlaylistInput) {
  const response = await authFetch(`/playlist/${input.playlistId}/items`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ audioId: input.audioId }),
  });

  if (!response.ok) {
    throw new Error(`Failed to add item to playlist: ${response.statusText}`);
  }

  const data = await response.json();
  return v.parse(AddItemToPlaylistResponseSchema, data);
}

export async function removeItemFromPlaylist(
  input: RemoveItemFromPlaylistInput
) {
  const response = await authFetch(
    `/playlist/${input.playlistId}/items/${input.itemId}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      return;
    }
    throw new Error(
      `Failed to remove item from playlist: ${response.statusText}`
    );
  }

  const data = await response.json();
  return v.parse(RemoveItemFromPlaylistResponseSchema, data);
}

export async function reorderPlaylistItem(input: ReorderPlaylistItemInput) {
  const response = await authFetch(
    `/playlist/${input.playlistId}/items/${input.itemId}/position`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ position: input.position }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to reorder playlist item: ${response.statusText}`);
  }

  const data = await response.json();
  return v.parse(RemoveItemFromPlaylistResponseSchema, data);
}

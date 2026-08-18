import * as v from "valibot";
import {
  AddItemToPlaylistResponseSchema,
  CreatePlaylistResponseSchema,
  DeletePlaylistResponseSchema,
  GetPlaylistResponseSchema,
  GetUserPlaylistsResponseSchema,
  RemoveItemFromPlaylistResponseSchema,
  UpdatePlaylistResponseSchema,
  type AddItemToPlaylistInput,
  type CreatePlaylistInput,
  type GetPlaylistQuery,
  type GetPlaylistResponse,
  type GetUserPlaylistsOptions,
  type GetUserPlaylistsResponse,
  type RemoveItemFromPlaylistInput,
  type ReorderPlaylistItemInput,
  type UpdatePlaylistInput,
} from "$lib/schemas/playlist";
import { backendRequest } from "../client";
import { backendConfig } from "../config";
import { requireBackendCapability } from "../capabilities";

export async function getUserPlaylists(
  options: GetUserPlaylistsOptions = {},
): Promise<GetUserPlaylistsResponse> {
  requireBackendCapability("playlists");
  if (
    (options.type === "youtube" || options.type === "tidal") &&
    !backendConfig.capabilities.remoteProviders[options.type].import
  ) {
    return { playlists: [], deletedIds: [] };
  }
  const params = new URLSearchParams();
  if (options.type) params.set("type", options.type);
  if (options.limit) params.set("limit", String(options.limit));
  if (options.lastFetchedAt !== undefined) {
    params.set("lastFetchedAt", String(options.lastFetchedAt));
  }
  const query = params.toString();
  const response = await backendRequest(
    `${backendConfig.routes.playlists.root}${query ? `?${query}` : ""}`,
  );
  if (!response.ok) {
    throw new Error(`Failed to get playlists: ${response.statusText}`);
  }
  const text = await response.text();
  try {
    return v.parse(GetUserPlaylistsResponseSchema, JSON.parse(text));
  } catch (error) {
    throw new Error(
      `Failed to parse playlists response${error instanceof Error ? `: ${error.message}` : ""}: ${text}`,
    );
  }
}

export async function getPlaylistById(
  id: string,
  query: GetPlaylistQuery = {},
): Promise<GetPlaylistResponse> {
  requireBackendCapability("playlists");
  const params = new URLSearchParams();
  if (query.lastFetchedAt !== undefined) {
    params.set("lastFetchedAt", String(query.lastFetchedAt));
  }
  const suffix = params.size ? `?${params}` : "";
  const response = await backendRequest(
    `${backendConfig.routes.playlists.item(id)}${suffix}`,
  );
  if (!response.ok) {
    throw new Error(`Failed to get playlist: ${response.statusText}`);
  }
  return v.parse(GetPlaylistResponseSchema, await response.json());
}

export async function createPlaylist(input: CreatePlaylistInput) {
  requireBackendCapability("playlists.create");
  const formData = new FormData();
  formData.append("name", input.name);
  if (input.coverImage) formData.append("coverImage", input.coverImage);
  const response = await backendRequest(backendConfig.routes.playlists.root, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    throw new Error(`Failed to create playlist: ${response.statusText}`);
  }
  return v.parse(CreatePlaylistResponseSchema, await response.json());
}

export async function updatePlaylist(input: UpdatePlaylistInput) {
  requireBackendCapability("playlists.edit");
  const formData = new FormData();
  if (input.name) formData.append("name", input.name);
  if (input.coverImage) formData.append("coverImage", input.coverImage);
  const response = await backendRequest(
    backendConfig.routes.playlists.item(input.id),
    { method: "PATCH", body: formData },
  );
  if (!response.ok) {
    throw new Error(`Failed to update playlist: ${response.statusText}`);
  }
  return v.parse(UpdatePlaylistResponseSchema, await response.json());
}

export async function deletePlaylist(id: string) {
  requireBackendCapability("playlists.delete");
  const response = await backendRequest(backendConfig.routes.playlists.item(id), {
    method: "DELETE",
  });
  if (response.status === 404) return;
  if (!response.ok) {
    throw new Error(`Failed to delete playlist: ${response.statusText}`);
  }
  return v.parse(DeletePlaylistResponseSchema, await response.json());
}

export async function addItemToPlaylist(input: AddItemToPlaylistInput) {
  requireBackendCapability("playlists.manageItems");
  const response = await backendRequest(
    backendConfig.routes.playlists.items(input.playlistId),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioId: input.audioId }),
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to add item to playlist: ${response.statusText}`);
  }
  return v.parse(AddItemToPlaylistResponseSchema, await response.json());
}

export async function removeItemFromPlaylist(
  input: RemoveItemFromPlaylistInput,
) {
  requireBackendCapability("playlists.manageItems");
  const response = await backendRequest(
    backendConfig.routes.playlists.playlistItem(
      input.playlistId,
      input.itemId,
    ),
    { method: "DELETE" },
  );
  if (response.status === 404) return;
  if (!response.ok) {
    throw new Error(`Failed to remove item from playlist: ${response.statusText}`);
  }
  return v.parse(RemoveItemFromPlaylistResponseSchema, await response.json());
}

export async function reorderPlaylistItem(input: ReorderPlaylistItemInput) {
  requireBackendCapability("playlists.reorder");
  const response = await backendRequest(
    backendConfig.routes.playlists.itemPosition(
      input.playlistId,
      input.itemId,
    ),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ position: input.position }),
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to reorder playlist item: ${response.statusText}`);
  }
  return v.parse(RemoveItemFromPlaylistResponseSchema, await response.json());
}

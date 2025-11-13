import "dotenv/config";
import { query, command, getRequestEvent } from "$app/server";
import * as v from "valibot";
import { error } from "@sveltejs/kit";
import {
  CreatePlaylistResponseSchema,
  UpdatePlaylistResponseSchema,
  DeletePlaylistResponseSchema,
  GetPlaylistResponseSchema,
  AddItemToPlaylistResponseSchema,
  RemoveItemFromPlaylistResponseSchema,
  GetUserPlaylistsResponseSchema,
  GetUserPlaylistsOptionsSchema,
  CreatePlaylistSchema,
  UpdatePlaylistSchema,
  AddItemToPlaylistSchema,
  RemoveItemFromPlaylistSchema,
  ReorderPlaylistItemSchema,
} from "$lib/schemas/playlist";

if (!process.env.API_URL) throw new Error("API_URL is not set.");

const BACKEND_URL = process.env.API_URL ?? "";

function getAuthToken(): string {
  const { cookies } = getRequestEvent();
  const authHash = cookies.get("cadence.token");
  if (!authHash) {
    throw error(401, "Unauthorized: No authentication provided");
  }
  return authHash;
}

export const getUserPlaylists = query(
  GetUserPlaylistsOptionsSchema,
  async (options) => {
    const authHash = getAuthToken();
    const { type, limit } = options;

    const params = new URLSearchParams();
    if (type) params.append("type", type);
    if (limit) params.append("limit", limit.toString());

    const queryString = params.toString();
    const url = `${BACKEND_URL}/playlist${
      queryString ? `?${queryString}` : ""
    }`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${authHash}`,
      },
    });

    if (!response.ok) {
      throw error(response.status, `Backend error: ${response.statusText}`);
    }

    const data = await response.json();
    const validated = v.parse(GetUserPlaylistsResponseSchema, data);
    return validated.playlists;
  }
);

export const getPlaylistById = query(v.string(), async (id) => {
  const authHash = getAuthToken();

  const response = await fetch(`${BACKEND_URL}/playlist/${id}`, {
    headers: {
      Authorization: `Bearer ${authHash}`,
    },
  });

  if (!response.ok) {
    throw error(response.status, `Backend error: ${response.statusText}`);
  }

  const data = await response.json();
  return v.parse(GetPlaylistResponseSchema, data);
});

export const createPlaylist = command(CreatePlaylistSchema, async (input) => {
  const authHash = getAuthToken();

  const formData = new FormData();
  formData.append("name", input.name);
  if (input.coverImage) {
    formData.append("coverImage", input.coverImage);
  }

  const response = await fetch(`${BACKEND_URL}/playlist`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authHash}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw error(response.status, `Backend error: ${response.statusText}`);
  }

  const data = await response.json();
  return v.parse(CreatePlaylistResponseSchema, data);
});

export const updatePlaylist = command(UpdatePlaylistSchema, async (input) => {
  const authHash = getAuthToken();

  const formData = new FormData();
  if (input.name) formData.append("name", input.name);
  if (input.coverImage) formData.append("coverImage", input.coverImage);

  const response = await fetch(`${BACKEND_URL}/playlist/${input.id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${authHash}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw error(response.status, `Backend error: ${response.statusText}`);
  }

  const data = await response.json();
  return v.parse(UpdatePlaylistResponseSchema, data);
});

export const deletePlaylist = command(v.string(), async (id) => {
  const authHash = getAuthToken();

  const response = await fetch(`${BACKEND_URL}/playlist/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${authHash}`,
    },
  });

  if (!response.ok) {
    throw error(response.status, `Backend error: ${response.statusText}`);
  }

  const data = await response.json();
  return v.parse(DeletePlaylistResponseSchema, data);
});

export const addItemToPlaylist = command(
  AddItemToPlaylistSchema,
  async (input) => {
    const authHash = getAuthToken();

    const response = await fetch(
      `${BACKEND_URL}/playlist/${input.playlistId}/items`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authHash}`,
        },
        body: JSON.stringify({ audioId: input.audioId }),
      }
    );

    if (!response.ok) {
      throw error(response.status, `Backend error: ${response.statusText}`);
    }

    const data = await response.json();
    return v.parse(AddItemToPlaylistResponseSchema, data);
  }
);

export const removeItemFromPlaylist = command(
  RemoveItemFromPlaylistSchema,
  async (input) => {
    const authHash = getAuthToken();

    const response = await fetch(
      `${BACKEND_URL}/playlist/${input.playlistId}/items/${input.itemId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authHash}`,
        },
      }
    );

    if (!response.ok) {
      throw error(response.status, `Backend error: ${response.statusText}`);
    }

    const data = await response.json();
    return v.parse(RemoveItemFromPlaylistResponseSchema, data);
  }
);

export const reorderPlaylistItem = command(
  ReorderPlaylistItemSchema,
  async (input) => {
    const authHash = getAuthToken();

    const response = await fetch(
      `${BACKEND_URL}/playlist/${input.playlistId}/items/${input.itemId}/position`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authHash}`,
        },
        body: JSON.stringify({ position: input.position }),
      }
    );

    if (!response.ok) {
      throw error(response.status, `Backend error: ${response.statusText}`);
    }

    const data = await response.json();
    return v.parse(RemoveItemFromPlaylistResponseSchema, data);
  }
);

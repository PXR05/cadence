import "dotenv/config";
import { query, command, getRequestEvent } from "$app/server";
import * as v from "valibot";
import { error } from "@sveltejs/kit";
import {
  AudioListResponseSchema,
  SearchSuggestionsResponseSchema,
  DeleteTrackResponseSchema,
  FetchTracksOptionsSchema,
  SearchTracksOptionsSchema,
  SearchSuggestionsOptionsSchema,
  FetchRandomTracksOptionsSchema,
  type AudioFile,
} from "$lib/schemas/audio";

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

export const fetchTracks = query(FetchTracksOptionsSchema, async (options) => {
  const authHash = getAuthToken();
  const {
    page = 1,
    limit = 20,
    sortBy = "uploadedAt",
    sortOrder = "desc",
  } = options;

  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    sortBy,
    sortOrder,
  });

  const response = await fetch(`${BACKEND_URL}/audio?${params}`, {
    headers: {
      Authorization: `Bearer ${authHash}`,
    },
  });

  if (!response.ok) {
    throw error(response.status, `Backend error: ${response.statusText}`);
  }

  const data = await response.json();
  const validated = v.parse(AudioListResponseSchema, data);

  return {
    tracks: validated.files,
    hasMore: validated.files.length >= limit,
    totalPages: validated.totalPages,
    currentPage: page,
  };
});

export const searchTracks = query(
  SearchTracksOptionsSchema,
  async (options) => {
    const authHash = getAuthToken();
    const { q, page = 1, limit = 20 } = options;

    const params = new URLSearchParams({
      q,
      page: page.toString(),
      limit: limit.toString(),
    });

    const response = await fetch(`${BACKEND_URL}/audio/search?${params}`, {
      headers: {
        Authorization: `Bearer ${authHash}`,
      },
    });

    if (!response.ok) {
      throw error(response.status, `Backend error: ${response.statusText}`);
    }

    const data = await response.json();
    const validated = v.parse(AudioListResponseSchema, data);

    return {
      tracks: validated.files,
      hasMore: validated.files.length >= limit,
      totalPages: validated.totalPages,
      currentPage: page,
    };
  }
);

export const getSearchSuggestions = query(
  SearchSuggestionsOptionsSchema,
  async (options) => {
    const authHash = getAuthToken();
    const { q, limit = 5 } = options;

    const params = new URLSearchParams({
      q,
      limit: limit.toString(),
    });

    const response = await fetch(
      `${BACKEND_URL}/audio/search/suggestions?${params}`,
      {
        headers: {
          Authorization: `Bearer ${authHash}`,
        },
      }
    );

    if (!response.ok) {
      throw error(response.status, `Backend error: ${response.statusText}`);
    }

    const data = await response.json();
    return v.parse(SearchSuggestionsResponseSchema, data);
  }
);

export const fetchRandomTracks = query(
  FetchRandomTracksOptionsSchema,
  async (options) => {
    const authHash = getAuthToken();
    const { page = 1, limit = 50, seed, firstTrackId } = options;

    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (seed) {
      params.append("seed", seed);
    }

    if (firstTrackId) {
      params.append("firstTrackId", firstTrackId);
    }

    const response = await fetch(`${BACKEND_URL}/audio/random?${params}`, {
      headers: {
        Authorization: `Bearer ${authHash}`,
      },
    });

    if (!response.ok) {
      throw error(response.status, `Backend error: ${response.statusText}`);
    }

    const data = await response.json();
    const validated = v.parse(AudioListResponseSchema, data);

    return {
      tracks: validated.files,
      hasMore: validated.files.length >= limit,
      totalPages: validated.totalPages,
      currentPage: page,
    };
  }
);

export const deleteTrack = command(v.string(), async (id) => {
  const authHash = getAuthToken();

  const response = await fetch(`${BACKEND_URL}/audio/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${authHash}`,
    },
  });

  if (!response.ok) {
    throw error(response.status, `Backend error: ${response.statusText}`);
  }

  const data = await response.json();
  return v.parse(DeleteTrackResponseSchema, data);
});

export const fetchAllTracks = query(async () => {
  const authHash = getAuthToken();
  const allTracks: AudioFile[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: "100",
      sortBy: "title",
      sortOrder: "asc",
    });

    const response = await fetch(`${BACKEND_URL}/audio?${params}`, {
      headers: {
        Authorization: `Bearer ${authHash}`,
      },
    });

    if (!response.ok) {
      throw error(response.status, `Backend error: ${response.statusText}`);
    }

    const data = await response.json();
    const validated = v.parse(AudioListResponseSchema, data);

    allTracks.push(...validated.files);
    hasMore = validated.files.length >= 100;
    page++;
  }

  return allTracks;
});

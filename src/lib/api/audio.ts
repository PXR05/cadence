import * as v from "valibot";
import {
  AudioListResponseSchema,
  SearchSuggestionsResponseSchema,
  DeleteTrackResponseSchema,
  type AudioFile,
} from "$lib/schemas/audio";
import { authFetch } from "./fetch";

export interface FetchTracksOptions {
  page?: number;
  limit?: number;
  total?: number;
  sortBy?: "filename" | "size" | "uploadedAt" | "title";
  sortOrder?: "asc" | "desc";
}

export interface SearchTracksOptions {
  q: string;
  page?: number;
  limit?: number;
}

export interface SearchSuggestionsOptions {
  q: string;
  limit?: number;
}

export interface FetchRandomTracksOptions {
  page?: number;
  limit?: number;
  seed?: string;
  firstTrackId?: string;
}

export async function fetchTracks(options: FetchTracksOptions = {}) {
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

  const response = await authFetch(`/audio?${params}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch tracks: ${response.statusText}`);
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

export async function searchTracks(options: SearchTracksOptions) {
  const { q, page = 1, limit = 20 } = options;

  const params = new URLSearchParams({
    q,
    page: page.toString(),
    limit: limit.toString(),
  });

  const response = await authFetch(`/audio/search?${params}`);

  if (!response.ok) {
    throw new Error(`Failed to search tracks: ${await response.text()}`);
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

export async function getSearchSuggestions(options: SearchSuggestionsOptions) {
  const { q, limit = 5 } = options;

  const params = new URLSearchParams({
    q,
    limit: limit.toString(),
  });

  const response = await authFetch(`/audio/search/suggestions?${params}`);

  if (!response.ok) {
    throw new Error(`Failed to get search suggestions: ${response.statusText}`);
  }

  const data = await response.json();
  return v.parse(SearchSuggestionsResponseSchema, data);
}

export async function fetchRandomTracks(
  options: FetchRandomTracksOptions = {}
) {
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

  const response = await authFetch(`/audio/random?${params}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch random tracks: ${response.statusText}`);
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

export async function deleteTrack(id: string) {
  const response = await authFetch(`/audio/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Failed to delete track: ${response.statusText}`);
  }

  const data = await response.json();
  return v.parse(DeleteTrackResponseSchema, data);
}

export async function fetchAllTracks() {
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

    const response = await authFetch(`/audio?${params}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch all tracks: ${response.statusText}`);
    }

    const data = await response.json();
    const validated = v.parse(AudioListResponseSchema, data);

    allTracks.push(...validated.files);
    hasMore = validated.files.length >= 100;
    page++;
  }

  return allTracks;
}

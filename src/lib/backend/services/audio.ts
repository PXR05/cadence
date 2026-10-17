import * as v from "valibot";
import {
  AudioListResponseSchema,
  DeleteTrackResponseSchema,
  RadioResponseSchema,
  RadioStatusResponseSchema,
  SearchSuggestionsResponseSchema,
  type AudioFile,
  type FetchRadioOptions,
  type FetchRandomTracksOptions,
  type FetchTracksOptions,
  type RadioResponse,
  type RadioStatusResponse,
  type SearchSuggestionsOptions,
  type SearchTracksOptions,
} from "$lib/schemas/audio";
import { backendConfig } from "../config";
import { backendRequest } from "../client";
import { requireBackendCapability } from "../capabilities";

export interface TrackListResult {
  tracks: AudioFile[];
  deletedIds: string[];
  hasMore: boolean;
  totalPages: number;
  currentPage: number;
}

function mapTrackList(
  data: unknown,
  page: number,
  limit: number,
): TrackListResult {
  const validated = v.parse(AudioListResponseSchema, data);
  return {
    tracks: validated.files,
    deletedIds: validated.deletedIds,
    hasMore: validated.files.length >= limit,
    totalPages: validated.totalPages,
    currentPage: page,
  };
}

export async function fetchTracks(
  options: FetchTracksOptions = {},
): Promise<TrackListResult> {
  requireBackendCapability("library");
  const {
    page = 1,
    limit = 20,
    sortBy = "uploadedAt",
    sortOrder = "desc",
    lastFetchedAt,
  } = options;
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    sortBy,
    sortOrder,
  });
  if (lastFetchedAt !== undefined) {
    params.set("lastFetchedAt", String(lastFetchedAt));
  }
  const response = await backendRequest(
    `${backendConfig.routes.audio.root}?${params}`,
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch tracks: ${response.statusText}`);
  }
  return mapTrackList(await response.json(), page, limit);
}

export async function searchTracks(
  options: SearchTracksOptions,
): Promise<TrackListResult> {
  requireBackendCapability("library.search");
  const { q, page = 1, limit = 20 } = options;
  const params = new URLSearchParams({ q, page: String(page), limit: String(limit) });
  const response = await backendRequest(
    `${backendConfig.routes.audio.search}?${params}`,
  );
  if (!response.ok) {
    throw new Error(`Failed to search tracks: ${await response.text()}`);
  }
  return mapTrackList(await response.json(), page, limit);
}

export async function getSearchSuggestions(options: SearchSuggestionsOptions) {
  requireBackendCapability("library.suggestions");
  const params = new URLSearchParams({
    q: options.q,
    limit: String(options.limit ?? 5),
  });
  const response = await backendRequest(
    `${backendConfig.routes.audio.suggestions}?${params}`,
  );
  if (!response.ok) {
    throw new Error(`Failed to get search suggestions: ${response.statusText}`);
  }
  return v.parse(SearchSuggestionsResponseSchema, await response.json());
}

export async function fetchRandomTracks(
  options: FetchRandomTracksOptions = {},
): Promise<TrackListResult> {
  requireBackendCapability("library.random");
  const { page = 1, limit = 50, seed, firstTrackId } = options;
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (seed) params.set("seed", seed);
  if (firstTrackId) params.set("firstTrackId", firstTrackId);
  const response = await backendRequest(
    `${backendConfig.routes.audio.random}?${params}`,
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch random tracks: ${response.statusText}`);
  }
  return mapTrackList(await response.json(), page, limit);
}

export async function fetchRadioTracks(
  options: FetchRadioOptions,
): Promise<RadioResponse> {
  requireBackendCapability("library.radio");
  const {
    seed,
    limit = 50,
    lambda,
    temperature,
    seedNonce,
    artistCooldown,
    albumCooldown,
  } = options;
  const params = new URLSearchParams({
    seed,
    limit: String(limit),
  });
  if (lambda !== undefined) params.set("lambda", String(lambda));
  if (temperature !== undefined) params.set("temperature", String(temperature));
  if (seedNonce !== undefined) params.set("seedNonce", seedNonce);
  if (artistCooldown !== undefined) {
    params.set("artistCooldown", String(artistCooldown));
  }
  if (albumCooldown !== undefined) {
    params.set("albumCooldown", String(albumCooldown));
  }

  const response = await backendRequest(
    `${backendConfig.routes.audio.radio}?${params}`,
    {
      signal:
        typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
          ? AbortSignal.timeout(8000)
          : undefined,
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch radio tracks: ${await response.text()}`);
  }
  return v.parse(RadioResponseSchema, await response.json());
}

export async function fetchRadioStatus(): Promise<RadioStatusResponse> {
  requireBackendCapability("library.radio");
  const response = await backendRequest(backendConfig.routes.audio.radioStatus);
  if (!response.ok) {
    throw new Error(`Failed to fetch radio status: ${response.statusText}`);
  }
  return v.parse(RadioStatusResponseSchema, await response.json());
}

export async function deleteTrack(id: string) {
  requireBackendCapability("library.delete");
  const response = await backendRequest(backendConfig.routes.audio.item(id), {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Failed to delete track: ${response.statusText}`);
  }
  return v.parse(DeleteTrackResponseSchema, await response.json());
}

export async function fetchAllTracks() {
  const allTracks: AudioFile[] = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const result = await fetchTracks({
      page,
      limit: 100,
      sortBy: "title",
      sortOrder: "asc",
    });
    allTracks.push(...result.tracks);
    hasMore = result.hasMore;
    page += 1;
  }
  return allTracks;
}


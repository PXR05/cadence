// Client-side API that proxies through SvelteKit API routes
export const BASE_URL = "/api/proxy";

export type SortBy = "filename" | "size" | "uploadedAt" | "title";
export type SortOrder = "asc" | "desc";
export type SuggestionType = "title" | "artist" | "album";

export interface FetchTracksOptions {
  page?: number;
  limit?: number;
  sortBy?: SortBy;
  sortOrder?: SortOrder;
}

export interface FetchTracksResult {
  tracks: AudioFile[];
  hasMore: boolean;
  currentPage: number;
  totalPages?: number;
}

export interface SearchTracksOptions {
  q: string;
  page?: number;
  limit?: number;
}

export interface SearchSuggestion {
  type: SuggestionType;
  value: string;
  score: number;
}

export interface SearchSuggestionsOptions {
  q: string;
  limit?: number;
}

export interface SearchSuggestionsResult {
  suggestions: SearchSuggestion[];
}

export interface FetchRandomTracksOptions {
  page?: number;
  limit?: number;
  seed?: string;
  firstTrackId?: string;
}

export async function fetchTracks(
  options: FetchTracksOptions = {}
): Promise<FetchTracksResult> {
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

  const res = await fetch(`${BASE_URL}?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch tracks: ${res.statusText}`);

  const data = (await res.json()) as AudioListResponse;

  return {
    tracks: data.files,
    hasMore: data.files.length >= limit,
    currentPage: page,
  };
}

export async function searchTracks(
  options: SearchTracksOptions
): Promise<FetchTracksResult> {
  const { q, page = 1, limit = 20 } = options;

  const params = new URLSearchParams({
    q,
    page: page.toString(),
    limit: limit.toString(),
  });

  const res = await fetch(`${BASE_URL}/search?${params}`);
  if (!res.ok) throw new Error(`Failed to search tracks: ${res.statusText}`);

  const data = (await res.json()) as AudioListResponse;

  return {
    tracks: data.files,
    hasMore: data.files.length >= limit,
    currentPage: page,
  };
}

export async function getSearchSuggestions(
  options: SearchSuggestionsOptions
): Promise<SearchSuggestionsResult> {
  const { q, limit = 5 } = options;

  const params = new URLSearchParams({
    q,
    limit: limit.toString(),
  });

  const res = await fetch(`${BASE_URL}/search/suggestions?${params}`);
  if (!res.ok)
    throw new Error(`Failed to fetch suggestions: ${res.statusText}`);

  return (await res.json()) as SearchSuggestionsResult;
}

export async function fetchRandomTracks(
  options: FetchRandomTracksOptions = {}
): Promise<FetchTracksResult> {
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

  const res = await fetch(`${BASE_URL}/random?${params}`);
  if (!res.ok)
    throw new Error(`Failed to fetch random tracks: ${res.statusText}`);

  const data = (await res.json()) as AudioListResponse;

  return {
    tracks: data.files,
    hasMore: data.files.length >= limit,
    currentPage: page,
  };
}

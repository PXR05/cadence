export const BASE_URL = "/api/audio";
export const TOKEN_URL = "/api/token";

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
  if (!res.ok)
    throw new Error(
      `Failed to fetch tracks: ${JSON.stringify(await res.text())}`
    );

  const data = (await res.json()) as AudioListResponse;

  return {
    tracks: data.files,
    hasMore: data.files.length >= limit,
    totalPages: data.totalPages,
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
    totalPages: data.totalPages,
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
    totalPages: data.totalPages,
    currentPage: page,
  };
}

export interface TokenInfo {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface CreateTokenResponse {
  message: string;
  data: {
    id: string;
    name: string;
    userId: string;
    token: string;
    createdAt: string;
  };
}

export interface CheckTokenResponse {
  data: {
    isAdmin: boolean;
    tokenInfo?: TokenInfo;
  };
}

export interface ListTokensResponse {
  data: TokenInfo[];
}

export async function checkToken(): Promise<CheckTokenResponse> {
  const res = await fetch(`${TOKEN_URL}/check`);
  if (!res.ok) throw new Error(`Failed to check token: ${res.statusText}`);
  return (await res.json()) as CheckTokenResponse;
}

export async function createToken(
  name: string,
  userId: string
): Promise<CreateTokenResponse> {
  const res = await fetch(`${TOKEN_URL}/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, userId }),
  });
  if (!res.ok) throw new Error(`Failed to create token: ${res.statusText}`);
  return (await res.json()) as CreateTokenResponse;
}

export async function listTokens(userId?: string): Promise<ListTokensResponse> {
  const url = userId
    ? `${TOKEN_URL}/?userId=${encodeURIComponent(userId)}`
    : `${TOKEN_URL}/`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to list tokens: ${res.statusText}`);
  return (await res.json()) as ListTokensResponse;
}

export async function deleteToken(id: string): Promise<{ message: string }> {
  const res = await fetch(`${TOKEN_URL}/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Failed to delete token: ${res.statusText}`);
  return (await res.json()) as { message: string };
}

export interface UploadResponse {
  success: boolean;
  id: string;
  filename: string;
  imageFile?: string;
  message: string;
}

export interface MultiUploadResponse {
  success: boolean;
  results: Array<
    | UploadResponse
    | {
        success: false;
        filename: string;
        error: string;
      }
  >;
  totalFiles: number;
  successfulUploads: number;
  failedUploads: number;
  message: string;
}

export interface YoutubeDownloadResponse {
  success: boolean;
  id: string;
  filename: string;
  title: string;
  imageFile?: string;
  message: string;
}

export interface DeleteTrackResponse {
  success: boolean;
  message: string;
}

export async function uploadFiles(
  files: File[]
): Promise<UploadResponse | MultiUploadResponse> {
  const formData = new FormData();

  if (files.length === 1) {
    formData.append("file", files[0]);
  } else {
    files.forEach((file) => {
      formData.append("files", file);
    });
  }

  const res = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error(`Failed to upload files: ${res.statusText}`);

  return (await res.json()) as UploadResponse | MultiUploadResponse;
}

export async function downloadYoutube(
  url: string
): Promise<YoutubeDownloadResponse> {
  const res = await fetch(`${BASE_URL}/youtube`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
  });

  if (!res.ok)
    throw new Error(`Failed to download from YouTube: ${res.statusText}`);

  return (await res.json()) as YoutubeDownloadResponse;
}

export async function deleteTrack(id: string): Promise<DeleteTrackResponse> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) throw new Error(`Failed to delete track: ${res.statusText}`);

  return (await res.json()) as DeleteTrackResponse;
}

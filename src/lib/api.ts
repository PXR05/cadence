export const BASE_URL = "/api/audio";
export const AUTH_URL = "/api/auth";
export const PLAYLIST_URL = "/api/playlist";

export type SortBy = "filename" | "size" | "uploadedAt" | "title";
export type SortOrder = "asc" | "desc";
export type SuggestionType = "title" | "artist" | "album";

export interface YouTubeProgressEvent {
  type: "progress" | "complete" | "error" | "info";
  message: string;
  data?: {
    percent?: number;
    speed?: string;
    eta?: string;
    downloaded?: string;
    totalSize?: string;
  };
  result?: YoutubeDownloadResponse;
}

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

export async function fetchAllTracks(): Promise<AudioFile[]> {
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
    page++;
  }

  return allTracks;
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

export interface User {
  id: string;
  username: string;
  role: "admin" | "user";
  createdAt?: string;
  lastLoginAt?: string;
}

export interface GetCurrentUserResponse {
  data: User;
}

export interface ListUsersOptions {
  page?: number;
  limit?: number;
}

export interface ListUsersResponse {
  data: User[];
  hasMore?: boolean;
  currentPage?: number;
  totalPages?: number;
}

export interface CreateUserResponse {
  message: string;
  user: User;
}

export interface ResetPasswordResponse {
  message: string;
}

export async function getCurrentUser(): Promise<GetCurrentUserResponse> {
  const res = await fetch(`${AUTH_URL}/me`);
  if (!res.ok) throw new Error(`Failed to get current user: ${res.statusText}`);
  return (await res.json()) as GetCurrentUserResponse;
}

export async function listUsers(
  options: ListUsersOptions = {}
): Promise<ListUsersResponse> {
  const { page = 1, limit = 10 } = options;
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  const res = await fetch(`${AUTH_URL}/users?${params}`);
  if (!res.ok) throw new Error(`Failed to list users: ${res.statusText}`);
  return (await res.json()) as ListUsersResponse;
}

export async function createUser(
  username: string,
  password: string
): Promise<CreateUserResponse> {
  const res = await fetch(`${AUTH_URL}/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to create user");
  }
  return (await res.json()) as CreateUserResponse;
}

export async function resetUserPassword(
  userId: string,
  newPassword: string
): Promise<ResetPasswordResponse> {
  const res = await fetch(`${AUTH_URL}/users/${userId}/password`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ newPassword }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to reset password");
  }
  return (await res.json()) as ResetPasswordResponse;
}

export async function deleteUser(id: string): Promise<{ message: string }> {
  const res = await fetch(`${AUTH_URL}/users/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Failed to delete user: ${res.statusText}`);
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

export async function downloadYoutubeWithProgress(
  url: string,
  onProgress: (event: YouTubeProgressEvent) => void
): Promise<void> {
  const params = new URLSearchParams({ url });
  const eventSource = new EventSource(`${BASE_URL}/youtube?${params}`);

  return new Promise((resolve, reject) => {
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as YouTubeProgressEvent;
        onProgress(data);

        if (data.type === "complete") {
          eventSource.close();
          resolve();
        } else if (data.type === "error") {
          eventSource.close();
          reject(new Error(data.message));
        }
      } catch (error) {
        console.error("Error parsing SSE data:", error);
      }
    };

    eventSource.onerror = (error) => {
      eventSource.close();
      reject(new Error("Connection to server lost"));
    };
  });
}

export async function deleteTrack(id: string): Promise<DeleteTrackResponse> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) throw new Error(`Failed to delete track: ${res.statusText}`);

  return (await res.json()) as DeleteTrackResponse;
}

export interface CreatePlaylistResponse {
  success: boolean;
  playlist: Playlist;
  message: string;
}

export interface UpdatePlaylistResponse {
  success: boolean;
  playlist: Playlist;
  message: string;
}

export interface DeletePlaylistResponse {
  success: boolean;
  message: string;
}

export interface GetPlaylistResponse {
  playlist: PlaylistDetail;
}

export interface AddItemToPlaylistResponse {
  success: boolean;
  item: PlaylistItem;
  message: string;
}

export interface RemoveItemFromPlaylistResponse {
  success: boolean;
  message: string;
}

export async function createPlaylist(
  name: string,
  coverImage?: File
): Promise<CreatePlaylistResponse> {
  const formData = new FormData();
  formData.append("name", name);
  if (coverImage) {
    formData.append("coverImage", coverImage);
  }

  const res = await fetch(`${PLAYLIST_URL}`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error(`Failed to create playlist: ${res.statusText}`);

  return (await res.json()) as CreatePlaylistResponse;
}

export async function getUserPlaylists(
  type?: "user" | "artist" | "album" | "auto" | "youtube",
  limit?: number
): Promise<Playlist[]> {
  const params = new URLSearchParams();
  if (type) params.append("type", type);
  if (limit) params.append("limit", limit.toString());

  const queryString = params.toString();
  const res = await fetch(
    `${PLAYLIST_URL}${queryString ? `?${queryString}` : ""}`
  );
  if (!res.ok) throw new Error(`Failed to fetch playlists: ${res.statusText}`);

  const data = (await res.json()) as { playlists: Playlist[] };

  return data.playlists as Playlist[];
}

export async function getPlaylistById(
  id: string
): Promise<GetPlaylistResponse> {
  const res = await fetch(`${PLAYLIST_URL}/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch playlist: ${res.statusText}`);

  return (await res.json()) as GetPlaylistResponse;
}

export async function updatePlaylist(
  id: string,
  name?: string,
  coverImage?: File
): Promise<UpdatePlaylistResponse> {
  const formData = new FormData();
  if (name) formData.append("name", name);
  if (coverImage) formData.append("coverImage", coverImage);

  const res = await fetch(`${PLAYLIST_URL}/${id}`, {
    method: "PATCH",
    body: formData,
  });

  if (!res.ok) throw new Error(`Failed to update playlist: ${res.statusText}`);

  return (await res.json()) as UpdatePlaylistResponse;
}

export async function deletePlaylist(
  id: string
): Promise<DeletePlaylistResponse> {
  const res = await fetch(`${PLAYLIST_URL}/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) throw new Error(`Failed to delete playlist: ${res.statusText}`);

  return (await res.json()) as DeletePlaylistResponse;
}

export async function addItemToPlaylist(
  playlistId: string,
  audioId: string
): Promise<AddItemToPlaylistResponse> {
  const res = await fetch(`${PLAYLIST_URL}/${playlistId}/items`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ audioId }),
  });

  if (!res.ok)
    throw new Error(`Failed to add item to playlist: ${res.statusText}`);

  return (await res.json()) as AddItemToPlaylistResponse;
}

export async function removeItemFromPlaylist(
  playlistId: string,
  itemId: string
): Promise<RemoveItemFromPlaylistResponse> {
  const res = await fetch(`${PLAYLIST_URL}/${playlistId}/items/${itemId}`, {
    method: "DELETE",
  });

  if (!res.ok)
    throw new Error(`Failed to remove item from playlist: ${res.statusText}`);

  return (await res.json()) as RemoveItemFromPlaylistResponse;
}

export async function reorderPlaylistItem(
  playlistId: string,
  itemId: string,
  position: number
): Promise<RemoveItemFromPlaylistResponse> {
  const res = await fetch(
    `${PLAYLIST_URL}/${playlistId}/items/${itemId}/position`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ position }),
    }
  );

  if (!res.ok)
    throw new Error(`Failed to reorder playlist item: ${res.statusText}`);

  return (await res.json()) as RemoveItemFromPlaylistResponse;
}

import type { BackendConfig } from "./types";

/**
 * Change routes and capabilities here to match an AudioStream-compatible
 * backend. For incompatible response shapes, add an adapter in
 * `backend/adapters` and use it from the relevant service.
 */
export const backendConfig: BackendConfig = {
  defaultBaseUrl:
    import.meta.env.PUBLIC_API_URL || "https://audiostream.pxr.dpdns.org",
  auth: {
    mode: "cookie-or-bearer",
    credentials: "include",
    bearerHeader: "Authorization",
  },
  capabilities: {
    auth: {
      enabled: true,
      registration: true,
      passwordChange: true,
      userManagement: true,
    },
    library: {
      enabled: true,
      search: true,
      suggestions: true,
      random: true,
      delete: true,
    },
    playlists: {
      enabled: true,
      create: true,
      edit: true,
      delete: true,
      manageItems: true,
      reorder: true,
    },
    media: {
      streaming: true,
      images: true,
      streamTickets: true,
    },
    uploads: {
      file: true,
      remote: true,
    },
    offline: true,
    settingsSync: true,
    backendUrlSelection: true,
    remoteProviders: {
      youtube: { search: true, import: true },
      tidal: { search: true, import: true },
    },
  },
  routes: {
    auth: {
      me: "/auth/me",
      login: "/auth/login",
      register: "/auth/register",
      logout: "/auth/logout",
      changePassword: "/auth/change-password",
      users: "/auth/users",
      user: (id) => `/auth/users/${encodeURIComponent(id)}`,
      userPassword: (id) =>
        `/auth/users/${encodeURIComponent(id)}/password`,
    },
    audio: {
      root: "/audio",
      item: (id) => `/audio/${encodeURIComponent(id)}`,
      search: "/audio/search",
      suggestions: "/audio/search/suggestions",
      random: "/audio/random",
      stream: (id) => `/audio/${encodeURIComponent(id)}/stream`,
      ticket: (id) => `/audio/${encodeURIComponent(id)}/ticket`,
      image: (id) => `/audio/${encodeURIComponent(id)}/image`,
      upload: "/audio/upload",
      remoteSearch: (provider) => `/audio/search/${provider}`,
      remoteImport: (provider) => `/audio/upload/${provider}`,
      remoteImportCancel: (provider, streamId) =>
        `/audio/upload/${provider}/${encodeURIComponent(streamId)}`,
    },
    playlists: {
      root: "/playlist",
      item: (id) => `/playlist/${encodeURIComponent(id)}`,
      image: (id) => `/playlist/${encodeURIComponent(id)}/image`,
      items: (id) => `/playlist/${encodeURIComponent(id)}/items`,
      playlistItem: (playlistId, itemId) =>
        `/playlist/${encodeURIComponent(playlistId)}/items/${encodeURIComponent(itemId)}`,
      itemPosition: (playlistId, itemId) =>
        `/playlist/${encodeURIComponent(playlistId)}/items/${encodeURIComponent(itemId)}/position`,
    },
    settings: {
      item: (key) => `/user/settings/${encodeURIComponent(key)}`,
    },
  },
};

export const backendCapabilities = backendConfig.capabilities;


export type RemoteBackendProvider = "youtube" | "tidal";

export interface BackendCapabilities {
  auth: {
    enabled: boolean;
    registration: boolean;
    passwordChange: boolean;
    userManagement: boolean;
  };
  library: {
    enabled: boolean;
    search: boolean;
    suggestions: boolean;
    random: boolean;
    delete: boolean;
  };
  playlists: {
    enabled: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    manageItems: boolean;
    reorder: boolean;
  };
  media: {
    streaming: boolean;
    images: boolean;
    streamTickets: boolean;
  };
  uploads: {
    file: boolean;
    remote: boolean;
  };
  offline: boolean;
  settingsSync: boolean;
  backendUrlSelection: boolean;
  remoteProviders: Record<
    RemoteBackendProvider,
    { search: boolean; import: boolean }
  >;
}

export interface BackendRoutes {
  auth: {
    me: string;
    login: string;
    register: string;
    logout: string;
    changePassword: string;
    users: string;
    user: (id: string) => string;
    userPassword: (id: string) => string;
  };
  audio: {
    root: string;
    item: (id: string) => string;
    search: string;
    suggestions: string;
    random: string;
    stream: (id: string) => string;
    ticket: (id: string) => string;
    image: (id: string) => string;
    upload: string;
    remoteSearch: (provider: RemoteBackendProvider) => string;
    remoteImport: (provider: RemoteBackendProvider) => string;
    remoteImportCancel: (
      provider: RemoteBackendProvider,
      streamId: string,
    ) => string;
  };
  playlists: {
    root: string;
    item: (id: string) => string;
    image: (id: string) => string;
    items: (id: string) => string;
    playlistItem: (playlistId: string, itemId: string) => string;
    itemPosition: (playlistId: string, itemId: string) => string;
  };
  settings: {
    item: (key: string) => string;
  };
}

export interface BackendConfig {
  defaultBaseUrl: string;
  auth: {
    mode: "cookie" | "bearer" | "cookie-or-bearer";
    credentials: RequestCredentials;
    bearerHeader: string;
  };
  capabilities: BackendCapabilities;
  routes: BackendRoutes;
}


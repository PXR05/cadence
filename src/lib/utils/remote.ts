import type { RemoteCollectionKind, RemoteProvider } from "$lib/schemas";

export const REMOTE_PROVIDERS: RemoteProvider[] = ["youtube", "tidal"];

type RemoteProviderConfig = {
  label: string;
  searchEndpoint: string;
  buildItemUrl: (providerItemId: string) => string;
  getItemIdFromUrl: (url: string) => string | null;
  getCollectionKindFromUrl: (url: string) => RemoteCollectionKind | null;
};

const remoteProviderConfig: Record<RemoteProvider, RemoteProviderConfig> = {
  youtube: {
    label: "YouTube",
    searchEndpoint: "/audio/search/youtube",
    buildItemUrl: (providerItemId) =>
      `https://www.youtube.com/watch?v=${providerItemId}`,
    getItemIdFromUrl: (url) => {
      const match = url.match(/[?&]v=([^&]+)/);
      return match?.[1] ?? null;
    },
    getCollectionKindFromUrl: (url) => {
      if (url.includes("list=") || url.includes("/playlist")) {
        return "playlist";
      }
      return null;
    },
  },
  tidal: {
    label: "Tidal",
    searchEndpoint: "/audio/search/tidal",
    buildItemUrl: (providerItemId) =>
      `https://tidal.com/browse/track/${providerItemId}`,
    getItemIdFromUrl: (url) => {
      const match = url.match(/\/(?:browse\/)?track\/([^/?]+)/);
      return match?.[1] ?? null;
    },
    getCollectionKindFromUrl: (url) => {
      if (url.includes("/playlist/") || url.includes("/browse/playlist/")) {
        return "playlist";
      }
      if (url.includes("/album/") || url.includes("/browse/album/")) {
        return "album";
      }
      return null;
    },
  },
};

export function getRemoteProviderLabel(provider: RemoteProvider): string {
  return remoteProviderConfig[provider].label;
}

export function getRemoteSearchEndpoint(provider: RemoteProvider): string {
  return remoteProviderConfig[provider].searchEndpoint;
}

export function buildRemoteItemUrl(
  provider: RemoteProvider,
  providerItemId: string,
): string {
  return remoteProviderConfig[provider].buildItemUrl(providerItemId);
}

export function getRemoteItemIdFromUrl(
  provider: RemoteProvider,
  url: string,
): string | null {
  return remoteProviderConfig[provider].getItemIdFromUrl(url);
}

export function getRemoteCollectionKindFromUrl(
  provider: RemoteProvider,
  url: string,
): RemoteCollectionKind | null {
  return remoteProviderConfig[provider].getCollectionKindFromUrl(url);
}

export function buildRemoteCollectionUrl(
  provider: RemoteProvider,
  kind: RemoteCollectionKind,
  providerItemId: string,
): string {
  if (provider === "youtube") {
    return `https://music.youtube.com/playlist?list=${providerItemId}`;
  }

  return `https://tidal.com/browse/${kind}/${providerItemId.replace("tidal_" + kind + "_", "").split("_")[0]}`;
}

export function isValidRemoteImportUrl(
  provider: RemoteProvider,
  url: string,
): boolean {
  const collectionKind = getRemoteCollectionKindFromUrl(provider, url);

  if (provider === "youtube") {
    return collectionKind === "playlist";
  }

  return collectionKind === "playlist" || collectionKind === "album";
}

export function detectRemoteProviderFromUrl(
  url: string,
): RemoteProvider | null {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return null;

  try {
    const parsed = new URL(trimmedUrl);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");

    if (hostname === "youtu.be" || hostname.endsWith("youtube.com")) {
      return "youtube";
    }

    if (hostname.endsWith("tidal.com")) {
      return "tidal";
    }
  } catch {}

  if (/youtu\.be|youtube\.com/i.test(trimmedUrl)) {
    return "youtube";
  }

  if (/tidal\.com/i.test(trimmedUrl)) {
    return "tidal";
  }

  return null;
}

import {
  apiUrlStore,
  getBackendUrl,
  normalizeApiUrl,
} from "$lib/stores/apiUrl.svelte";
import { authStore } from "$lib/stores/auth.svelte";
import { tracksStore } from "$lib/stores/tracks.svelte";
import { playlistsStore } from "$lib/stores/playlists.svelte";
import { historyStore } from "$lib/stores/history.svelte";
import { playerStore } from "$lib/stores/player.svelte";
import { downloadStore } from "$lib/stores/download.svelte";
import { remoteDownloadStore } from "$lib/stores/remoteDownload.svelte";
import { offlineDb } from "$lib/db/offline";

export interface ApplyApiUrlChangeResult {
  changed: boolean;
  activeUrl: string;
  usesDefaultUrl: boolean;
}

function clearContentLocalStorage(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem("cadence.download_queue");
  localStorage.removeItem("cadence.remote_download");
}

async function clearWindowCaches(): Promise<void> {
  if (typeof window === "undefined" || !("caches" in window)) return;

  try {
    const cacheNames = await window.caches.keys();
    await Promise.allSettled(
      cacheNames.map((name) => window.caches.delete(name)),
    );
  } catch {
  }
}

async function resetBackendContentData(): Promise<void> {
  try {
    await downloadStore.cancelDownload();
  } catch {
  }

  downloadStore.resetState();
  remoteDownloadStore.clearQueue();
  playerStore.resetContentState();

  await Promise.allSettled([tracksStore.clear(), playlistsStore.clear()]);
  await Promise.allSettled([
    offlineDb.tracks.clear(),
    offlineDb.images.clear(),
    historyStore.clearHistory(),
  ]);

  clearContentLocalStorage();
  await clearWindowCaches();
}

export async function applyApiUrlChange(
  nextUrlInput: string,
): Promise<ApplyApiUrlChangeResult> {
  const normalizedUrl = normalizeApiUrl(nextUrlInput);
  let currentUrl = "";
  try {
    currentUrl = getBackendUrl();
  } catch {
    currentUrl = "";
  }

  if (currentUrl && normalizedUrl === currentUrl) {
    return {
      changed: false,
      activeUrl: currentUrl,
      usesDefaultUrl: !apiUrlStore.hasCustomUrl,
    };
  }

  if (authStore.isAuthenticated) {
    await authStore.logout();
  }

  const defaultUrl = apiUrlStore.defaultUrl;
  if (defaultUrl && normalizedUrl === defaultUrl) {
    apiUrlStore.resetToDefault();
  } else {
    apiUrlStore.setCustomUrl(normalizedUrl);
  }

  await resetBackendContentData();
  await authStore.refreshCookieAuthMode();

  return {
    changed: true,
    activeUrl: getBackendUrl(),
    usesDefaultUrl: !apiUrlStore.hasCustomUrl,
  };
}

import {
  backendRuntime,
  getBackendUrl,
  normalizeBackendUrl,
} from "./runtime.svelte";
import { authStore } from "$lib/stores/auth.svelte";
import { tracksStore } from "$lib/stores/tracks.svelte";
import { playlistsStore } from "$lib/stores/playlists.svelte";
import { historyStore } from "$lib/stores/history.svelte";
import { playerStore } from "$lib/stores/player.svelte";
import { downloadStore } from "$lib/stores/download.svelte";
import { remoteDownloadStore } from "$lib/stores/remoteDownload.svelte";
import { offlineDb } from "$lib/db/offline";

export interface ApplyBackendUrlChangeResult {
  changed: boolean;
  activeUrl: string;
  usesDefaultUrl: boolean;
  resetContent: boolean;
}

export interface ApplyBackendUrlChangeOptions {
  resetContent?: boolean;
}

async function resetBackendContentData(): Promise<void> {
  try {
    await downloadStore.cancelDownload();
  } catch {}

  downloadStore.resetState();
  remoteDownloadStore.clearQueue();
  playerStore.resetContentState();
  await Promise.allSettled([tracksStore.clear(), playlistsStore.clear()]);
  await Promise.allSettled([
    offlineDb.tracks.clear(),
    offlineDb.images.clear(),
    historyStore.clearHistory(),
  ]);

  if (typeof window !== "undefined") {
    localStorage.removeItem("cadence.download_queue");
    localStorage.removeItem("cadence.remote_download");
    if ("caches" in window) {
      try {
        const names = await window.caches.keys();
        await Promise.allSettled(names.map((name) => window.caches.delete(name)));
      } catch {}
    }
  }
}

export async function applyBackendUrlChange(
  nextUrlInput: string,
  options: ApplyBackendUrlChangeOptions = {},
): Promise<ApplyBackendUrlChangeResult> {
  const resetContent = options.resetContent ?? true;
  const normalizedUrl = normalizeBackendUrl(nextUrlInput);
  let currentUrl = "";
  try {
    currentUrl = getBackendUrl();
  } catch {}

  if (currentUrl && normalizedUrl === currentUrl) {
    return {
      changed: false,
      activeUrl: currentUrl,
      usesDefaultUrl: !backendRuntime.hasCustomUrl,
      resetContent: false,
    };
  }

  if (authStore.isAuthenticated) await authStore.logout();

  if (backendRuntime.defaultUrl && normalizedUrl === backendRuntime.defaultUrl) {
    backendRuntime.resetToDefault();
  } else {
    backendRuntime.setCustomUrl(normalizedUrl);
  }

  if (resetContent) await resetBackendContentData();
  await authStore.refreshCookieAuthMode();

  return {
    changed: true,
    activeUrl: getBackendUrl(),
    usesDefaultUrl: !backendRuntime.hasCustomUrl,
    resetContent,
  };
}


import {
  Search as SearchIcon,
  Settings as SettingsIcon,
  Library as LibraryIcon,
  House as HouseIcon,
} from "@lucide/svelte";
import type { Component } from "svelte";
import { page } from "$app/state";
import { createLocalStorageState } from "$lib/stores/localStorage.svelte";
import { playlistsStore } from "$lib/stores/playlists.svelte";
import { tracksStore } from "$lib/stores/tracks.svelte";

export interface NavItem {
  path: string;
  label: string;
  icon: Component;
  action?: () => void | Promise<void>;
}

export const lastRefresh = createLocalStorageState("cadence.home_last_refresh", 0);

export const navItems: NavItem[] = [
  {
    path: "/",
    label: "Home",
    icon: HouseIcon,
    action: async () => {
      lastRefresh.value = Date.now();

      const [tracksResult, playlistsResult] = await Promise.allSettled([
        tracksStore.loadAllTracks(),
        playlistsStore.loadAllPlaylists(),
      ]);

      if (tracksResult.status === "rejected") {
        console.error(
          "Failed to refresh tracks on action:",
          tracksResult.reason,
        );
      }

      if (playlistsResult.status === "rejected") {
        console.error(
          "Failed to refresh playlists on action:",
          playlistsResult.reason,
        );
      }
    },
  },
  {
    path: "/search",
    label: "Search",
    icon: SearchIcon,
    action: () => {
      const input = document.querySelector("input[type='search']");
      if (input && input instanceof HTMLInputElement) {
        input.focus();
      }
    },
  },
  {
    path: "/library",
    label: "Library",
    icon: LibraryIcon,
    action: async () => {
      playlistsStore.invalidate();
      await playlistsStore.loadAllPlaylists(true);
    },
  },
  { path: "/settings", label: "Settings", icon: SettingsIcon },
];

export function isActive(tabPath: string, currentPath?: string): boolean {
  if (tabPath === "/") {
    return (currentPath ?? page.url.pathname) === "/";
  }
  return (currentPath ?? page.url.pathname).startsWith(tabPath);
}

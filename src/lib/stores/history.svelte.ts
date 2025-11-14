import {
  addPlayHistoryEntry,
  getRecentPlayHistory,
  clearPlayHistory,
} from "$lib/db/history";
import type { AudioFile } from "$lib/schemas";
import { tracksStore } from "./tracks.svelte";

class HistoryState {
  recentlyPlayed = $state<AudioFile[]>([]);
  isLoading = $state(false);

  async addToHistory(trackId: string, playlistId?: string): Promise<void> {
    try {
      await addPlayHistoryEntry(trackId, playlistId);
      await this.loadRecentlyPlayed();
    } catch (error) {
      console.error("Failed to add to history:", error);
    }
  }

  async loadRecentlyPlayed(limit: number = 10): Promise<void> {
    this.isLoading = true;
    try {
      const historyEntries = await getRecentPlayHistory(limit);
      const trackIds = historyEntries.map((entry) => entry.trackId);

      const tracks = tracksStore.tracks.filter((track) =>
        trackIds.includes(track.id)
      );

      this.recentlyPlayed = trackIds
        .map((id) => tracks.find((track) => track.id === id))
        .filter((track): track is AudioFile => track !== undefined);
    } catch (error) {
      console.error("Failed to load recently played:", error);
      this.recentlyPlayed = [];
    } finally {
      this.isLoading = false;
    }
  }

  async clearHistory(): Promise<void> {
    try {
      await clearPlayHistory();
      this.recentlyPlayed = [];
    } catch (error) {
      console.error("Failed to clear history:", error);
    }
  }
}

export const historyStore = new HistoryState();

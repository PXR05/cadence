import Dexie, { type Table } from "dexie";

export interface PlayHistoryEntry {
  id?: number;
  trackId: string;
  playlistId?: string;
  timestamp: number;
}

class HistoryDatabase extends Dexie {
  playHistory!: Table<PlayHistoryEntry, number>;

  constructor() {
    super("CadenceHistoryDB");
    this.version(1).stores({
      playHistory: "++id, trackId, timestamp",
    });
  }
}

export const historyDb = new HistoryDatabase();

export async function addPlayHistoryEntry(
  trackId: string,
  playlistId?: string
): Promise<void> {
  const entry: PlayHistoryEntry = {
    trackId,
    playlistId,
    timestamp: Date.now(),
  };

  await historyDb.playHistory.add(entry);

  const count = await historyDb.playHistory.count();
  if (count > 100) {
    const oldestEntries = await historyDb.playHistory
      .orderBy("timestamp")
      .limit(count - 100)
      .toArray();

    const idsToDelete = oldestEntries
      .map((e) => e.id)
      .filter((id): id is number => id !== undefined);

    await historyDb.playHistory.bulkDelete(idsToDelete);
  }
}

export async function getRecentPlayHistory(
  limit: number = 10
): Promise<PlayHistoryEntry[]> {
  const entries = await historyDb.playHistory
    .orderBy("timestamp")
    .reverse()
    .toArray();

  const seenTracks = new Set<string>();
  const uniqueEntries: PlayHistoryEntry[] = [];

  for (const entry of entries) {
    if (!seenTracks.has(entry.trackId)) {
      seenTracks.add(entry.trackId);
      uniqueEntries.push(entry);

      if (uniqueEntries.length >= limit) break;
    }
  }

  return uniqueEntries;
}

export async function clearPlayHistory(): Promise<void> {
  await historyDb.playHistory.clear();
}

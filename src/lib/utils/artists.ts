import type { AudioFile } from "$lib/schemas";

export interface Artist {
  name: string;
  trackCount: number;
  coverTrackId: string | undefined;
}

export type LibrarySource = "" | "local" | "youtube" | "tidal";
export type LibraryType = "" | "playlists" | "albums";

export function splitArtistNames(raw: string | undefined | null): string[] {
  if (!raw) return ["Unknown"];
  const delimiter = raw.includes(",") ? "," : "、";
  const names = raw
    .split(delimiter)
    .map((n) => n.trim())
    .filter((n) => n.length > 0);
  const unique = Array.from(new Set(names));
  return unique.length > 0 ? unique : ["Unknown"];
}

export function getTrackSource(track: AudioFile): Exclude<LibrarySource, ""> {
  if (track.tidalId) return "tidal";
  if (track.youtubeId) return "youtube";
  return "local";
}

export function filterTracksBySource(
  tracks: AudioFile[],
  source: LibrarySource,
): AudioFile[] {
  if (!source) return tracks;
  return tracks.filter((t) => getTrackSource(t) === source);
}

export function getArtistsFromTracks(tracks: AudioFile[]): Artist[] {
  const byKey = new Map<string, Artist>();
  for (const track of tracks) {
    for (const name of splitArtistNames(track.metadata?.artist)) {
      const key = name.toLowerCase();
      const existing = byKey.get(key);
      if (existing) {
        existing.trackCount += 1;
        if (!existing.coverTrackId) existing.coverTrackId = track.id;
      } else {
        byKey.set(key, {
          name,
          trackCount: 1,
          coverTrackId: track.id,
        });
      }
    }
  }
  return Array.from(byKey.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

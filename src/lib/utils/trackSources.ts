import type { AudioFile } from "$lib/schemas";
import { isTrackOffline } from "$lib/db/offline";

export type TrackProvider = "tidal" | "youtube" | "unknown";

export interface TrackSourceInfo {
  track: AudioFile;
  provider: TrackProvider;
  format: string;
  priority: number;
}

const FORMAT_PRIORITY: Record<string, number> = {
  FLAC: 3,
  OGG: 2,
  VORBIS: 2,
  MPEG: 1,
};

export function getProvider(track: AudioFile): TrackProvider {
  if (track.tidalId) return "tidal";
  if (track.youtubeId) return "youtube";
  return "unknown";
}

export function getFormat(track: AudioFile): string {
  return track.metadata?.format?.toUpperCase() ?? "UNKNOWN";
}

export function getFormatPriority(format: string): number {
  return FORMAT_PRIORITY[format.toUpperCase()] ?? 0;
}

export function getSourceInfoList(sources: AudioFile[]): TrackSourceInfo[] {
  return sources
    .map((track) => ({
      track,
      provider: getProvider(track),
      format: getFormat(track),
      priority: getFormatPriority(getFormat(track)),
    }))
    .sort((a, b) => b.priority - a.priority);
}

export function deduplicateByIsrc(tracks: AudioFile[]): {
  deduplicated: AudioFile[];
  sourcesByIsrc: Map<string, AudioFile[]>;
} {
  const sourcesByIsrc = new Map<string, AudioFile[]>();

  for (const track of tracks) {
    if (!track.isrc) continue;
    const existing = sourcesByIsrc.get(track.isrc);
    if (existing) {
      existing.push(track);
    } else {
      sourcesByIsrc.set(track.isrc, [track]);
    }
  }

  const primaryByIsrc = new Map<string, AudioFile>();
  for (const [isrc, sources] of sourcesByIsrc) {
    primaryByIsrc.set(isrc, sources.find((t) => t.tidalId) ?? sources[0]);
  }

  const placedIsrcs = new Set<string>();
  const deduplicated: AudioFile[] = [];

  for (const track of tracks) {
    if (!track.isrc) {
      deduplicated.push(track);
      continue;
    }
    if (placedIsrcs.has(track.isrc)) continue;
    placedIsrcs.add(track.isrc);
    deduplicated.push(primaryByIsrc.get(track.isrc)!);
  }

  return { deduplicated, sourcesByIsrc };
}

export async function resolvePlaybackSource(
  primaryTrack: AudioFile,
  allSources: AudioFile[],
): Promise<AudioFile> {
  if (allSources.length <= 1) return primaryTrack;

  for (const source of allSources) {
    if (await isTrackOffline(source.id)) return source;
  }

  const sorted = getSourceInfoList(allSources);
  return sorted[0]?.track ?? primaryTrack;
}

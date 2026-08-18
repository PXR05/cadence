import * as v from "valibot";
import {
  type RemoteProvider,
  type RemoteSearchResult,
  TidalSearchSourceSchema,
  YouTubeSearchSourceSchema,
} from "$lib/schemas";
import { backendRequest } from "../client";
import { backendConfig } from "../config";
import { requireBackendCapability } from "../capabilities";

type SearchSource = {
  title: string;
  artist: string;
  thumbnail: string;
  videoId?: string;
  trackId?: string;
};

export async function searchRemote(
  provider: RemoteProvider,
  query: string,
): Promise<RemoteSearchResult[]> {
  requireBackendCapability(`remoteProviders.${provider}.search`);
  const params = new URLSearchParams({ q: query });
  const response = await backendRequest(
    `${backendConfig.routes.audio.remoteSearch(provider)}?${params}`,
  );
  if (!response.ok) {
    throw new Error(`Failed to search ${provider}: ${await response.text()}`);
  }
  const source: SearchSource[] =
    provider === "youtube"
      ? v.parse(v.array(YouTubeSearchSourceSchema), await response.json())
      : v.parse(v.array(TidalSearchSourceSchema), await response.json());
  return source.map((item) => ({
    provider,
    providerItemId: provider === "youtube" ? item.videoId! : item.trackId!,
    title: item.title,
    artist: item.artist,
    thumbnail: item.thumbnail,
  }));
}


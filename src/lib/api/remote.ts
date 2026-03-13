import {
  type RemoteProvider,
  type RemoteSearchResult,
  TidalSearchSourceSchema,
  YouTubeSearchSourceSchema,
} from "$lib/schemas";
import { getRemoteSearchEndpoint } from "$lib/utils/remote";
import { authFetch } from "./fetch";
import * as v from "valibot";

type SearchSource = {
  title: string;
  artist: string;
  thumbnail: string;
  videoId?: string;
  trackId?: string;
};

function parseSearchSource(
  provider: RemoteProvider,
  data: unknown,
): SearchSource[] {
  if (provider === "youtube") {
    return v.parse(v.array(YouTubeSearchSourceSchema), data);
  }

  return v.parse(v.array(TidalSearchSourceSchema), data);
}

function mapToRemoteResults(
  provider: RemoteProvider,
  source: SearchSource[],
): RemoteSearchResult[] {
  return source.map((item) => ({
    provider,
    providerItemId: provider === "youtube" ? item.videoId! : item.trackId!,
    title: item.title,
    artist: item.artist,
    thumbnail: item.thumbnail,
  }));
}

export async function searchRemote(
  provider: RemoteProvider,
  query: string,
): Promise<RemoteSearchResult[]> {
  const params = new URLSearchParams({ q: query });

  const response = await authFetch(
    `${getRemoteSearchEndpoint(provider)}?${params}`,
  );

  if (!response.ok) {
    throw new Error(`Failed to search ${provider}: ${await response.text()}`);
  }

  const data = await response.json();
  const source = parseSearchSource(provider, data);
  return mapToRemoteResults(provider, source);
}

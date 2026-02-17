import {
  type YouTubeSearchResult,
  YouTubeSearchResultSchema,
} from "$lib/schemas/youtube";
import { authFetch } from "./fetch";
import * as v from "valibot";

export async function searchYoutube(
  query: string
): Promise<YouTubeSearchResult[]> {
  const params = new URLSearchParams({ q: query });

  const response = await authFetch(`/audio/search/youtube?${params}`);

  if (!response.ok) {
    throw new Error(`Failed to search YouTube: ${await response.text()}`);
  }

  const data = await response.json();
  return v.parse(v.array(YouTubeSearchResultSchema), data);
}

import { type YouTubeSearchResult } from "$lib/schemas/youtube";

export async function searchYoutube(query: string): Promise<YouTubeSearchResult[]> {
  const params = new URLSearchParams({ q: query });

  const response = await fetch(`/api/youtube/search?${params}`);

  if (!response.ok) {
    throw new Error(`Failed to search YouTube: ${await response.text()}`);
  }

  return response.json();
}


import { query } from "$app/server";
import * as v from "valibot";
import { type YouTubeSearchResult } from "$lib/schemas/youtube";

const schema = v.object({
  id: v.object({
    videoId: v.string(),
  }),
  snippet: v.object({
    channelTitle: v.string(),
    title: v.string(),
    thumbnails: v.object({
      medium: v.object({
        url: v.string(),
      }),
    }),
  }),
});

export const searchYoutube = query(v.string(), async (query) => {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY is not set");
  }

  const params = new URLSearchParams({
    part: "snippet",
    q: query,
    type: "video",
    videoCategoryId: "10",
    maxResults: "10",
    key: apiKey,
  });

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/search?${params}`,
  );

  if (!response.ok) {
    throw new Error(`Failed to search YouTube: ${await response.text()}`);
  }

  const data = await response.json();
  const validatedData = v.parse(v.array(schema), data.items);

  const results: YouTubeSearchResult[] = validatedData.map((item: any) => ({
    videoId: item.id.videoId,
    title: item.snippet.title,
    artist: item.snippet.channelTitle,
    thumbnail: item.snippet.thumbnails.medium.url,
  }));

  return results;
});

import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { YOUTUBE_API_KEY } from "$env/static/private";
import * as v from "valibot";

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

export const GET: RequestHandler = async ({ url }) => {
  const query = url.searchParams.get("q");

  if (!query) {
    throw error(400, "Missing search query parameter 'q'");
  }

  if (!YOUTUBE_API_KEY) {
    throw error(500, "YOUTUBE_API_KEY is not configured");
  }

  const params = new URLSearchParams({
    part: "snippet",
    q: query,
    type: "video",
    videoCategoryId: "10",
    maxResults: "10",
    key: YOUTUBE_API_KEY,
  });

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${params}`
    );

    if (!response.ok) {
      throw error(
        response.status,
        `YouTube API error: ${await response.text()}`
      );
    }

    const data = await response.json();
    const validatedData = v.parse(v.array(schema), data.items);

    const results = validatedData.map((item) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      artist: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails.medium.url,
    }));

    return json(results);
  } catch (err) {
    console.error("YouTube search error:", err);
    if (err && typeof err === "object" && "status" in err) {
      throw err;
    }
    throw error(500, "Failed to search YouTube");
  }
};

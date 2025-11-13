import * as v from "valibot";

export const YouTubeSearchResultSchema = v.object({
  videoId: v.string(),
  title: v.string(),
  artist: v.string(),
  thumbnail: v.string(),
});

export type YouTubeSearchResult = v.InferOutput<
  typeof YouTubeSearchResultSchema
>;

import * as v from "valibot";

export const RemoteProviderSchema = v.picklist(["youtube", "tidal"]);

export type RemoteProvider = v.InferOutput<typeof RemoteProviderSchema>;

export const RemoteCollectionKindSchema = v.picklist(["playlist", "album"]);

export type RemoteCollectionKind = v.InferOutput<
  typeof RemoteCollectionKindSchema
>;

const RemoteSearchSourceFields = {
  title: v.string(),
  artist: v.string(),
  thumbnail: v.string(),
};

export const YouTubeSearchSourceSchema = v.object({
  videoId: v.string(),
  ...RemoteSearchSourceFields,
});

export const TidalSearchSourceSchema = v.object({
  trackId: v.string(),
  ...RemoteSearchSourceFields,
});

export type YouTubeSearchSource = v.InferOutput<
  typeof YouTubeSearchSourceSchema
>;
export type TidalSearchSource = v.InferOutput<typeof TidalSearchSourceSchema>;

export const RemoteSearchResultSchema = v.object({
  provider: RemoteProviderSchema,
  providerItemId: v.string(),
  title: v.string(),
  artist: v.string(),
  thumbnail: v.string(),
});

export type RemoteSearchResult = v.InferOutput<typeof RemoteSearchResultSchema>;

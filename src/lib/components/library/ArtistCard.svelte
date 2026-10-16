<script lang="ts">
  import { page } from "$app/state";
  import { getTrackImageUrl } from "$lib/backend/services/media";
  import { playerStore } from "$lib/stores/player.svelte";
  import type { Artist } from "$lib/utils/artists";
  import { User as UserIcon, Volume2 as Volume2Icon } from "@lucide/svelte";
  import { Image } from "$lib/components/ui/image";
  import { appearanceStore } from "$lib/stores/appearance.svelte";

  interface Props {
    artist: Artist;
  }

  let { artist }: Props = $props();

  const href = $derived(`/playlist?id=artist_${encodeURIComponent(artist.name)}`);
  const isActive = $derived(
    page.url.pathname === "/playlist" &&
      page.url.searchParams.get("id") === `artist_${artist.name}`,
  );
  const isPlaying = $derived(
    playerStore.isPlaying &&
      playerStore.currentTrack?.metadata?.artist
        ?.toLowerCase()
        .includes(artist.name.toLowerCase()) &&
      playerStore.currentPlaylist?.id === `artist_${artist.name}`,
  );
</script>

<a
  {href}
  class="relative rounded-xl overflow-clip aspect-square bg-muted/50 hover:bg-muted/20 transition-colors flex flex-col w-full shrink-0"
>
  <div class="h-full overflow-hidden relative grid place-items-center">
    <div class="absolute inset-0 grid place-items-center pb-10">
      <UserIcon
        size={48}
        strokeWidth={2}
        absoluteStrokeWidth
        class="text-muted-foreground"
      />
    </div>
    {#if artist.coverTrackId}
      <Image
        loading="lazy"
        crossorigin="use-credentials"
        src={getTrackImageUrl(artist.coverTrackId)}
        alt={artist.name}
        class="w-full h-full object-cover relative z-10"
      />
    {/if}
  </div>
  <div class="absolute bottom-0 w-full z-10 p-1.5">
    <div
      class="flex items-center justify-between p-2 border border-muted-foreground/10 rounded-md
      {appearanceStore.disableBlur
        ? 'bg-muted'
        : 'bg-muted/80 dark:bg-muted/60 backdrop-blur-md'}"
    >
      <div class="flex flex-col truncate gap-0.5">
        <p class="text-sm font-medium truncate leading-tight flex-1">
          {artist.name}
        </p>
        <p class="text-xs leading-tight">
          {artist.trackCount} track{artist.trackCount === 1 ? "" : "s"}
        </p>
      </div>
      {#if isPlaying}
        <Volume2Icon
          strokeWidth={1.5}
          absoluteStrokeWidth
          class="size-5 shrink-0 ml-1 mr-0.5 {isActive
            ? 'text-background'
            : 'text-foreground'}"
        />
      {/if}
    </div>
  </div>
</a>

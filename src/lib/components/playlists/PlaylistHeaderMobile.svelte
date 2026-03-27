<script lang="ts">
  import PlaylistCoverImage from "$lib/components/playlists/PlaylistCoverImage.svelte";
  import { getPlaylistImageUrl } from "$lib/constants";
  import type { PlaylistDetail } from "$lib/schemas";
  import { appearanceStore } from "$lib/stores/appearance.svelte";
  import { isArtistPlaylist, isSpecialPlaylist } from "$lib/utils/playlist";
  import {
    ArrowLeftIcon,
    EllipsisIcon,
    PlayIcon,
    PlusIcon,
    ShuffleIcon,
  } from "@lucide/svelte";
  import { fade } from "svelte/transition";
  import { Button } from "../ui/button";

  interface Props {
    playlist: PlaylistDetail;
    isScrolled: boolean;
    onPlay: () => void;
    onMenu: (e: MouseEvent) => void;
    onShuffle: () => void;
    onAddTracks?: () => void;
  }

  let { playlist, isScrolled, onPlay, onMenu, onShuffle, onAddTracks }: Props =
    $props();

  const isArtist = $derived(isArtistPlaylist(playlist.id));
  const isSpecial = $derived(isSpecialPlaylist(playlist.id));

  const mainArtist = $derived.by(() => {
    if (isArtist || isSpecial) {
      return null;
    }
    const artistMap = new Map<string, number>();
    for (const item of playlist.items) {
      const rawArtist = item.audio.metadata?.artist?.trim();
      if (!rawArtist) continue;

      const artists = rawArtist
        .split(/[、,]/)
        .map((artist) => artist.trim())
        .filter(Boolean);

      const uniqueArtists = new Set(artists);

      for (const artist of uniqueArtists) {
        artistMap.set(artist, (artistMap.get(artist) || 0) + 1);
      }
    }

    if (artistMap.size === 0) {
      return "Unknown";
    }

    let main = "";
    let maxCount = 0;
    let topArtistCount = 0;

    for (const [artist, count] of artistMap) {
      if (count > maxCount) {
        main = artist;
        maxCount = count;
        topArtistCount = 1;
      } else if (count === maxCount) {
        topArtistCount += 1;
      }
    }

    if (topArtistCount > 1) {
      return "Various Artists";
    }

    return main;
  });
</script>

<div
  class="fixed top-2 left-2 right-2 flex items-center justify-between rounded-4xl p-2 z-30
  {!isScrolled
    ? 'border-transparent'
    : appearanceStore.disableBlur
      ? 'bg-muted'
      : 'bg-muted-foreground/10 dark:bg-muted/70 backdrop-blur-md'}
  "
>
  <Button
    variant="ghost"
    size="icon"
    class="rounded-lg size-11"
    title="Back"
    onclick={() => history.back()}
  >
    <ArrowLeftIcon class="size-5" />
  </Button>

  {#if isScrolled}
    <button
      onclick={(e) => {
        const thisButton = e.currentTarget;
        const upTwoLevels = thisButton.parentElement?.parentElement;
        if (upTwoLevels) {
          upTwoLevels.scrollIntoView({ behavior: "smooth" });
        }
      }}
     class="text-lg font-semibold truncate max-w-[50%] text-center">
      {playlist.name}
    </button>
  {/if}

  <Button
    variant="ghost"
    size="icon"
    class="rounded-lg size-11"
    title="Menu"
    onclick={onMenu}
  >
    <EllipsisIcon class="size-5" />
  </Button>
</div>

<img
  loading="lazy"
  crossorigin="use-credentials"
  src={isArtist ? playlist.coverImage : getPlaylistImageUrl(playlist.id)}
  alt={playlist.name}
  class="-z-1 absolute inset-0 -top-24 w-dvw h-full max-h-[55dvh] object-cover text-transparent brightness-125 dark:brightness-60 blur-2xl scale-125 pointer-events-none"
/>

<div
  class="absolute inset-0 pointer-events-none"
  style="
      background: linear-gradient(
        to bottom,
        color-mix(in oklab, var(--background) 30%, transparent) 0%,
        color-mix(in oklab, var(--background) 0%, transparent) 50%,
        color-mix(in oklab, var(--background) 0%, transparent) 100%
      );
      "
></div>

<div class="w-full flex flex-col items-center gap-4 truncate pb-2 pt-18">
  {#key playlist.coverImage}
    <PlaylistCoverImage
      {playlist}
      iconSize={64}
      youtubeIconSize={48}
      containerClass="shrink-0 overflow-hidden bg-muted relative grid place-items-center rounded-xl"
      imageClass="object-cover relative z-10 size-[calc(60dvh-236px)]"
    />
  {/key}

  <div class="px-6 w-full text-center flex flex-col items-center gap-0.5">
    <div
      class="flex items-center justify-center gap-2 w-full overflow-x-scroll hide-scrollbar px-3"
      style="
        scroll-padding-inline: 1rem;
        -webkit-mask-image: linear-gradient(to right, transparent 0%, black 0.75rem, black calc(100% - 0.75rem), transparent 100%);
        mask-image: linear-gradient(to right, transparent 0%, black 0.75rem, black calc(100% - 0.75rem), transparent 100%);
        -webkit-mask-repeat: no-repeat;
        mask-repeat: no-repeat;
      "
    >
      <h1 class="font-semibold text-2xl w-full">
        {playlist.name}
      </h1>
    </div>

    {#if mainArtist}
      <a
        href={mainArtist === "Various Artists"
          ? ""
          : `/playlist?id=artist_${mainArtist}`}
      >
        {mainArtist}
      </a>
    {/if}

    <p class="text-sm text-muted-foreground">
      {playlist.items.length} tracks
    </p>
  </div>

  <div class="w-full flex justify-center gap-2">
    <Button
      size="icon"
      onclick={onShuffle}
      disabled={playlist.items.length === 0}
      class="font-medium size-10 rounded-full bg-muted-foreground/20 text-foreground transition-colors hover:bg-muted-foreground/10 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <ShuffleIcon size={16} />
    </Button>
    <Button
      onclick={onPlay}
      disabled={playlist.items.length === 0}
      class="font-medium h-10 rounded-full bg-foreground text-primary-foreground transition-colors hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 px-8 justify-center text-sm"
    >
      <PlayIcon size={16} fill="currentColor" />
      Play
    </Button>
    <Button
      size="icon"
      onclick={onAddTracks}
      disabled={onAddTracks === undefined}
      class="font-medium size-10 rounded-full bg-muted-foreground/20 text-foreground transition-colors hover:bg-muted-foreground/10"
    >
      <PlusIcon size={16} />
    </Button>
  </div>
</div>

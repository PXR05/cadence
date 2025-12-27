<script lang="ts">
  import { goto, invalidateAll } from "$app/navigation";
  import { useDialogState, usePlaylistOffline } from "$lib/hooks";
  import type { PlaylistDetail } from "$lib/schemas";
  import { getPlaylistImageUrl } from "$lib/constants";
  import { playerStore } from "$lib/stores/player.svelte";
  import { playlistMenuStore } from "$lib/stores/playlistMenu.svelte";
  import { playlistsStore } from "$lib/stores/playlists.svelte";
  import {
    isAlbumPlaylist,
    isArtistPlaylist,
    isSpecialPlaylist,
    isYoutubePlaylist,
    SPECIAL_PLAYLIST_IDS,
  } from "$lib/utils/playlist";
  import {
    ArrowLeft,
    CloudCheckIcon,
    Disc3Icon,
    EllipsisIcon,
    LibraryIcon,
    MusicIcon,
    PlayIcon,
    UserIcon,
    YoutubeIcon,
  } from "@lucide/svelte";
  import { Button } from "../ui/button";
  import EditPlaylistDialog from "./EditPlaylistDialog.svelte";
  import { appearanceStore } from "$lib/stores/appearance.svelte";
  import { fade, fly, slide } from "svelte/transition";
  import { vaulEase } from "$lib/utils";

  interface Props {
    playlist: PlaylistDetail;
    isScrolled: boolean;
  }

  let { playlist, isScrolled }: Props = $props();

  const playlistId = $derived(playlist.id);
  const editDialog = useDialogState("edit-playlist");
  const offline = usePlaylistOffline(() => playlistId);

  const isNonModifiable = $derived(
    isSpecialPlaylist(playlist.id) ||
      isArtistPlaylist(playlist.id) ||
      isAlbumPlaylist(playlist.id)
  );

  $effect(() => {
    offline.checkOfflineStatus();
  });

  function handlePlay() {
    if (playlist.items.length === 0) return;
    const tracks = playlist.items.map((item) => item.audio);
    playerStore.setQueue(tracks, 0);
  }

  async function handlePlaylistUpdated() {
    await playlistsStore.invalidatePlaylistDetail(playlistId);
    playlistsStore.invalidate();
    invalidateAll();
  }

  async function handlePlaylistDeleted() {
    await playlistsStore.invalidatePlaylist(playlistId);
    playlistsStore.invalidate();
    goto("/library", { replaceState: true });
  }

  function handleMenu(e: MouseEvent) {
    e.preventDefault();
    playlistMenuStore.open(
      {
        id: playlist.id,
        name: playlist.name,
        userId: playlist.userId,
        createdAt: playlist.createdAt,
        updatedAt: playlist.updatedAt,
        coverImage: playlist.coverImage,
        itemCount: playlist.items.length,
      },
      offline.isOffline,
      offline.isDownloading,
      () => invalidateAll(),
      () => goto("/library", { replaceState: true })
    );
  }
</script>

<div class="grid grid-cols-1 grid-rows-1">
  {#if isScrolled}
    <div
      in:fly={{
        y: -50,
        duration: appearanceStore.disableAnimations ? 0 : 200,
        easing: vaulEase,
        delay: appearanceStore.disableAnimations ? 0 : 150,
      }}
      out:fly={{
        y: -50,
        duration: appearanceStore.disableAnimations ? 0 : 200,
        easing: vaulEase,
      }}
      class="row-start-1 col-start-1 h-fit flex items-center rounded-xl border relative w-full gap-2
      {appearanceStore.disableBlur
        ? 'bg-muted border-input/15 p-2'
        : 'bg-muted-foreground/10 dark:bg-muted/50 backdrop-blur-md border-input/15 p-2'}"
    >
      <Button
        variant="ghost"
        size="icon"
        class="size-9"
        title="Back"
        onclick={() => history.back()}
      >
        <ArrowLeft />
      </Button>

      <div class="flex-1 flex items-center gap-2 truncate">
        <h1 class="truncate font-semibold text-2xl">
          {playlist.name}
        </h1>
        {#if offline.isOffline}
          <CloudCheckIcon size={20} class="shrink-0 text-primary" />
        {/if}
      </div>

      <Button
        onclick={handlePlay}
        disabled={playlist.items.length === 0}
        class="w-fit border bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 px-6 text-sm"
      >
        <PlayIcon size={16} />
        Play
      </Button>
    </div>
  {:else}
    <div
      in:fly={{
        y: -160,
        duration: appearanceStore.disableAnimations ? 0 : 200,
        easing: vaulEase,
        delay: appearanceStore.disableAnimations ? 0 : 150,
      }}
      out:fly={{
        y: -160,
        duration: appearanceStore.disableAnimations ? 0 : 200,
        easing: vaulEase,
      }}
      class="row-start-1 col-start-1 flex-1 flex items-end rounded-xl"
    >
      <div
        class="border shrink-0 overflow-hidden bg-muted relative grid place-items-center rounded-xl size-40 md:size-64"
      >
        <div class="absolute inset-0 grid place-items-center">
          {#if isSpecialPlaylist(playlist.id)}
            {#if playlist.id === SPECIAL_PLAYLIST_IDS.ALL_SONGS}
              <LibraryIcon
                size={64}
                absoluteStrokeWidth
                strokeWidth={2}
                class="text-muted-foreground"
              />
            {:else if playlist.id === SPECIAL_PLAYLIST_IDS.DOWNLOADED}
              <CloudCheckIcon
                size={64}
                absoluteStrokeWidth
                strokeWidth={2}
                class="text-muted-foreground"
              />
            {/if}
          {:else if isArtistPlaylist(playlist.id)}
            <UserIcon
              size={64}
              absoluteStrokeWidth
              strokeWidth={2}
              class="text-muted-foreground"
            />
          {:else if isAlbumPlaylist(playlist.id)}
            <Disc3Icon
              size={64}
              absoluteStrokeWidth
              strokeWidth={2}
              class="text-muted-foreground"
            />
          {:else if isYoutubePlaylist(playlist.id)}
            <YoutubeIcon
              size={48}
              absoluteStrokeWidth
              strokeWidth={2}
              class="text-muted-foreground"
            />
          {:else}
            <MusicIcon
              size={64}
              absoluteStrokeWidth
              strokeWidth={2}
              class="text-muted-foreground"
            />
          {/if}
        </div>
        {#key playlist.coverImage}
          {#if playlist.coverImage}
            <img
              loading="lazy"
              crossorigin="use-credentials"
              src={getPlaylistImageUrl(playlist.id)}
              alt={playlist.name}
              class="w-full h-full object-cover relative z-10"
            />
          {/if}
        {/key}
      </div>

      <div class="w-full flex flex-col gap-2 truncate h-40 md:h-64 ml-2">
        <Button
          variant="outline"
          size="icon"
          class="size-10 mb-auto md:opacity-0 md:pointer-events-none"
          title="Back"
          onclick={() => history.back()}
        >
          <ArrowLeft />
        </Button>

        <div class="flex max-md:flex-col gap-2 truncate md:items-end">
          <div class="shrink truncate">
            <p class="text-sm text-muted-foreground h-5">
              {playlist.items.length} tracks
            </p>

            <div class="flex items-center gap-2 truncate">
              <h1 class="truncate font-semibold text-2xl md:text-4xl">
                {playlist.name}
              </h1>
              {#if offline.isOffline}
                <CloudCheckIcon size={20} class="shrink-0 text-primary" />
              {/if}
            </div>
          </div>

          <Button
            onclick={handlePlay}
            disabled={playlist.items.length === 0}
            class="md:ml-auto border bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 px-6 max-sm:w-full max-md:justify-center max-md:text-sm"
          >
            <PlayIcon size={16} />
            Play
          </Button>
        </div>
      </div>
    </div>
    <div class="top-1.5 md:top-2 right-1.5 md:right-2 absolute z-10">
      <Button
        variant="ghost"
        size="icon"
        class="md:p-2 bg-background"
        onclick={handleMenu}
      >
        <EllipsisIcon size={20} />
      </Button>
    </div>
  {/if}
</div>

{#if !isNonModifiable}
  <EditPlaylistDialog
    open={editDialog.isOpen}
    onOpenChange={(open) => !open && editDialog.close()}
    {playlist}
    onUpdated={handlePlaylistUpdated}
    onDeleted={handlePlaylistDeleted}
  />
{/if}

<script lang="ts">
  import { goto, invalidateAll } from "$app/navigation";
  import { useDialogState, usePlaylistOffline } from "$lib/hooks";
  import type { PlaylistDetail } from "$lib/schemas";
  import { getPlaylistImageUrl, playerStore } from "$lib/stores/player.svelte";
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
      isAlbumPlaylist(playlist.id),
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
    await playlistsStore.invalidatePlaylistDetail(playlistId);
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
      () => goto("/library", { replaceState: true }),
    );
  }
</script>

<div
  class="flex-1 flex items-end rounded-xl border transition-all duration-200
  {isScrolled
    ? 'bg-muted-foreground/10 dark:bg-muted/50 backdrop-blur-md border-input/15 p-2'
    : 'border-transparent'}"
>
  <div
    class="border flex-shrink-0 overflow-hidden bg-muted relative grid place-items-center rounded-xl transition-all duration-200
    {isScrolled ? 'size-0' : 'size-40 md:size-64'}"
    style="transform: scale({isScrolled ? 0 : 1});
    opacity: {isScrolled ? 0 : 1};"
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
    {#if playlist.coverImage}
      <img
        loading="lazy"
        src={getPlaylistImageUrl(playlist.id)}
        alt={playlist.name}
        class="w-full h-full object-cover relative z-10"
      />
    {/if}
  </div>

  <div
    class="relative w-full flex justify-between sm:items-end gap-2 truncate transition-all duration-200
    {isScrolled ? 'flex-row items-center h-9' : 'h-40 md:h-64 ml-2'}"
  >
    <Button
      variant={isScrolled ? "ghost" : "outline"}
      size="icon"
      class="absolute top-0 left-0 {isScrolled ? 'size-9' : 'size-10'}"
      title="Back"
      onclick={() => history.back()}
    >
      <ArrowLeft />
    </Button>

    <div
      class="flex flex-col truncate h-full justify-end transition-all duration-200 sm:pr-28
      {isScrolled ? 'pr-28' : 'max-sm:pb-10'}"
    >
      <p
        class="text-sm text-muted-foreground transition-all duration-200
        {isScrolled ? 'opacity-0 h-0' : 'h-5'}"
      >
        {playlist.items.length} tracks
      </p>
      <div
        class="flex items-center gap-2 truncate transition-all duration-200
        {isScrolled ? 'pl-10 mb-0.5' : ''}"
      >
        <h1 class="truncate font-semibold text-2xl">
          {playlist.name}
        </h1>
        {#if offline.isOffline}
          <CloudCheckIcon size={20} class="flex-shrink-0 text-primary" />
        {/if}
      </div>
    </div>

    <div
      class="flex gap-2 absolute bottom-0 right-0 transition-all duration-200 origin-right
      {isScrolled ? 'max-sm:w-[100px]' : 'max-sm:w-[calc(100dvw-11.4rem)]'}"
    >
      <Button
        onclick={handlePlay}
        disabled={playlist.items.length === 0}
        class="w-full border bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 px-6
        {isScrolled
          ? 'text-sm'
          : 'max-sm:w-full max-md:justify-center max-md:text-sm'}"
      >
        <PlayIcon size={16} />
        Play
      </Button>
    </div>
  </div>
</div>

<div
  class="top-1.5 md:top-2 right-1.5 md:right-2 absolute z-10"
  style="will-change: transform, opacity;
  transform: scale({isScrolled ? 0.8 : 1});
  opacity: {isScrolled ? 0 : 1};
  {isScrolled ? 'pointer-events: none;' : ''}"
>
  <Button
    variant="ghost"
    size="icon"
    class="md:p-2 bg-background"
    onclick={handleMenu}
  >
    <EllipsisIcon size={20} />
  </Button>
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

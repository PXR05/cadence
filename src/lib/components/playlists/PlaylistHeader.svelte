<script lang="ts">
  import { goto, invalidateAll } from "$app/navigation";
  import { playerStore, getPlaylistImageUrl } from "$lib/stores/player.svelte";
  import { navigationStore } from "$lib/stores/navigation.svelte";
  import { playlistsStore } from "$lib/stores/playlists.svelte";
  import { useDialogState, usePlaylistOffline } from "$lib/hooks";
  import {
    getPlaylistDisplayName,
    isArtistPlaylist,
    isAlbumPlaylist,
    isSpecialPlaylist,
    SPECIAL_PLAYLIST_IDS,
    isYoutubePlaylist,
  } from "$lib/utils/playlist";
  import {
    PlayIcon,
    EllipsisIcon,
    MusicIcon,
    Disc3Icon,
    UserIcon,
    CloudDownloadIcon,
    CloudCheckIcon,
    PencilIcon,
    LibraryIcon,
    ArrowLeft,
    CloudOffIcon,
    YoutubeIcon,
    RefreshCwIcon,
  } from "@lucide/svelte";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { Button } from "../ui/button";
  import EditPlaylistDialog from "./EditPlaylistDialog.svelte";
  import { youtubeDownloadStore } from "$lib/stores/youtubeDownload.svelte";
  import { toast } from "svelte-sonner";
  import type { Playlist, PlaylistDetail } from "$lib/schemas";

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

  async function handlePlaylistUpdated(updated: {
    name: string;
    coverImage?: string;
  }) {
    navigationStore.setNavigation(
      [{ label: "Library", path: "/library" }],
      getPlaylistDisplayName({ name: updated.name } as Playlist),
    );
    await playlistsStore.invalidatePlaylistDetail(playlistId);
    playlistsStore.invalidate();
    invalidateAll();
  }

  async function handlePlaylistDeleted() {
    await playlistsStore.invalidatePlaylistDetail(playlistId);
    playlistsStore.invalidate();
    goto("/library", { replaceState: true });
  }

  async function handlePlaylistResync() {
    try {
      await youtubeDownloadStore.downloadFromUrl(
        `https://music.youtube.com/playlist?list=${playlistId.replace("youtube_", "")}`,
      );
      toast.success("Resynced from YouTube");
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to download from YouTube";
      toast.error(errorMessage);
    }
  }
</script>

<div
  class="flex-1 flex items-end rounded-xl border transition-all duration-200
  {isScrolled
    ? 'bg-muted/50 backdrop-blur-md border-input p-2'
    : 'border-transparent'}"
>
  <div
    class="border flex-shrink-0 overflow-hidden bg-muted relative grid place-items-center rounded-xl transition-all duration-200
    {isScrolled ? 'size-0' : 'size-40 md:size-48'}"
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
    {isScrolled ? 'flex-row items-center h-9' : 'h-40 md:h-48 ml-2'}"
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
      class="flex flex-col truncate h-full justify-end transition-all duration-200
      {isScrolled ? '' : 'max-sm:pb-10'}"
    >
      <h1
        class="flex items-center gap-2 font-semibold truncate transition-all duration-200 text-2xl
        {isScrolled ? 'pl-10 mb-0.5' : ''}"
      >
        {playlist.name}
        {#if offline.isOffline}
          <CloudCheckIcon
            size={isScrolled ? 16 : 20}
            class="flex-shrink-0 text-primary"
          />
        {/if}
      </h1>
      <p
        class="text-sm text-muted-foreground transition-all duration-200
        {isScrolled ? 'opacity-0 h-0' : 'h-5'}"
      >
        {playlist.items.length} tracks
      </p>
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
  class="top-1.5 md:top-2 right-1.5 md:right-2 absolute z-10 transition-all duration-200
  {isScrolled ? 'pointer-events-none' : ''}"
  style="transform: scale({isScrolled ? 0.8 : 1});
  opacity: {isScrolled ? 0 : 1};"
>
  <DropdownMenu.Root>
    <DropdownMenu.Trigger>
      <Button
        variant="ghost"
        size="icon"
        class="md:p-2 bg-background"
        title="Playlist options"
      >
        <EllipsisIcon size={20} />
      </Button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content align="end">
      {#if !isNonModifiable}
        <DropdownMenu.Item
          disabled={isNonModifiable}
          onclick={() => editDialog.open()}
        >
          <PencilIcon size={16} class="mr-2" />
          Edit Playlist
        </DropdownMenu.Item>
        <DropdownMenu.Separator />
      {/if}

      <!-- <DropdownMenu.Item
        onclick={() => offline.downloadPlaylist(playlist)}
        disabled={offline.isDownloading || playlist.items.length === 0}
      >
        <DownloadIcon size={16} class="mr-2" />
        Download as ZIP
      </DropdownMenu.Item> -->

      {#if isYoutubePlaylist(playlist.id)}
        <DropdownMenu.Item
          onclick={() => handlePlaylistResync()}
          disabled={playlist.items.length === 0}
        >
          <RefreshCwIcon size={16} class="mr-2" />
          Resync Playlist
        </DropdownMenu.Item>
      {/if}

      {#if offline.isOffline || playlist.id === SPECIAL_PLAYLIST_IDS.DOWNLOADED}
        <DropdownMenu.Item
          onclick={() => offline.removeOffline()}
          disabled={offline.isDownloading}
        >
          <CloudOffIcon size={16} class="mr-2" />
          Remove Offline
        </DropdownMenu.Item>
      {:else}
        <DropdownMenu.Item
          onclick={() => offline.makeOffline(playlist)}
          disabled={offline.isDownloading || playlist.items.length === 0}
        >
          <CloudDownloadIcon size={16} class="mr-2" />
          Make Offline
        </DropdownMenu.Item>
      {/if}
    </DropdownMenu.Content>
  </DropdownMenu.Root>
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

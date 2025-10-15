<script lang="ts">
  import { getPlaylistImageUrl } from "$lib/stores/player.svelte";
  import {
    handlePlaylistImageError,
    isArtistPlaylist,
    isAlbumPlaylist,
  } from "$lib/utils/playlist";
  import {
    PlayIcon,
    ShuffleIcon,
    EllipsisIcon,
    MusicIcon,
    Disc3Icon,
    UserIcon,
    DownloadIcon,
    CloudDownloadIcon,
    CheckCircleIcon,
    CloudCheckIcon,
    PencilIcon,
    LibraryIcon,
  } from "@lucide/svelte";
  import { isSpecialPlaylist, SPECIAL_PLAYLIST_IDS } from "$lib/utils/playlist";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";

  interface Props {
    playlist: PlaylistDetail;
    isOffline: boolean;
    isDownloading: boolean;
    isNonModifiable: boolean;
    onPlay: () => void;
    onShuffle: () => void;
    onEdit: () => void;
    onDownload: () => void;
    onMakeOffline: () => void;
    onRemoveOffline: () => void;
  }

  let {
    playlist,
    isOffline,
    isDownloading,
    isNonModifiable,
    onPlay,
    onShuffle,
    onEdit,
    onDownload,
    onMakeOffline,
    onRemoveOffline,
  }: Props = $props();
</script>

<div class="border-b p-4 flex max-md:flex-col gap-4 items-end relative">
  <div class="flex-1 min-w-0 flex max-md:w-full items-end gap-4">
    <div
      class="size-36 sm:size-40 md:size-48 border max-md:mx-auto flex-shrink-0 overflow-hidden bg-muted grid place-items-center"
    >
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
      {:else if playlist.coverImage}
        <img
          loading="lazy"
          src={getPlaylistImageUrl(playlist.id)}
          alt={playlist.name}
          class="w-full h-full object-cover"
          onerror={handlePlaylistImageError}
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

    <div
      class="flex max-md:flex-col justify-between gap-2 md:items-end w-full truncate"
    >
      <div class="flex-1 truncate">
        <div class="flex items-center gap-2 truncate">
          <h1 class="text-2xl font-semibold truncate">{playlist.name}</h1>
          {#if isOffline}
            <CloudCheckIcon size={20} class="flex-shrink-0" />
          {/if}
        </div>
        <p class="text-sm text-muted-foreground">
          {playlist.items.length} tracks
        </p>
      </div>

      <div class="flex max-sm:flex-col max-md:w-full gap-2 flex-shrink-0">
        <button
          onclick={onPlay}
          disabled={playlist.items.length === 0}
          class="max-md:w-full px-4 py-2 border bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center max-md:justify-center gap-2 max-md:text-sm"
        >
          <PlayIcon size={16} />
          Play
        </button>
        <button
          onclick={onShuffle}
          disabled={playlist.items.length === 0}
          class="max-md:w-full px-4 py-2 border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center max-md:justify-center gap-2 max-md:text-sm"
        >
          <ShuffleIcon size={16} />
          Shuffle
        </button>
      </div>
    </div>
  </div>

  <div class="fixed top-px right-px md:absolute md:top-4 md:right-4 z-10">
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <button
          class="p-3.5 md:p-2 bg-background hover:bg-muted transition-colors md:border"
          title="Playlist options"
        >
          <EllipsisIcon size={20} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end">
        {#if !isNonModifiable}
          <DropdownMenu.Item onclick={onEdit}>
            <PencilIcon size={16} class="mr-2" />
            Edit Playlist
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
        {/if}
        <DropdownMenu.Item
          onclick={onDownload}
          disabled={isDownloading || playlist.items.length === 0}
        >
          <DownloadIcon size={16} class="mr-2" />
          Download as ZIP
        </DropdownMenu.Item>
        {#if isOffline}
          <DropdownMenu.Item onclick={onRemoveOffline} disabled={isDownloading}>
            <CheckCircleIcon size={16} class="mr-2" />
            Remove Offline
          </DropdownMenu.Item>
        {:else}
          <DropdownMenu.Item
            onclick={onMakeOffline}
            disabled={isDownloading || playlist.items.length === 0}
          >
            <CloudDownloadIcon size={16} class="mr-2" />
            Make Available Offline
          </DropdownMenu.Item>
        {/if}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </div>
</div>

<script lang="ts">
  import { getPlaylistImageUrl } from "$lib/stores/player.svelte";
  import { isArtistPlaylist, isAlbumPlaylist } from "$lib/utils/playlist";
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
  import { Button } from "../ui/button";

  interface Props {
    playlist: PlaylistDetail;
    isScrolled: boolean;
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
    isScrolled,
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

<div
  class="pb-0 flex items-end relative
  {isScrolled ? '' : 'max-md:flex-col'}"
>
  <div
    class="flex-1 min-w-0 flex items-end transition-all duration-150
    {isScrolled
      ? 'flex-row bg-muted/50 rounded-xl p-2 backdrop-blur-md border border-input'
      : 'max-md:w-full'}"
  >
    <div
      class="border flex-shrink-0 overflow-hidden bg-muted relative grid place-items-center rounded-xl
      {isScrolled ? 'h-9 w-0 opacity-0 p-0' : 'size-40 md:size-48 mr-3'}"
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
      class="flex justify-between gap-2 w-full truncate
      {isScrolled ? 'flex-row items-center' : 'max-md:flex-col md:items-end'}"
    >
      <div class="flex-1 truncate">
        <div class="flex items-center gap-2 truncate">
          <h1
            class="font-semibold truncate transition-all duration-150
            {isScrolled ? 'text-lg pl-2' : 'text-2xl'}"
          >
            {playlist.name}
          </h1>
          {#if isOffline}
            <CloudCheckIcon size={isScrolled ? 16 : 20} class="flex-shrink-0" />
          {/if}
        </div>
        <p
          class="text-sm text-muted-foreground transition-all duration-150
          {isScrolled ? 'opacity-0 h-0' : 'h-5'}"
        >
          {playlist.items.length} tracks
        </p>
      </div>

      <div class="flex gap-2 flex-shrink-0">
        <Button
          onclick={onPlay}
          disabled={playlist.items.length === 0}
          class="border bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 px-6 sm:px-4 py-2 
          {isScrolled
            ? 'text-sm'
            : 'max-sm:w-full max-md:justify-center max-md:text-sm'}"
        >
          <PlayIcon size={16} />
          Play
        </Button>
        <!-- <Button
          variant="outline"
          onclick={onShuffle}
          disabled={playlist.items.length === 0}
          class="px-6 sm:px-4 py-2 border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center max-md:justify-center gap-2 max-md:text-sm"
        >
          <ShuffleIcon size={16} />
          <span class="max-sm:hidden"> Shuffle </span>
        </Button> -->
      </div>
    </div>
  </div>

  <div
    class="top-3 right-3 absolute z-10
    {isScrolled ? 'opacity-0 pointer-events-none' : ''}"
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

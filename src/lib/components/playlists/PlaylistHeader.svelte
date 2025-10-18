<script lang="ts">
  import { getPlaylistImageUrl } from "$lib/stores/player.svelte";
  import { isArtistPlaylist, isAlbumPlaylist } from "$lib/utils/playlist";
  import {
    PlayIcon,
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
    ArrowLeft,
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
    onEdit,
    onDownload,
    onMakeOffline,
    onRemoveOffline,
  }: Props = $props();
</script>

<div
  class="flex-1 flex items-end transition-all duration-200
  {isScrolled
    ? 'flex-row bg-muted/50 rounded-xl p-2 backdrop-blur-md border border-input'
    : 'max-md:w-full'}"
>
  <div
    class="border flex-shrink-0 overflow-hidden bg-muted relative grid place-items-center rounded-xl transition-all duration-200
    {isScrolled ? 'h-9 w-0 opacity-0' : 'size-40 md:size-48 mr-2'}"
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
    class="relative w-full flex sm:justify-between sm:items-end gap-2 truncate transition-all duration-200
    {isScrolled
      ? 'flex-row items-center h-9 justify-between'
      : 'h-40 md:h-48 max-sm:flex-col justify-end'}"
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

    <div class="truncate">
      <h1
        class="flex items-center gap-2 font-semibold truncate transition-all duration-200 text-2xl
        {isScrolled ? 'pl-10' : ''}"
      >
        {playlist.name}
        {#if isOffline}
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

    <div class="flex gap-2 flex-shrink-0">
      <Button
        onclick={onPlay}
        disabled={playlist.items.length === 0}
        class="border bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 px-6
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

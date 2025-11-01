<script lang="ts">
  // import { getStreamUrl } from "$lib/stores/player.svelte";
  import { playerStore } from "$lib/stores/player.svelte";
  // import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import {
    ChevronDown,
    // DownloadIcon,
    // EllipsisIcon,
    // ListMusicIcon,
  } from "@lucide/svelte";
  import PlayerDetails from "./PlayerDetails.svelte";
  import { ManagePlaylistsDialog } from "../playlists";

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onQueueOpen: () => void;
    onTouchStart?: (e: TouchEvent) => void;
    onTouchMove?: (e: TouchEvent) => void;
    onTouchEnd?: (e: TouchEvent) => void;
    onMouseDown?: (e: MouseEvent) => void;
  }

  let {
    open = $bindable(),
    onOpenChange,
    onQueueOpen,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onMouseDown,
  }: Props = $props();

  const track = $derived(playerStore.currentTrack);
  const title = $derived(track?.metadata?.title ?? track?.filename ?? "");

  let managePlaylistsDialogOpen = $state(false);

  // function handleDownload() {
  //   if (track) {
  //     const downloadUrl = getStreamUrl(track.id);
  //     const link = document.createElement("a");
  //     link.href = downloadUrl;
  //     document.body.appendChild(link);
  //     link.click();
  //     document.body.removeChild(link);
  //   }
  // }

  function handleClose() {
    onOpenChange(false);
  }
</script>

<div
  role="dialog"
  tabindex="0"
  class="relative h-dvh flex flex-col cursor-grab active:cursor-grabbing"
  style="
    background: linear-gradient(
      to top,
      color-mix(in oklab, {playerStore.trackColor} 10%, var(--background)) 0%,
      var(--background) 50%,
      color-mix(in oklab, {playerStore.trackColor} 10%, var(--background)) 100%
    );
    "
  ontouchstart={onTouchStart}
  ontouchmove={onTouchMove}
  ontouchend={onTouchEnd}
  onmousedown={onMouseDown}
>
  <div class="flex justify-between items-center p-6">
    <button
      onclick={handleClose}
      class="opacity-70 transition-opacity hover:opacity-100 cursor-pointer"
      aria-label="Close player details"
    >
      <ChevronDown />
    </button>
    <!-- <DropdownMenu.Root>
      <DropdownMenu.Trigger
        class="opacity-70 transition-opacity hover:opacity-100"
      >
        <EllipsisIcon />
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Item onclick={() => (managePlaylistsDialogOpen = true)}>
          <ListMusicIcon size={16} class="mr-2" />
          Add to Playlist
        </DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item onclick={handleDownload}>
          <DownloadIcon size={16} class="mr-2" />
          Download
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root> -->
  </div>

  {#if track}
    <PlayerDetails {open} {track} {onQueueOpen} />
  {/if}
</div>

{#if track}
  <ManagePlaylistsDialog
    open={managePlaylistsDialogOpen}
    onOpenChange={(open) => (managePlaylistsDialogOpen = open)}
    trackId={track.id}
    trackTitle={title}
  />
{/if}

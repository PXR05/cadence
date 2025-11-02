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
  import { onMount } from "svelte";
  import { Button } from "../ui/button";

  interface Props {
    onOpenChange: (open: boolean) => void;
    onQueueOpen: () => void;
    onTouchStart?: (e: TouchEvent) => void;
    onTouchMove?: (e: TouchEvent) => void;
    onTouchEnd?: (e: TouchEvent) => void;
    onMouseDown?: (e: MouseEvent) => void;
  }

  let {
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
  let panelElement: HTMLDivElement | null = $state(null);

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

  onMount(() => {
    if (panelElement) {
      const handleTouchStart = (e: TouchEvent) => {
        onTouchStart?.(e);
      };

      const handleTouchMove = (e: TouchEvent) => {
        onTouchMove?.(e);
      };

      panelElement.addEventListener("touchstart", handleTouchStart, {
        passive: false,
      });
      panelElement.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });

      return () => {
        panelElement?.removeEventListener("touchstart", handleTouchStart);
        panelElement?.removeEventListener("touchmove", handleTouchMove);
      };
    }
  });
</script>

<div
  bind:this={panelElement}
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
    touch-action: none;
    overscroll-behavior: none;
    "
  ontouchend={onTouchEnd}
  onmousedown={onMouseDown}
>
  <div class="flex justify-between items-center p-6">
    <Button
      size="icon"
      variant="ghost"
      onclick={handleClose}
      class="opacity-70 transition-opacity hover:opacity-100 cursor-pointer"
      aria-label="Close player details"
    >
      <ChevronDown class="size-6" />
    </Button>
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
    <PlayerDetails {track} {onQueueOpen} />
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

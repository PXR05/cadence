<script lang="ts">
  import { getStreamUrl } from "$lib/stores/player.svelte";
  import { playerStore } from "$lib/stores/player.svelte";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import {
    ChevronDown,
    CloudDownloadIcon,
    CloudOffIcon,
    DownloadIcon,
    EllipsisIcon,
    ListMusicIcon,
  } from "@lucide/svelte";
  import PlayerDetails from "./PlayerDetails.svelte";
  import { ManagePlaylistsDialog } from "../playlists";
  import { onMount } from "svelte";
  import { Button } from "../ui/button";
  import { downloadStore } from "$lib/stores/download.svelte";

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
  let dropdownOpen = $state(false);

  function handleDownload() {
    if (track) {
      const downloadUrl = getStreamUrl(track.id);
      const link = document.createElement("a");
      link.href = downloadUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  let isOffline = $state(false);

  async function handleToggleOffline() {
    if (!track) return;
    if (isOffline) {
      await downloadStore.removeTrackOffline(track.id);
    } else {
      await downloadStore.makeTrackOffline(
        track.id,
        {
          title: track.metadata?.title,
          artist: track.metadata?.artist,
          album: track.metadata?.album,
          duration: track.metadata?.duration,
        },
        track.filename,
        track.size
      );
    }
    isOffline = await downloadStore.checkTrackOfflineStatus(track.id);
  }

  function handleClose() {
    onOpenChange(false);
  }

  onMount(() => {
    if (panelElement) {
      const handleTouchStart = (e: TouchEvent) => {
        if (!dropdownOpen) {
          onTouchStart?.(e);
        }
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (!dropdownOpen) {
          onTouchMove?.(e);
        }
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
  class="relative h-dvh flex flex-col"
  style="
    background: linear-gradient(
      to top,
      color-mix(in oklab, {playerStore.trackColor} 10%, var(--background)) 0%,
      var(--background) 50%,
      color-mix(in oklab, {playerStore.trackColor} 10%, var(--background)) 100%
    );
    touch-action: {dropdownOpen ? 'auto' : 'none'};
    overscroll-behavior: none;
    pointer-events: {dropdownOpen ? 'auto' : 'auto'};
    "
  ontouchend={(e) => !dropdownOpen && onTouchEnd?.(e)}
  onmousedown={(e) => !dropdownOpen && onMouseDown?.(e)}
>
  <div class="flex justify-between items-center p-6">
    <Button
      size="icon"
      variant="ghost"
      onclick={handleClose}
      class="transition-opacity hover:opacity-90 cursor-pointer"
      aria-label="Close player details"
    >
      <ChevronDown class="size-6" />
    </Button>
    <DropdownMenu.Root bind:open={dropdownOpen}>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Button
            {...props}
            size="icon"
            variant="ghost"
            class="transition-opacity hover:opacity-90 cursor-pointer"
            aria-label="Menu options"
          >
            <EllipsisIcon class="size-6" />
          </Button>
        {/snippet}
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
        <DropdownMenu.Item onclick={handleToggleOffline}>
          {#if isOffline}
            <CloudOffIcon size={16} class="mr-2" />
            Remove from Offline
          {:else}
            <CloudDownloadIcon size={16} class="mr-2" />
            Make Available Offline
          {/if}
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
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

<script lang="ts">
  import { getStreamUrl } from "$lib/stores/player.svelte";
  import { playerStore } from "$lib/stores/player.svelte";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import {
    ChevronDown,
    DownloadIcon,
    EllipsisIcon,
    ListMusicIcon,
  } from "@lucide/svelte";
  import PlayerDetails from "./PlayerDetails.svelte";
  import { ManagePlaylistsDialog } from "../playlists";

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onQueueOpen: () => void;
  }

  let { open = $bindable(), onOpenChange, onQueueOpen }: Props = $props();

  const track = $derived(playerStore.currentTrack);
  const title = $derived(track?.metadata?.title ?? track?.filename ?? "");

  let managePlaylistsDialogOpen = $state(false);

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

  function handleClose() {
    onOpenChange(false);
  }
</script>

<div
  class="bg-background relative h-dvh flex flex-col transition-all duration-200
  {open ? 'opacity-100' : 'opacity-0'}"
>
  <div class="flex justify-between items-center p-6">
    <button
      onclick={handleClose}
      class="opacity-70 transition-opacity hover:opacity-100"
      aria-label="Close player details"
    >
      <ChevronDown />
    </button>
    <DropdownMenu.Root>
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
    </DropdownMenu.Root>
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

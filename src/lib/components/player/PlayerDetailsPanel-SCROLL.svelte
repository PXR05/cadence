<script lang="ts">
  import { playerStore } from "$lib/stores/player.svelte";
  import { ChevronDown, EllipsisIcon } from "@lucide/svelte";
  import PlayerDetails from "./PlayerDetails.svelte";
  import { ManagePlaylistsDialog } from "../playlists";
  import { onMount } from "svelte";
  import { Button } from "../ui/button";
  import { downloadStore } from "$lib/stores/download.svelte";
  import { trackMenuStore } from "$lib/stores/trackMenu.svelte";

  interface Props {
    onOpenChange: (open: boolean) => void;
    onQueueOpen: () => void;
    isPanelAnimating?: boolean;
  }

  let { onOpenChange, onQueueOpen, isPanelAnimating = false }: Props = $props();

  const track = $derived(playerStore.currentTrack);
  const title = $derived(track?.metadata?.title ?? track?.filename ?? "");

  let managePlaylistsDialogOpen = $state(false);
  let isOffline = $state(false);

  async function refreshOfflineStatus() {
    if (!track) return;
    isOffline = await downloadStore.checkTrackOfflineStatus(track.id);
  }

  function handleClose() {
    onOpenChange(false);
  }

  onMount(async () => {
    if (!track) return;
    isOffline = await downloadStore.checkTrackOfflineStatus(track.id);
  });
</script>

<div
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
    overscroll-behavior: none;
    "
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
    <Button
      size="icon"
      variant="ghost"
      class="transition-opacity hover:opacity-90 cursor-pointer"
      onclick={() =>
        track
          ? trackMenuStore.open(track, isOffline, refreshOfflineStatus)
          : {}}
    >
      <EllipsisIcon class="size-6" />
    </Button>
  </div>

  {#if track}
    <PlayerDetails {track} {onQueueOpen} {isPanelAnimating} />
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

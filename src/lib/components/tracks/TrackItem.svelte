<script lang="ts">
  import { getStreamUrl, getImageUrl } from "$lib/stores/player.svelte";
  import { playerStore } from "$lib/stores/player.svelte";
  import { tracksStore } from "$lib/stores/tracks.svelte";
  import * as ContextMenu from "$lib/components/ui/context-menu";
  import { SkipForwardIcon, PlusIcon, DownloadIcon } from "../icons";

  interface Props {
    track: AudioFile;
    fromQueue?: boolean;
  }

  let { track, fromQueue = false }: Props = $props();

  const isCurrentTrack = $derived(playerStore.currentTrack?.id === track.id);
  const title = $derived(track.metadata?.title ?? track.filename);
  const artist = $derived(track.metadata?.artist ?? "Unknown");

  async function handlePlay() {
    if (fromQueue) {
      const trackIndex = playerStore.trackQueue.findIndex(
        (t) => t.id === track.id
      );
      if (trackIndex !== -1) {
        playerStore.queueIndex = trackIndex;
        playerStore.play(track);
        return;
      }
    }

    const shuffledTracks = tracksStore.getShuffledTracks(track);
    playerStore.setQueue(shuffledTracks, 0);
  }

  function handlePlayNext() {
    playerStore.addNextInQueue(track);
  }

  function handleAddToQueue() {
    playerStore.addToQueue(track);
  }

  function handleDownload() {
    const downloadUrl = getStreamUrl(track.id);
    const link = document.createElement("a");
    link.href = downloadUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
</script>

<ContextMenu.Root>
  <ContextMenu.Trigger>
    <button
      class="flex items-center gap-4 w-full hover:bg-muted/30 p-3 border-b"
      class:bg-muted={isCurrentTrack}
      class:text-primary={isCurrentTrack}
      onclick={handlePlay}
    >
      <div class="border size-16 flex-shrink-0 overflow-hidden">
        <img
          loading="lazy"
          src={getImageUrl(track.id)}
          alt={track.id}
          class="size-full object-cover"
        />
      </div>
      <div class="flex flex-col text-left flex-1 min-w-0">
        <p class="font-medium truncate">
          {title}
        </p>
        <p class="truncate text-muted-foreground text-sm">
          {artist}
        </p>
      </div>
    </button>
  </ContextMenu.Trigger>
  <ContextMenu.Content>
    <ContextMenu.Item onclick={handlePlayNext}>
      <SkipForwardIcon size={16} class="mr-2" />
      Play Next
    </ContextMenu.Item>
    <ContextMenu.Item onclick={handleAddToQueue}>
      <PlusIcon size={16} class="mr-2" />
      Add to Queue
    </ContextMenu.Item>
    <ContextMenu.Separator />
    <ContextMenu.Item onclick={handleDownload}>
      <DownloadIcon size={16} class="mr-2" />
      Download
    </ContextMenu.Item>
  </ContextMenu.Content>
</ContextMenu.Root>

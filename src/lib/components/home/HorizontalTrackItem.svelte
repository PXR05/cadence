<script lang="ts">
  import { getImageUrl, playerStore } from "$lib/stores/player.svelte";
  import { tracksStore } from "$lib/stores/tracks.svelte";
  import type { AudioFile } from "$lib/schemas";
  import { CloudCheckIcon } from "@lucide/svelte";
  import { downloadStore } from "$lib/stores/download.svelte";
  import { onMount } from "svelte";

  interface Props {
    track: AudioFile;
  }

  const { track }: Props = $props();

  const title = $derived(track.metadata?.title ?? track.filename);
  const artist = $derived(track.metadata?.artist ?? "Unknown Artist");
  const isCurrentTrack = $derived(playerStore.currentTrack?.id === track.id);

  function handlePlay() {
    const shuffledTracks = tracksStore.getShuffledTracks(track);
    playerStore.setQueue(shuffledTracks, 0);
  }

  let isOffline = $state(false);

  onMount(async () => {
    isOffline = await downloadStore.checkTrackOfflineStatus(track.id);
  });
</script>

<button onclick={handlePlay} class="flex flex-col gap-2 w-40 md:w-48">
  <div
    class="aspect-square rounded-md overflow-hidden border bg-muted relative"
  >
    <img
      loading="lazy"
      src={getImageUrl(track.id)}
      alt={title}
      class="size-full object-cover transition-transform"
    />
  </div>
  <div class="flex flex-col text-left flex-1 min-w-0">
    <div class="flex items-center gap-1.5">
      <p
        class="font-medium truncate {isCurrentTrack
          ? 'text-primary'
          : 'text-foreground'}"
      >
        {title}
      </p>
      {#if isOffline}
        <CloudCheckIcon size={16} class="flex-shrink-0 text-primary" />
      {/if}
    </div>
    <p
      class="truncate text-sm {isCurrentTrack
        ? 'text-primary/50'
        : 'text-muted-foreground'}"
    >
      {artist}
    </p>
  </div>
</button>

<script lang="ts">
  import { getImageUrl } from "$lib/stores/player.svelte";
  import { playerStore } from "$lib/stores/player.svelte";
  import { tracksStore } from "$lib/stores/tracks.svelte";
  import { downloadStore } from "$lib/stores/download.svelte";
  import { CloudCheckIcon } from "@lucide/svelte";
  import { onMount } from "svelte";
  import type { AudioFile, PlaylistDetail } from "$lib/schemas";
  import TrackContextMenu from "./TrackContextMenu.svelte";

  interface Props {
    index: number;
    track: AudioFile;
    isCurrentTrack: boolean;
    playlist?: PlaylistDetail;
    fromQueue?: boolean;
  }

  let {
    index,
    track,
    isCurrentTrack,
    playlist,
    fromQueue = false,
  }: Props = $props();

  const title = $derived(track.metadata?.title ?? track.filename);
  const artist = $derived(track.metadata?.artist ?? "Unknown");

  let isOffline = $state(false);

  onMount(async () => {
    isOffline = await downloadStore.checkTrackOfflineStatus(track.id);
  });

  async function refreshOfflineStatus() {
    isOffline = await downloadStore.checkTrackOfflineStatus(track.id);
  }

  async function handlePlay() {
    if (fromQueue) {
      playerStore.queueIndex = index;
      playerStore.play({ index });
    }

    if (playlist) {
      const tracks = playlist.items.map((item) => item.audio);
      const actualIndex =
        playlist.items.findIndex((item) => item.audio.id === track.id) ?? index;
      playerStore.setQueue(tracks, actualIndex);
    } else {
      const shuffledTracks = tracksStore.getShuffledTracks(track);
      playerStore.setQueue(shuffledTracks, 0);
    }
  }
</script>

<TrackContextMenu
  {track}
  {isOffline}
  onOfflineStatusChange={refreshOfflineStatus}
>
  <button
    class="relative flex items-center gap-4 w-full hover:bg-muted/30 p-2 select-none text-left
    {isCurrentTrack ? 'bg-muted/50' : ''}"
    onclick={handlePlay}
  >
    <div class="rounded-md size-16 flex-shrink-0 overflow-hidden">
      <img
        loading="lazy"
        src={getImageUrl(track.id)}
        alt={track.id}
        class="size-full object-cover"
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
</TrackContextMenu>

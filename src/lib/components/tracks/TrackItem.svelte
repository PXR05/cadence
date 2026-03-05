<script lang="ts">
  import { getImageUrl } from "$lib/constants";
  import { playerStore } from "$lib/stores/player.svelte";
  import { tracksStore } from "$lib/stores/tracks.svelte";
  import { downloadStore } from "$lib/stores/download.svelte";
  import { trackMenuStore } from "$lib/stores/trackMenu.svelte";
  import { CloudCheckIcon, EllipsisVerticalIcon } from "@lucide/svelte";
  import { onMount, onDestroy } from "svelte";
  import type { AudioFile, PlaylistDetail } from "$lib/schemas";
  import { Button } from "../ui/button";
  import { createWebHaptics } from "web-haptics/svelte";

  const { trigger, destroy } = createWebHaptics();
  onDestroy(destroy);

  interface Props {
    index: number;
    track: AudioFile;
    isCurrentTrack: boolean;
    playlist?: PlaylistDetail;
    fromQueue?: boolean;
    showAlbum?: boolean;
  }

  let {
    index,
    track,
    isCurrentTrack,
    playlist,
    fromQueue = false,
    showAlbum = false,
  }: Props = $props();

  const title = $derived(track.metadata?.title ?? track.filename);
  const artist = $derived(track.metadata?.artist ?? "Unknown");
  const album = $derived(
    track.metadata?.album ?? track.metadata?.title ?? "Unknown",
  );

  let isOffline = $state(false);

  onMount(async () => {
    isOffline = await downloadStore.checkTrackOfflineStatus(track.id);
  });

  async function refreshOfflineStatus() {
    isOffline = await downloadStore.checkTrackOfflineStatus(track.id);
  }

  async function handlePlay() {
    trigger([{ duration: 8 }], { intensity: 0.3 });

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

  function handleOpenMenu(e: MouseEvent) {
    e.stopPropagation();
    trackMenuStore.open(track, isOffline, refreshOfflineStatus);
  }

  function handleContextMenu(e: MouseEvent) {
    e.preventDefault();
    trackMenuStore.open(track, isOffline, refreshOfflineStatus);
  }
</script>

<button
  class="truncate relative flex items-center gap-4 w-full rounded-xl hover:bg-muted/50 p-2 select-none text-left
  {isCurrentTrack ? 'bg-muted/80' : ''}"
  onclick={handlePlay}
  oncontextmenu={handleContextMenu}
>
  <div class="rounded-md size-16 shrink-0 overflow-hidden">
    <img
      loading="lazy"
      crossorigin="use-credentials"
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
        <CloudCheckIcon size={16} class="shrink-0 text-primary" />
      {/if}
    </div>
    <p
      class="truncate text-sm {isCurrentTrack
        ? 'text-primary/50'
        : 'text-muted-foreground'}"
    >
      {artist}
      {#if showAlbum}
        &nbsp;•&nbsp;
        {album}
      {/if}
    </p>
  </div>
  <Button
    size="icon"
    variant="ghost"
    class="text-muted-foreground transition-opacity hover:opacity-90"
    onclick={handleOpenMenu}
  >
    <EllipsisVerticalIcon class="size-5" />
  </Button>
</button>

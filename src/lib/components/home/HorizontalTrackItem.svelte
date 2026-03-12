<script lang="ts">
  import { goto } from "$app/navigation";
  import { getImageUrl } from "$lib/constants";
  import { playerStore } from "$lib/stores/player.svelte";
  import { tracksStore } from "$lib/stores/tracks.svelte";
  import { trackMenuStore } from "$lib/stores/trackMenu.svelte";
  import type { AudioFile } from "$lib/schemas";
  import { CloudCheckIcon, EllipsisVerticalIcon } from "@lucide/svelte";
  import { downloadStore } from "$lib/stores/download.svelte";
  import { onMount, onDestroy } from "svelte";
  import { Button } from "../ui/button";
  import { createWebHaptics } from "web-haptics/svelte";

  const { trigger, destroy } = createWebHaptics();
  onDestroy(destroy);

  interface Props {
    track: AudioFile;
  }

  const { track }: Props = $props();

  const title = $derived(track.metadata?.title ?? track.filename);
  const artist = $derived(track.metadata?.artist ?? "Unknown Artist");
  const isCurrentTrack = $derived(playerStore.currentTrack?.id === track.id);

  function handlePlay() {
    trigger([{ duration: 8 }]);

    const shuffledTracks = tracksStore.getShuffledTracks(track);
    playerStore.setQueue(shuffledTracks, 0);
  }

  let isOffline = $state(false);

  onMount(async () => {
    isOffline = await downloadStore.checkTrackOfflineStatus(track.id);
  });

  async function refreshOfflineStatus() {
    isOffline = await downloadStore.checkTrackOfflineStatus(track.id);
  }

  function handleOpenMenu(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    trackMenuStore.open(track, isOffline, refreshOfflineStatus);
  }
</script>

<button
  onclick={handlePlay}
  oncontextmenu={handleOpenMenu}
  class="flex flex-col gap-2 w-48 md:w-56 text-left hover:bg-muted/50 p-2 rounded-md transition-colors {isCurrentTrack
    ? 'bg-muted/80'
    : ''}"
>
  <div
    class="aspect-square rounded-md overflow-hidden border bg-muted relative"
  >
    <img
      loading="lazy"
      crossorigin="use-credentials"
      src={getImageUrl(track.id)}
      alt={title}
      class="size-full object-cover transition-transform"
    />
  </div>
  <div class="flex items-center gap-2">
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
        <span
          role="link"
          tabindex="0"
          class="hover:underline cursor-pointer"
          onclick={(e) => {
            e.stopPropagation();
            goto(`/playlist?id=artist_${artist}`);
          }}
          onkeydown={(e) =>
            e.key === "Enter" && goto(`/playlist?id=artist_${artist}`)}
          >{artist}</span
        >
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
  </div>
</button>

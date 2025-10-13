<script lang="ts">
  import { playerStore } from "$lib/stores/player.svelte";
  import { useDialogState } from "$lib/hooks/useDialogState.svelte";
  import type { CarouselAPI } from "$lib/components/ui/carousel/context";
  import ProgressBar from "./ProgressBar.svelte";
  import QueueDialog from "./QueueDialog.svelte";
  import PlayerDetailDialog from "./PlayerDetailDialog.svelte";
  import TrackCarousel from "./TrackCarousel.svelte";
  import PlaybackControls from "./PlaybackControls.svelte";
  import VolumeControl from "./VolumeControl.svelte";
  import { ListMusicIcon, PauseIcon, PlayIcon } from "@lucide/svelte";

  let audioEl: HTMLAudioElement | null = $state(null);
  const queueDialog = useDialogState("queue");
  const playerDetailDialog = useDialogState("player-detail");

  $effect(() => {
    if (audioEl && !playerStore.isLoaded) {
      playerStore.initialize(audioEl);
    }
  });

  function setCarouselApi(api: CarouselAPI | null) {
    if (api) {
      playerStore.initializeCarousel("main", api);
    }
  }
</script>

<div class="select-none border-t">
  <div
    class="relative flex md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center max-md:justify-between py-2 min-h-16 bg-muted"
  >
    <TrackCarousel
      onTrackClick={() => playerDetailDialog.open()}
      setApi={(emblaApi) => setCarouselApi(emblaApi)}
    />

    <div class="hidden md:flex place-self-center">
      <PlaybackControls />
    </div>

    {#if playerStore.currentTrack}
      <div
        class="hidden md:flex items-center gap-2 flex-shrink-0 self-center justify-self-end pr-3"
      >
        <button
          onclick={() => queueDialog.open()}
          class="size-8 grid place-items-center hover:bg-background/50 transition-colors"
          aria-label="Open queue"
        >
          <ListMusicIcon size={18} />
        </button>
        <VolumeControl />
      </div>

      <button
        onclick={() => playerStore.togglePlayPause()}
        class="md:hidden size-12 pr-3 grid place-items-center hover:bg-background/50 transition-colors flex-shrink-0"
        aria-label={playerStore.isPlaying ? "Pause" : "Play"}
      >
        {#if playerStore.isPlaying}
          <PauseIcon absoluteStrokeWidth strokeWidth={2} fill="currentColor" />
        {:else}
          <PlayIcon absoluteStrokeWidth strokeWidth={2} fill="currentColor" />
        {/if}
      </button>
    {/if}
  </div>

  <ProgressBar />

  <audio bind:this={audioEl}></audio>

  <QueueDialog
    open={queueDialog.isOpen}
    onOpenChange={(open) => !open && queueDialog.close()}
  />

  <PlayerDetailDialog
    open={playerDetailDialog.isOpen}
    onOpenChange={(open) => !open && playerDetailDialog.close()}
    onQueueOpen={() => queueDialog.open()}
  />
</div>

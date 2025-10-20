<script lang="ts">
  import { playerStore } from "$lib/stores/player.svelte";
  import { useDialogState } from "$lib/hooks/useDialogState.svelte";
  import type { CarouselAPI } from "$lib/components/ui/carousel/context";
  import ProgressBar from "./ProgressBar.svelte";
  import QueueDialog from "./QueueDialog.svelte";
  import PlayerDetailsPanel from "./PlayerDetailsPanel.svelte";
  import TrackCarousel from "./TrackCarousel.svelte";
  import PlaybackControls from "./PlaybackControls.svelte";
  import VolumeControl from "./VolumeControl.svelte";
  import { ListMusicIcon, PauseIcon, PlayIcon } from "@lucide/svelte";
  import { onDestroy } from "svelte";
  import { Button } from "../ui/button";

  const {
    panelState,
    bottomBarVisible = false,
  }: {
    panelState: ReturnType<typeof useDialogState>;
    bottomBarVisible?: boolean;
  } = $props();

  let audioEl: HTMLAudioElement | null = $state(null);
  const queueDialog = useDialogState("queue");

  $effect(() => {
    if (audioEl && !playerStore.isLoaded) {
      playerStore.initialize(audioEl);
    }
  });

  onDestroy(() => {
    playerStore.cleanup();
  });

  function setCarouselApi(api: CarouselAPI | null) {
    if (api) {
      playerStore.initializeCarousel("main", api);
    }
  }

  const translate = $derived.by(() => {
    if (panelState.isOpen && bottomBarVisible) {
      return `calc(-100dvh + 4rem)`;
    }
    if (panelState.isOpen) {
      return `-100dvh`;
    }
    return `0`;
  });
</script>

<div
  class="select-none h-20 transition-all duration-200
  {bottomBarVisible ? 'mb-15.5' : 'mb-1.5'}"
  style="transform: translateY({translate});"
>
  <div class="px-1.5">
    <div
      class="rounded-xl overflow-clip border border-input bg-muted/50 transition-all duration-200
    {panelState.isOpen ? 'opacity-0' : 'opacity-100 backdrop-blur-md'}"
    >
      <div
        class=" relative flex md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center max-md:justify-between py-2 min-h-16"
      >
        <TrackCarousel
          onTrackClick={() => panelState.open()}
          setApi={(emblaApi) => setCarouselApi(emblaApi)}
        />

        {#if playerStore.currentTrack}
          <div class="hidden md:flex place-self-center">
            <PlaybackControls />
          </div>

          <div
            class="hidden md:flex items-center gap-2 flex-shrink-0 self-center justify-self-end pr-3"
          >
            <Button
              variant="ghost"
              onclick={() => queueDialog.open()}
              class="size-8 grid place-items-center"
              aria-label="Open queue"
            >
              <ListMusicIcon size={18} />
            </Button>
            <VolumeControl />
          </div>

          <Button
            variant="ghost"
            onclick={() => playerStore.togglePlayPause()}
            class="md:hidden size-12 grid place-items-center flex-shrink-0 mr-2 p-0"
            aria-label={playerStore.isPlaying ? "Pause" : "Play"}
          >
            {#if playerStore.isPlaying}
              <PauseIcon
                absoluteStrokeWidth
                strokeWidth={2}
                fill="currentColor"
                class="size-6"
              />
            {:else}
              <PlayIcon
                absoluteStrokeWidth
                strokeWidth={2}
                fill="currentColor"
                class="size-6"
              />
            {/if}
          </Button>
        {/if}
      </div>

      <div class="px-2 pb-2">
        <ProgressBar />
      </div>
    </div>
  </div>

  <audio bind:this={audioEl}></audio>

  <QueueDialog
    open={queueDialog.isOpen}
    onOpenChange={(open) => !open && queueDialog.close()}
  />

  <PlayerDetailsPanel
    bind:open={panelState.isOpen}
    onOpenChange={() => panelState.toggle()}
    onQueueOpen={() => queueDialog.open()}
  />
</div>

<script lang="ts">
  import { playerStore } from "$lib/stores/player.svelte";
  import ProgressBar from "./ProgressBar.svelte";
  import QueueDialog from "./QueueDialog.svelte";
  import { type CarouselAPI } from "$lib/components/ui/carousel/context";
  import * as Carousel from "$lib/components/ui/carousel";
  import {
    PlayIcon,
    PauseIcon,
    SkipBackIcon,
    SkipForwardIcon,
    VolumeIcon,
    VolumeXIcon,
    QueueListIcon,
  } from "./icons";

  let api: CarouselAPI | null = $state(null);
  let audioEl: HTMLAudioElement | null = $state(null);
  let queueDialogOpen = $state(false);

  function handleVolumeChange(e: Event) {
    const target = e.target as HTMLInputElement;
    playerStore.volume = parseFloat(target.value);
    if (playerStore.volume > 0) playerStore.isMuted = false;
  }

  function toggleMute() {
    if (playerStore.isMuted) {
      playerStore.playerRef!.muted = false;
      playerStore.isMuted = false;
    } else {
      playerStore.playerRef!.muted = true;
      playerStore.isMuted = true;
    }
  }

  $effect(() => {
    if (audioEl && api && !playerStore.isLoaded) {
      playerStore.initialize(audioEl, api);
    }
  });
</script>

<div class="fixed bottom-0 left-0 right-0 select-none">
  <div
    class="relative flex md:grid md:grid-cols-3 items-center gap-3 px-3 py-2 min-h-16 bg-muted"
  >
    <Carousel.Root
      class="w-[calc(100dvw-4.5rem)] md:w-full self-center"
      opts={{
        loop: true,
      }}
      setApi={(emblaApi) => (api = emblaApi ?? null)}
    >
      {#if playerStore.trackQueue.length === 0}
        <div class="text-muted-foreground">No track is playing</div>
      {:else}
        <Carousel.Content>
          {#each playerStore.trackQueue as track}
            {@const trackTitle = track.metadata?.title ?? track.filename ?? ""}
            {@const trackArtist = track.metadata?.artist ?? "Unknown Artist"}
            <Carousel.Item>
              <div class="flex items-center flex-1 min-w-0 gap-3">
                <div class="text-left flex-1 min-w-0">
                  <p class="font-medium truncate">{trackTitle}</p>
                  <p class="text-sm truncate text-muted-foreground">
                    {trackArtist}
                  </p>
                </div>
              </div>
            </Carousel.Item>
          {/each}
        </Carousel.Content>
      {/if}
    </Carousel.Root>

    <div class="hidden md:flex items-center gap-2 place-self-center">
      <button
        onclick={() => playerStore.playPrevious()}
        class="size-8 grid place-items-center hover:bg-background/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Previous track"
      >
        <SkipBackIcon size={18} />
      </button>
      <button
        onclick={() => playerStore.togglePlayPause()}
        class="size-10 grid place-items-center hover:bg-background/50 transition-colors"
        aria-label={playerStore.isPlaying ? "Pause" : "Play"}
      >
        {#if playerStore.isPlaying}
          <PauseIcon size={22} />
        {:else}
          <PlayIcon size={22} />
        {/if}
      </button>
      <button
        onclick={() => playerStore.playNext()}
        class="size-8 grid place-items-center hover:bg-background/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Next track"
      >
        <SkipForwardIcon size={18} />
      </button>
    </div>

    {#if playerStore.currentTrack}
      <div
        class="hidden md:flex items-center gap-2 flex-shrink-0 self-center justify-self-end"
      >
        <button
          onclick={() => (queueDialogOpen = true)}
          class="size-8 grid place-items-center hover:bg-background/50 transition-colors"
          aria-label="Open queue"
        >
          <QueueListIcon size={20} />
        </button>
        <div class="flex items-center flex-shrink-0 gap-2">
          <button
            onclick={toggleMute}
            class="size-8 grid place-items-center hover:bg-background/50 transition-colors"
            aria-label={playerStore.isMuted ? "Unmute" : "Mute"}
          >
            {#if playerStore.isMuted || playerStore.volume === 0}
              <VolumeXIcon size={20} />
            {:else}
              <VolumeIcon size={20} />
            {/if}
          </button>
          <div class="group relative w-24 h-4 flex items-center bg-background">
            <div class="absolute inset-0 bg-muted/50 pointer-events-none">
              <div
                style="width: {playerStore.volume * 100}%"
                class="h-full bg-foreground/30 group-hover:border-r-12 border-foreground"
              ></div>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={playerStore.volume}
              oninput={handleVolumeChange}
              class="relative w-full h-full opacity-0 cursor-pointer z-10"
              aria-label="Volume"
            />
          </div>
        </div>
      </div>

      <button
        onclick={() => playerStore.togglePlayPause()}
        class="md:hidden size-8 grid place-items-center hover:bg-background/50 transition-colors flex-shrink-0"
        aria-label={playerStore.isPlaying ? "Pause" : "Play"}
      >
        {#if playerStore.isPlaying}
          <PauseIcon />
        {:else}
          <PlayIcon />
        {/if}
      </button>
    {/if}
  </div>

  <ProgressBar />

  <audio bind:this={audioEl}></audio>

  <QueueDialog
    bind:open={queueDialogOpen}
    onOpenChange={(open) => (queueDialogOpen = open)}
  />
</div>

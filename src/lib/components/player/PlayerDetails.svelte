<script lang="ts">
  import { getImageUrl } from "$lib/stores/player.svelte";
  import { playerStore } from "$lib/stores/player.svelte";
  import { ListMusicIcon } from "@lucide/svelte";
  import { ProgressBar, PlaybackControls } from ".";
  import * as Carousel from "../ui/carousel";
  import type { CarouselAPI } from "../ui/carousel/context";
  import { Button } from "../ui/button";
  import { fade } from "svelte/transition";

  interface Props {
    track: AudioFile;
    open?: boolean;
    onQueueOpen: () => void;
  }

  const { track, open = false, onQueueOpen }: Props = $props();

  const trackTitle = $derived(track?.metadata?.title ?? track?.filename ?? "");
  const trackArtist = $derived(track?.metadata?.artist ?? "Unknown Artist");

  function setDetailCarouselApi(api: CarouselAPI | null) {
    if (api) {
      playerStore.initializeCarousel("detail", api);
    }
  }
</script>

<div class="flex-1 flex flex-col justify-between">
  <div class="relative flex-shrink-0 my-auto w-full z-20">
    {#if open}
      <img
        transition:fade={{
          duration: 200,
          delay: 250,
        }}
        loading="lazy"
        src={playerStore.currentImageUrl}
        alt={playerStore.currentTrack?.id ?? ""}
        draggable="false"
        onauxclick={() => false}
        oncontextmenu={() => false}
        class="h-[min(42.5dvh,90dvw)] scale-150 aspect-square object-cover absolute inset-0 m-auto pointer-events-none blur-3xl"
      />
    {/if}
    <Carousel.Root
      class="w-full z-20"
      opts={{ loop: true }}
      setApi={(emblaApi) => setDetailCarouselApi(emblaApi ?? null)}
    >
      <Carousel.Content>
        {#each playerStore.trackQueue as queueTrack}
          <Carousel.Item onclick={() => playerStore.togglePlayPause()}>
            <img
              loading="lazy"
              src={getImageUrl(queueTrack.id)}
              alt={queueTrack.id}
              class="h-[min(42.5dvh,90dvw)] aspect-square object-cover mx-auto rounded-2xl"
            />
          </Carousel.Item>
        {/each}
      </Carousel.Content>
    </Carousel.Root>
  </div>

  <div class="flex flex-col gap-8 px-6 my-auto z-20">
    <div class="text-center">
      <h2
        class="text-xl font-semibold truncate"
        style="color: color-mix(in oklab, {playerStore.trackColor} 30%, var(--foreground));"
      >
        {trackTitle}
      </h2>
      <p
        class="text-muted-foreground truncate"
        style="color: color-mix(in oklab, {playerStore.trackColor} 30%, var(--muted-foreground));"
      >
        {trackArtist}
      </p>
    </div>

    <ProgressBar height={12} showTime />

    <PlaybackControls variant="large" />
  </div>

  <div class="p-4 z-20">
    <Button
      variant="ghost"
      onclick={onQueueOpen}
      class="w-full py-3 px-4 transition-colors flex items-center justify-center gap-2"
    >
      <ListMusicIcon size={20} />
      <span>Open Queue</span>
    </Button>
  </div>
</div>

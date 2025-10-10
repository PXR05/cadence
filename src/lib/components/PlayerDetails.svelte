<script lang="ts">
  import { BASE_URL } from "$lib/api";
  import { playerStore } from "$lib/stores/player.svelte";
  import { ProgressBar, PlaybackControls } from ".";
  import { QueueListIcon } from "./icons";
  import * as Carousel from "./ui/carousel";
  import type { CarouselAPI } from "./ui/carousel/context";

  interface Props {
    track: AudioFile;
    onQueueOpen: () => void;
  }

  const { track, onQueueOpen }: Props = $props();

  const trackTitle = $derived(track?.metadata?.title ?? track?.filename ?? "");
  const trackArtist = $derived(track?.metadata?.artist ?? "Unknown Artist");

  function setDetailCarouselApi(api: CarouselAPI | null) {
    if (api) {
      playerStore.initializeCarousel("detail", api);
    }
  }
</script>

<div class="flex-1 flex flex-col justify-center gap-12">
  <div class="flex-shrink-0 overflow-hidden m-auto px-6 w-full">
    <Carousel.Root
      class="w-full"
      opts={{ loop: true }}
      setApi={(emblaApi) => setDetailCarouselApi(emblaApi ?? null)}
    >
      <Carousel.Content>
        {#each playerStore.trackQueue as queueTrack}
          <Carousel.Item>
            <img
              loading="lazy"
              src="{BASE_URL}/{queueTrack.id}/image"
              alt={queueTrack.id}
              class="h-[40dvh] aspect-square object-cover mx-auto"
            />
          </Carousel.Item>
        {/each}
      </Carousel.Content>
    </Carousel.Root>
  </div>

  <div class="flex flex-col gap-8 px-6">
    <div class="text-center">
      <h2 class="text-xl font-bold truncate">{trackTitle}</h2>
      <p class="text-lg text-muted-foreground truncate">{trackArtist}</p>
    </div>

    <div class="space-y-2">
      <ProgressBar />
    </div>

    <PlaybackControls variant="large" />
  </div>

  <button
    onclick={onQueueOpen}
    class="w-full py-3 px-4 bg-muted hover:bg-muted/80 transition-colors rounded-lg flex items-center justify-center gap-2"
  >
    <QueueListIcon size={20} />
    <span>Open Queue</span>
  </button>
</div>

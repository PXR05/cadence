<script lang="ts">
  import { playerStore } from "$lib/stores/player.svelte";
  import * as Carousel from "$lib/components/ui/carousel";
  import type { CarouselAPI } from "$lib/components/ui/carousel/context";

  interface Props {
    onTrackClick?: () => void;
    setApi: (api: CarouselAPI | null) => void;
  }

  let { onTrackClick, setApi }: Props = $props();
</script>

<Carousel.Root
  class="w-[calc(100dvw-3rem)] md:w-full self-center"
  opts={{ loop: true }}
  setApi={(emblaApi) => setApi(emblaApi ?? null)}
>
  {#if playerStore.trackQueue.length === 0}
    <div class="text-muted-foreground pl-3">No track is playing</div>
  {:else}
    <Carousel.Content>
      {#each playerStore.trackQueue as track}
        {@const trackTitle = track.metadata?.title ?? track.filename ?? ""}
        {@const trackArtist = track.metadata?.artist ?? "Unknown Artist"}
        <Carousel.Item>
          <button
            onclick={onTrackClick}
            class="md:pointer-events-none flex items-center flex-1 min-w-0 gap-3 text-left w-full pl-3"
          >
            <div class="text-left flex-1 min-w-0">
              <p class="font-medium truncate">{trackTitle}</p>
              <p class="text-sm truncate text-muted-foreground">
                {trackArtist}
              </p>
            </div>
          </button>
        </Carousel.Item>
      {/each}
    </Carousel.Content>
    <span
      class="pointer-events-none absolute top-0 right-0 w-8 h-11 bg-gradient-to-r from-transparent to-muted"
    >
    </span>
  {/if}
</Carousel.Root>

<script lang="ts">
  import { getImageUrl } from "$lib/constants";
  import { playerStore } from "$lib/stores/player.svelte";
  import * as Carousel from "$lib/components/ui/carousel";
  import type { CarouselAPI } from "$lib/components/ui/carousel/context";
  import { shouldLoadItem } from "$lib/utils/queue";

  interface Props {
    onTrackClick?: () => void;
    setApi: (api: CarouselAPI | null) => void;
    isDisabled?: boolean;
  }

  let { onTrackClick, setApi, isDisabled = false }: Props = $props();
</script>

<div
  class="w-[calc(100dvw-5rem)] md:w-full self-center"
  class:pointer-events-none={isDisabled}
>
  <Carousel.Root
    class="w-full"
    style="will-change: transform; transform: translateZ(0); contain: layout style;"
    opts={{ loop: true }}
    setApi={(emblaApi) => setApi(emblaApi ?? null)}
  >
    {#if playerStore.trackQueue.length === 0}
      <div class="pl-3 -mb-3">No track is playing</div>
    {:else}
      <Carousel.Content>
        {#each playerStore.trackQueue as track, i}
          {@const trackTitle = track.metadata?.title ?? track.filename ?? ""}
          {@const trackArtist = track.metadata?.artist ?? "Unknown Artist"}
          <Carousel.Item onclick={onTrackClick}>
            {#if shouldLoadItem(i)}
              <div
                class="md:pointer-events-none flex items-center flex-1 min-w-0 gap-2 text-left w-full pl-2"
              >
                <img
                  loading="lazy"
                  src={getImageUrl(track.id)}
                  alt={track.id}
                  class="rounded-md size-12 shrink-0 object-cover text-transparent"
                />
                <div class="text-left flex-1 min-w-0">
                  <p class="font-medium truncate"
                  style="color: color-mix(in oklab, {playerStore.trackColor} 30%, var(--foreground));"
                  >
                    {trackTitle}
                  </p>
                  <p class="text-sm truncate font-light"
                  style="color: color-mix(in oklab, {playerStore.trackColor} 30%, var(--muted-foreground));"
                  >
                    {trackArtist}
                  </p>
                </div>
              </div>
            {/if}
          </Carousel.Item>
        {/each}
      </Carousel.Content>
    {/if}
  </Carousel.Root>
</div>

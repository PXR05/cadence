<script lang="ts">
  import { getImageUrl, playerStore } from "$lib/stores/player.svelte";
  import * as Carousel from "$lib/components/ui/carousel";
  import type { CarouselAPI } from "$lib/components/ui/carousel/context";
  import { shouldLoadItem } from "$lib/utils/queue";

  interface Props {
    onTrackClick?: () => void;
    setApi: (api: CarouselAPI | null) => void;
  }

  let { onTrackClick, setApi }: Props = $props();
</script>

<Carousel.Root
  class="w-[calc(100dvw-5rem)] md:w-full self-center"
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
                class="rounded-md size-12 flex-shrink-0 object-cover text-transparent"
              />
              <div class="text-left flex-1 min-w-0">
                <p class="font-medium truncate">
                  {trackTitle}
                </p>
                <p class="text-sm truncate font-light">
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

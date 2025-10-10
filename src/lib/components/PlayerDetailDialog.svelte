<script lang="ts">
  import { playerStore } from "$lib/stores/player.svelte";
  import * as Dialog from "$lib/components/ui/dialog";
  import * as Carousel from "$lib/components/ui/carousel";
  import type { CarouselAPI } from "$lib/components/ui/carousel/context";
  import ProgressBar from "./ProgressBar.svelte";
  import PlaybackControls from "./PlaybackControls.svelte";
  import VolumeControl from "./VolumeControl.svelte";
  import { QueueListIcon } from "./icons";
  import { BASE_URL } from "$lib/api";
  import { ChevronDown, EllipsisIcon } from "@lucide/svelte";

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onQueueOpen: () => void;
  }

  let { open = $bindable(), onOpenChange, onQueueOpen }: Props = $props();

  const track = $derived(playerStore.currentTrack);
  const trackTitle = $derived(track?.metadata?.title ?? track?.filename ?? "");
  const trackArtist = $derived(track?.metadata?.artist ?? "Unknown Artist");

  function setDetailCarouselApi(api: CarouselAPI | null) {
    if (api) {
      playerStore.initializeCarousel("detail", api);
    }
  }
</script>

<Dialog.Root bind:open {onOpenChange}>
  <Dialog.Content
    showCloseButton={false}
    class="md:max-w-2xl h-dvh md:max-h-[90vh] max-w-dvw flex flex-col p-0"
  >
    <div class="flex justify-between items-center p-6">
      <Dialog.Close class="opacity-70 transition-opacity hover:opacity-100">
        <ChevronDown />
      </Dialog.Close>
      <button>
        <EllipsisIcon />
      </button>
    </div>

    {#if track}
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
    {/if}
  </Dialog.Content>
</Dialog.Root>

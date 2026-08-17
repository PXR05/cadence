<script lang="ts">
  import type { CarouselAPI } from "$lib/components/ui/carousel/context";
  import { playerStore } from "$lib/stores/player.svelte";
  import { useDialogState } from "$lib/hooks";
  import {
    Ellipsis as EllipsisIcon,
    Fullscreen as FullscreenIcon,
    ListMusic as ListMusicIcon,
    Maximize2Icon,
  } from "@lucide/svelte";
  import { Button } from "../ui/button";
  import PlaybackControls from "./PlaybackControls.svelte";
  import ProgressBar from "./PlayerProgressBar.svelte";
  import VolumeControl from "./VolumeControl.svelte";
  import TrackCarousel from "../tracks/TrackCarousel.svelte";
  import PlayerFullscreenDesktop from "./PlayerFullscreenDesktop.svelte";

  interface Props {
    setCarouselApi: (api: CarouselAPI | null) => void;
    onQueueOpen: () => void;
    onMenuOpen: () => void;
  }

  let { setCarouselApi, onQueueOpen, onMenuOpen }: Props = $props();

  const fullscreenState = useDialogState("player-fullscreen");
  const playerExpanded = $derived(fullscreenState.isOpen);
</script>

{#if playerExpanded}
  <PlayerFullscreenDesktop onClose={() => fullscreenState.close()} />
{:else}
  <div
    class="px-1.5 py-2 border-t bg-muted
    {playerStore.queueLength === 0 ? 'pointer-events-none opacity-0' : ''}"
  >
    <div class="relative grid grid-cols-3 items-center py-2 min-h-20">
      <TrackCarousel setApi={(emblaApi) => setCarouselApi(emblaApi)} />

      {#if playerStore.currentTrack}
        <div class="w-full flex flex-col place-self-center">
          <PlaybackControls variant="compact" monochrome />
          <div>
            <ProgressBar timeSide="side" showTime monochrome />
          </div>
        </div>

        <div
          class="flex items-center gap-2 shrink-0 self-center justify-self-end pr-3"
        >
          <Button
            variant="ghost"
            onclick={() => fullscreenState.open()}
            class="size-8 grid place-items-center cursor-pointer"
            aria-label="Expand player"
          >
            <Maximize2Icon size={18} />
          </Button>

          <VolumeControl />

          <Button
            variant="ghost"
            onclick={onQueueOpen}
            class="size-8 grid place-items-center cursor-pointer"
            aria-label="Open queue"
          >
            <ListMusicIcon size={18} />
          </Button>

          <Button
            variant="ghost"
            onclick={onMenuOpen}
            class="size-8 grid place-items-center cursor-pointer"
            aria-label="Open menu"
          >
            <EllipsisIcon size={18} />
          </Button>
        </div>
      {/if}
    </div>
  </div>
{/if}

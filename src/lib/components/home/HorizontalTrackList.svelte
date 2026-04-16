<script lang="ts">
  import HorizontalTrackItem from "./HorizontalTrackItem.svelte";
  import type { AudioFile } from "$lib/schemas";
  import type { Snippet } from "svelte";
  import { flip } from "svelte/animate";
  import { appearanceStore } from "$lib/stores/appearance.svelte";
  import { vaulEase } from "$lib/utils";
  import { useSidebar } from "../ui/sidebar";
  import { Button } from "../ui/button";
  import {  ArrowLeft as ArrowLeftIcon, ArrowRight as ArrowRightIcon } from "@lucide/svelte";
  import { innerWidth } from "svelte/reactivity/window";

  interface Props {
    title: string;
    tracks: AudioFile[];
    emptyState?: Snippet;
  }

  const { title, tracks, emptyState }: Props = $props();

  let container: HTMLDivElement | null = $state(null);

  const isSidebarCollapsed = $derived(useSidebar().state === "collapsed");
  const isOverflowing = $derived.by(() => {
    if (tracks.length === 0) return false;
    const windowWidth = innerWidth.current ?? 0;
    if (windowWidth < 768) return false;
    const trackWidth = 224;
    const containerWidth = windowWidth - (isSidebarCollapsed ? 64 : 256);
    return tracks.length * trackWidth > containerWidth;
  });

  function handleArrowClick(direction: "left" | "right") {
    const itemWidth = 224;
    if (container) {
      const scrollAmount =
        direction === "left" ? -itemWidth * 2 : itemWidth * 2;
      container.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  }
</script>

<div class="flex flex-col gap-2">
  <div class="flex items-center justify-between gap-2 px-4">
    <h2 class="text-2xl font-semibold">{title}</h2>

    {#if isOverflowing}
      <div class="flex gap-2">
        <Button
          variant="outline"
          size="icon"
          onclick={() => handleArrowClick("left")}
        >
          <ArrowLeftIcon />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onclick={() => handleArrowClick("right")}
        >
          <ArrowRightIcon />
        </Button>
      </div>
    {/if}
  </div>

  {#if tracks.length === 0 && emptyState}
    {@render emptyState()}
  {:else}
    <div
      bind:this={container}
      class="flex overflow-x-auto scroll-smooth w-dvw pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden transition-[width] duration-200
      {isSidebarCollapsed
        ? 'md:w-[calc(100dvw-64px)]'
        : 'md:w-[calc(100dvw-256px)]'}"
    >
      {#each tracks as track, i (track.id)}
        <div
          animate:flip={{
            duration: appearanceStore.disableAnimations ? 0 : 150,
            easing: vaulEase,
          }}
          class="w-48 md:w-56
          {i === 0 ? 'ml-2' : ''}
          {i === tracks.length - 1 ? 'mr-2' : ''}"
        >
          <HorizontalTrackItem {track} />
        </div>
      {/each}
    </div>
  {/if}
</div>

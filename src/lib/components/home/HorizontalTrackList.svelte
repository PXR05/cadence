<script lang="ts">
  import HorizontalTrackItem from "./HorizontalTrackItem.svelte";
  import type { AudioFile } from "$lib/schemas";
  import type { Snippet } from "svelte";
  import { flip } from "svelte/animate";
  import { appearanceStore } from "$lib/stores/appearance.svelte";
  import { vaulEase } from "$lib/utils";
  import { useSidebar } from "../ui/sidebar";

  interface Props {
    title: string;
    tracks: AudioFile[];
    emptyState?: Snippet;
  }

  const { title, tracks, emptyState }: Props = $props();

  const isSidebarCollapsed = $derived(useSidebar().state === "collapsed");
</script>

<div class="flex flex-col gap-2">
  <h2 class="text-2xl font-semibold px-4">{title}</h2>

  {#if tracks.length === 0 && emptyState}
    {@render emptyState()}
  {:else}
    <div
      class="flex overflow-x-auto scroll-smooth w-dvw pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden transition-[width] duration-200
      {isSidebarCollapsed ? 'md:w-[calc(100dvw-64px)]' : 'md:w-[calc(100dvw-256px)]'}"
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

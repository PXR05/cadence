<script lang="ts">
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import HorizontalTrackItem from "./HorizontalTrackItem.svelte";
  import type { AudioFile } from "$lib/schemas";
  import type { Snippet } from "svelte";
  import { flip } from "svelte/animate";
  import { fade } from "svelte/transition";
  import { cubicOut } from "svelte/easing";

  interface Props {
    title: string;
    tracks: AudioFile[];
    emptyState?: Snippet;
  }

  const { title, tracks, emptyState }: Props = $props();
</script>

<div class="flex flex-col gap-2">
  <h2 class="text-2xl font-semibold px-4">{title}</h2>

  {#if tracks.length === 0 && emptyState}
    {@render emptyState()}
  {:else}
    <ScrollArea orientation="horizontal" class="w-dvw px-2 pb-4">
      <div class="flex">
        {#each tracks as track, i (track.id)}
          <div
            animate:flip={{
              duration: 150,
              easing: cubicOut,
            }}
          >
            <HorizontalTrackItem {track} />
          </div>
        {/each}
      </div>
    </ScrollArea>
  {/if}
</div>

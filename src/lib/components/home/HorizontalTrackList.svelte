<script lang="ts">
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import HorizontalTrackItem from "./HorizontalTrackItem.svelte";
  import type { AudioFile } from "$lib/schemas";
  import type { Snippet } from "svelte";

  interface Props {
    title: string;
    tracks: AudioFile[];
    emptyState?: Snippet;
  }

  const { title, tracks, emptyState }: Props = $props();
</script>

<div class="flex flex-col gap-4">
  <h2 class="text-2xl font-semibold px-4">{title}</h2>

  {#if tracks.length === 0 && emptyState}
    {@render emptyState()}
  {:else}
    <ScrollArea orientation="horizontal" class="w-dvw">
      <div class="flex gap-4">
        {#each tracks as track, i (track.id)}
          {#if i === 0}
            <div class="ml-3">
              <HorizontalTrackItem {track} />
            </div>
          {:else}
            <HorizontalTrackItem {track} />
          {/if}
        {/each}
      </div>
    </ScrollArea>
  {/if}
</div>

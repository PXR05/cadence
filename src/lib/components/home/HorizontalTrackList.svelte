<script lang="ts">
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import HorizontalTrackItem from "./HorizontalTrackItem.svelte";
  import type { AudioFile } from "$lib/schemas";
  import type { Snippet } from "svelte";
  import { flip } from "svelte/animate";
  import { appearanceStore } from "$lib/stores/appearance.svelte";
  import { vaulEase } from "$lib/utils";

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
    <ScrollArea
      orientation="horizontal"
      class="w-dvw md:w-[calc(100dvw-256px)] pb-4"
    >
      <div class="flex pr-4">
        {#each tracks as track, i (track.id)}
          <div
            animate:flip={{
              duration: appearanceStore.disableAnimations ? 0 : 150,
              easing: vaulEase,
            }}
            class={i === 0 ? "ml-2" : ""}
          >
            <HorizontalTrackItem {track} />
          </div>
        {/each}
      </div>
    </ScrollArea>
  {/if}
</div>

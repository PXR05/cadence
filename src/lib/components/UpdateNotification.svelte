<script lang="ts">
  import { Button } from "$lib/components/ui/button";
    import { appearanceStore } from "$lib/stores/appearance.svelte";
  import { playerStore } from "$lib/stores/player.svelte";
  import {  RefreshCw as RefreshCwIcon } from "@lucide/svelte";
  import { fly } from "svelte/transition";

  interface Props {
    onUpdate: () => void;
  }

  let { onUpdate }: Props = $props();

  let visible = $state(true);
</script>

{#if visible}
  <div
    transition:fly={{ duration: appearanceStore.disableAnimations ? 0 : 200, y: -50 }}
    class="fixed top-2 max-md:left-1/2 max-md:-translate-x-1/2 right-2 z-100 w-[calc(100%-1rem)] max-w-md"
  >
    <div
      class="flex items-center gap-3 p-3 rounded-xl border bg-background shadow-lg"
    >
      <div
        class="flex items-center justify-center size-10 rounded-lg bg-primary/10 text-primary shrink-0"
      >
        <RefreshCwIcon class="size-5" />
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-semibold text-sm">Update Available</p>
        <p class="text-xs text-muted-foreground truncate">
          A new version of Cadence is ready
        </p>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          onclick={onUpdate}
          style="background: {playerStore.trackColor ?? 'var(--primary)'}"
        >
          Update
        </Button>
      </div>
    </div>
  </div>
{/if}

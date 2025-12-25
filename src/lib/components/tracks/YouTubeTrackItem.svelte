<script lang="ts">
  import type { YouTubeSearchResult } from "$lib/schemas";
  import { CheckIcon, ClockIcon } from "@lucide/svelte";

  interface Props {
    result: YouTubeSearchResult;
    isInQueue: boolean;
    onDownload: (videoId: string) => void;
  }

  let { result, isInQueue, onDownload }: Props = $props();

  function handleClick() {
    if (!isInQueue) {
      onDownload(result.videoId);
    }
  }
</script>

<button
  onclick={handleClick}
  disabled={isInQueue}
  class="relative flex items-center gap-4 w-full hover:bg-muted/50 p-2 border select-none
    {isInQueue ? 'cursor-default' : 'cursor-pointer'}"
>
  <div class="rounded-md size-16 shrink-0 overflow-hidden relative">
    <img
      loading="lazy"
      src={result.thumbnail}
      alt={result.title}
      class="size-full object-cover opacity-50"
    />
    {#if isInQueue}
      <div
        class="absolute inset-0 bg-background/80 flex items-center justify-center"
      >
        <ClockIcon class="text-primary" size={24} />
      </div>
    {/if}
  </div>
  <div class="flex flex-col text-left flex-1 min-w-0">
    <p class="font-medium truncate text-muted-foreground opacity-50">
      {result.title}
    </p>
    <p class="truncate text-sm text-muted-foreground/70 opacity-50">
      {result.artist}
    </p>
    <div class="h-4 mt-0.5">
      {#if isInQueue}
        <p class="text-xs text-primary truncate flex items-center gap-1">
          <CheckIcon size={12} />
          Added to download queue
        </p>
      {/if}
    </div>
  </div>
</button>

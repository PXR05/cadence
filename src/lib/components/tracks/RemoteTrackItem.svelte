<script lang="ts">
  import type { RemoteSearchResult } from "$lib/schemas";
  import { backendCapabilities } from "$lib/backend/config";
  import {  Check as CheckIcon, Clock as ClockIcon } from "@lucide/svelte";

  interface Props {
    result: RemoteSearchResult;
    isInQueue: boolean;
    onDownload: (result: RemoteSearchResult) => void;
  }

  let { result, isInQueue, onDownload }: Props = $props();
  const canImport = $derived(
    backendCapabilities.uploads.remote &&
      backendCapabilities.remoteProviders[result.provider].import,
  );

  function handleClick() {
    if (!isInQueue && canImport) {
      onDownload(result);
    }
  }
</script>

<button
  onclick={handleClick}
  disabled={isInQueue || !canImport}
  class="relative flex items-center gap-4 w-full hover:bg-muted/50 rounded-xl p-2 select-none
    {isInQueue || !canImport ? 'cursor-default' : 'cursor-pointer'}"
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

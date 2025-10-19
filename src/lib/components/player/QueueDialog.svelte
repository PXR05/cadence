<script lang="ts">
  import { playerStore } from "$lib/stores/player.svelte";
  import * as Dialog from "$lib/components/ui/dialog";
  import { formatTime } from "$lib/utils/format";
  import { ChevronDown, PlayIcon } from "@lucide/svelte";
  import { Button } from "../ui/button";
  import { ScrollArea } from "../ui/scroll-area";

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }

  let { open = $bindable(), onOpenChange }: Props = $props();

  function handleTrackClick(index: number) {
    playerStore.playAtIndex(index);
  }

  const textColor = $derived(
    `color-mix(in oklab, #${playerStore.trackColor} 80%, var(--foreground))`
  );
</script>

<Dialog.Root bind:open {onOpenChange}>
  <Dialog.Content
    showCloseButton={false}
    class="md:max-w-2xl h-dvh md:h-[90dvh] sm:max-w-dvw max-w-dvw flex flex-col z-60 p-0 max-md:border-0 rounded-none md:rounded-2xl bg-muted/50 backdrop-blur-xl"
  >
    <div
      class="absolute top-1.5 left-1.5 right-1.5 z-10 backdrop-blur-md rounded-xl border border-input px-2 py-3 flex justify-between items-start"
    >
      <Dialog.Close
        class="opacity-70 transition-opacity hover:opacity-100 my-auto size-6 grid place-items-center"
      >
        <ChevronDown />
      </Dialog.Close>

      <Dialog.Header>
        <Dialog.Description>
          {playerStore.queueLength} track{playerStore.queueLength !== 1
            ? "s"
            : ""} in queue
        </Dialog.Description>
      </Dialog.Header>

      <Dialog.Close class="opacity-0 pointer-events-none">
        <ChevronDown />
      </Dialog.Close>
    </div>

    <ScrollArea class="h-dvh md:max-h-[90dvh]">
      <div class="flex-1 px-3 space-y-1 pt-15">
        {#if playerStore.trackQueue.length === 0}
          <div class="text-center py-8 text-muted-foreground">
            No tracks in queue
          </div>
        {:else}
          {#each playerStore.trackQueue as track, index}
            {@const isCurrentTrack = index === playerStore.queueIndex}
            {@const trackTitle = track.metadata?.title ?? track.filename ?? ""}
            {@const trackArtist = track.metadata?.artist ?? "Unknown Artist"}
            {@const trackDuration = track.metadata?.duration ?? 0}

            <Button
              variant="ghost"
              onclick={() => handleTrackClick(index)}
              class="h-auto !transition-none w-full flex items-center gap-3 p-2 text-left group 
              {isCurrentTrack ? 'bg-muted/70' : ''}"
            >
              <div class="w-8 text-center flex-shrink-0">
                {#if isCurrentTrack && playerStore.isPlaying}
                  <PlayIcon
                    size={16}
                    fill="currentColor"
                    class="m-auto"
                    style="color: {textColor}; 
                    filter: {isCurrentTrack
                      ? 'brightness(1.25)'
                      : ''} saturate(6);"
                  />
                {:else}
                  <span class="text-sm text-muted-foreground">{index + 1}</span>
                {/if}
              </div>

              <div class="flex-1 min-w-0">
                <p
                  class="font-medium truncate text-sm"
                  style="color: {isCurrentTrack
                    ? textColor
                    : 'var(--foreground)'};  
                    filter: {isCurrentTrack
                    ? 'brightness(1.2)'
                    : ''} saturate(6);"
                >
                  {trackTitle}
                </p>
                <p
                  class="text-xs truncate"
                  style="color: {isCurrentTrack
                    ? textColor
                    : 'var(--muted-foreground)'};  
                    filter: {isCurrentTrack
                    ? 'brightness(1.2)'
                    : ''} saturate(6);"
                >
                  {trackArtist}
                </p>
              </div>

              {#if trackDuration > 0}
                <span class="text-xs text-muted-foreground">
                  {formatTime(trackDuration)}
                </span>
              {/if}
            </Button>
          {/each}
        {/if}
      </div>
    </ScrollArea>
  </Dialog.Content>
</Dialog.Root>

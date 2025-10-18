<script lang="ts">
  import { playerStore } from "$lib/stores/player.svelte";
  import * as Dialog from "$lib/components/ui/dialog";
  import { formatTime } from "$lib/utils/format";
  import { ChevronDown, PlayIcon } from "@lucide/svelte";
  import { Button } from "../ui/button";

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }

  let { open = $bindable(), onOpenChange }: Props = $props();

  function handleTrackClick(index: number) {
    playerStore.playAtIndex(index);
  }
</script>

<Dialog.Root bind:open {onOpenChange}>
  <Dialog.Content
    showCloseButton={false}
    class="md:max-w-2xl h-dvh md:max-h-[90vh] sm:max-w-dvw max-w-dvw flex flex-col z-60"
  >
    <div class="flex justify-between items-start">
      <Dialog.Close class="opacity-70 transition-opacity hover:opacity-100">
        <ChevronDown />
      </Dialog.Close>

      <Dialog.Header>
        <Dialog.Title class="text-center">Queue</Dialog.Title>
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

    <div class="flex-1 overflow-y-auto -mx-4 px-4 space-y-1">
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
            {isCurrentTrack ? 'bg-muted' : ''}"
          >
            <div class="w-8 text-center flex-shrink-0">
              {#if isCurrentTrack && playerStore.isPlaying}
                <PlayIcon
                  size={16}
                  fill="currentColor"
                  class="text-primary m-auto"
                />
              {:else}
                <span class="text-sm text-muted-foreground">{index + 1}</span>
              {/if}
            </div>

            <div class="flex-1 min-w-0">
              <p
                class="font-medium truncate text-sm {isCurrentTrack
                  ? 'text-primary'
                  : 'text-foreground'}"
              >
                {trackTitle}
              </p>
              <p
                class="text-xs truncate {isCurrentTrack
                  ? 'text-primary/50'
                  : 'text-muted-foreground'}"
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
  </Dialog.Content>
</Dialog.Root>

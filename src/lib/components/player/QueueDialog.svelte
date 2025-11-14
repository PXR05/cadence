<script lang="ts">
  import { playerStore } from "$lib/stores/player.svelte";
  import * as Dialog from "$lib/components/ui/dialog";
  import { formatTime } from "$lib/utils/format";
  import { ChevronDown, PlayIcon } from "@lucide/svelte";
  import { Button } from "../ui/button";
  import { VirtualScroll } from "../ui/virtual-scroll";

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }

  let { open = $bindable(), onOpenChange }: Props = $props();

  let virtualScroll: any = $state(null);

  function handleTrackClick(index: number) {
    playerStore.playAtIndex(index);
  }

  const textColor = $derived(
    `color-mix(in oklab, ${playerStore.trackColor} 80%, var(--foreground))`
  );

  const ROW_HEIGHT = 52;

  $effect(() => {
    if (open && virtualScroll && playerStore.queueIndex >= 0) {
      setTimeout(() => {
        virtualScroll?.scrollToIndex(playerStore.queueIndex, false);
      }, 100);
    }
  });
</script>

<Dialog.Root bind:open {onOpenChange}>
  <Dialog.Content
    showCloseButton={false}
    class="md:max-w-2xl h-dvh md:h-[90dvh] overflow-clip sm:max-w-dvw max-w-dvw flex flex-col z-60 p-0 max-md:border-0 rounded-none md:rounded-2xl bg-muted/80 dark:bg-muted/50 backdrop-blur-xl"
  >
    <div
      class="absolute top-1.5 left-1.5 right-1.5 z-10 rounded-xl bg-muted border border-input/15 px-4 py-4 flex justify-between items-start"
    >
      <Dialog.Close
        class="opacity-70 transition-opacity hover:opacity-100 my-auto size-6 grid place-items-center text-muted-foreground"
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

    <VirtualScroll
      bind:this={virtualScroll}
      items={playerStore.trackQueue}
      rowHeight={ROW_HEIGHT}
      class="h-dvh md:max-h-[90dvh-1rem]"
      topOffset={62}
      leftPadding={8}
      rightPadding={8}
      itemGap={4}
      getItemKey={(track) => track.id ?? track.filename}
    >
      {#snippet emptyState()}
        <div class="text-center py-8 text-muted-foreground pt-15.5">
          No tracks in queue
        </div>
      {/snippet}

      {#snippet children({ item: track, index })}
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
                style="color: {textColor};"
              />
            {:else}
              <span class="text-sm text-muted-foreground">{index + 1}</span>
            {/if}
          </div>

          <div class="flex-1 min-w-0">
            <p
              class="font-medium truncate text-sm"
              style="color: {isCurrentTrack ? textColor : 'var(--foreground)'};"
            >
              {trackTitle}
            </p>
            <p
              class="text-xs truncate"
              style="color: {isCurrentTrack
                ? textColor
                : 'var(--muted-foreground)'};"
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
      {/snippet}
    </VirtualScroll>
  </Dialog.Content>
</Dialog.Root>

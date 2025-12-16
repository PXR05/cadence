<script lang="ts">
  import { playerStore } from "$lib/stores/player.svelte";
  import * as Dialog from "$lib/components/ui/dialog";
  import { ChevronDown } from "@lucide/svelte";
  import { VirtualScroll } from "../ui/virtual-scroll";
  import QueueItem from "./QueueItem.svelte";

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }

  let { open = $bindable(), onOpenChange }: Props = $props();

  let virtualScroll: any = $state(null);
  const ROW_HEIGHT = 52;
  let previousOpen = $state(false);

  $effect(() => {
    if (!open) {
      return;
    }
    if (open && !previousOpen && virtualScroll && playerStore.queueIndex >= 0) {
      virtualScroll?.scrollToIndex(playerStore.queueIndex, false);
    }
    previousOpen = open;
  });
</script>

<Dialog.Root bind:open {onOpenChange}>
  <Dialog.Content
    showCloseButton={false}
    class="md:max-w-2xl h-dvh md:h-[90dvh] overflow-clip max-w-dvw flex flex-col z-60 p-0 max-md:border-0 rounded-none md:rounded-2xl bg-background"
  >
    <div
      class="absolute top-1.5 left-1.5 right-1.5 z-10 rounded-lg bg-muted border border-input/15 p-2 flex justify-between items-center"
    >
      <Dialog.Close
        class="opacity-70 transition-opacity hover:opacity-100 my-auto size-8 grid place-items-center"
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
      class="mt-14 h-[calc(100dvh-3.5rem)] md:h-[calc(90dvh-3.5rem)]"
      topOffset={4}
      leftPadding={8}
      rightPadding={8}
      itemGap={4}
      getItemKey={(track) => track.id ?? track.filename}
      enableDragReorder
      onReorder={(from, to) => playerStore.reorderQueue(from, to)}
    >
      {#snippet emptyState()}
        <div class="text-center py-8 text-muted-foreground pt-15.5">
          No tracks in queue
        </div>
      {/snippet}

      {#snippet children({ item: track, index, dragHandleProps })}
        {@const isCurrentTrack = index === playerStore.queueIndex}
        <QueueItem {index} {track} {isCurrentTrack} {dragHandleProps} />
      {/snippet}
    </VirtualScroll>
  </Dialog.Content>
</Dialog.Root>

<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
  import * as Drawer from "$lib/components/ui/drawer";
  import { playerStore } from "$lib/stores/player.svelte";
  import { ChevronDown, ListMusicIcon } from "@lucide/svelte";
  import { MediaQuery } from "svelte/reactivity";
  import { VirtualScroll } from "../ui/virtual-scroll";
  import QueueItem from "./QueueItem.svelte";
  import { useMenuDialogState } from "$lib/hooks";

  const dialogState = useMenuDialogState({
    paramName: "queue-dialog",
  });

  const isDesktop = new MediaQuery("(min-width: 768px)");

  let virtualScroll: any = $state(null);
  const ROW_HEIGHT = 68;
  let previousOpen = $state(false);
  let previousQueueIndex = $state(-1);

  let touchStartY = 0;
  let isTouchActive = false;

  function handleTouchStart(e: TouchEvent) {
    if (isDesktop.current) return;

    const container = virtualScroll?.getContainerRef?.();
    if (!container) return;

    if (container.scrollTop <= 0) {
      touchStartY = e.touches[0].clientY;
      isTouchActive = true;
    }
  }

  function handleTouchMove(e: TouchEvent) {
    if (!isTouchActive || isDesktop.current) return;

    const container = virtualScroll?.getContainerRef?.();
    if (!container) return;

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY;

    if (container.scrollTop <= 0 && deltaY > 0) {
      e.preventDefault();
      e.stopPropagation();
    } else {
      isTouchActive = false;
    }
  }

  function handleTouchEnd() {
    isTouchActive = false;
  }

  $effect(() => {
    if (isDesktop.current) return;

    const container = virtualScroll?.getContainerRef?.();
    if (!container) return;

    container.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    container.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  });

  $effect(() => {
    const isOpening = dialogState.isOpen && !previousOpen;
    const queueIndexChanged =
      playerStore.queueIndex !== previousQueueIndex &&
      playerStore.queueIndex >= 0;
    const shouldScroll = dialogState.isOpen && (isOpening || queueIndexChanged);

    if (shouldScroll && virtualScroll) {
      requestAnimationFrame(() => {
        setTimeout(() => {
          virtualScroll?.scrollToIndex(playerStore.queueIndex, false);
        }, 0);
      });
    }

    previousOpen = dialogState.isOpen;
    previousQueueIndex = playerStore.queueIndex;
  });
</script>

{#snippet header()}
  <div
    class="absolute top-1.5 left-1.5 right-1.5 z-10 rounded-lg bg-muted border border-input/15 p-2 flex justify-between items-center"
  >
    {#if isDesktop.current}
      <Dialog.Close
        class="opacity-70 transition-opacity hover:opacity-100 my-auto size-8 grid place-items-center"
      >
        <ChevronDown />
      </Dialog.Close>
    {:else}
      <Drawer.Close
        class="opacity-70 transition-opacity hover:opacity-100 my-auto size-8 grid place-items-center"
      >
        <ChevronDown />
      </Drawer.Close>
    {/if}

    <div class="flex items-center gap-2 text-sm text-muted-foreground">
      <ListMusicIcon class="size-4" />
      <span>
        {playerStore.queueLength} track{playerStore.queueLength !== 1
          ? "s"
          : ""} in queue
      </span>
    </div>

    {#if isDesktop.current}
      <Dialog.Close class="opacity-0 pointer-events-none">
        <ChevronDown />
      </Dialog.Close>
    {:else}
      <Drawer.Close class="opacity-0 pointer-events-none">
        <ChevronDown />
      </Drawer.Close>
    {/if}
  </div>
{/snippet}

{#snippet queueContent()}
  <VirtualScroll
    bind:this={virtualScroll}
    items={playerStore.trackQueue}
    rowHeight={ROW_HEIGHT}
    class="overscroll-y-contain mt-8 md:mt-13 h-[calc(80dvh-3.5rem)] md:h-[calc(90dvh-3.5rem)]"
    topOffset={8}
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
{/snippet}

{#if isDesktop.current}
  <Dialog.Root
    open={dialogState.isOpen}
    onOpenChange={dialogState.handleOpenChange}
  >
    <Dialog.Content
      showCloseButton={false}
      class="md:max-w-2xl h-[90dvh] overflow-clip max-w-dvw flex flex-col z-60 p-0 max-md:border-0 rounded-none md:rounded-2xl bg-background"
    >
      {@render header()}
      {@render queueContent()}
    </Dialog.Content>
  </Dialog.Root>
{:else}
  <Drawer.Root
    open={dialogState.isOpen}
    onOpenChange={dialogState.handleOpenChange}
  >
    <Drawer.Content class="overflow-clip p-0 rounded-t-2xl bg-background">
      {@render header()}
      {@render queueContent()}
    </Drawer.Content>
  </Drawer.Root>
{/if}

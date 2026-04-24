<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
  import * as Drawer from "$lib/components/ui/drawer";
  import { playerStore } from "$lib/stores/player.svelte";
  import { VirtualScroll } from "../ui/virtual-scroll";
  import QueueItem from "./QueueItem.svelte";
  import { useDialogState, useMenuDialogState } from "$lib/hooks";
  import { innerWidth } from "svelte/reactivity/window";
  import { appearanceStore } from "$lib/stores/appearance.svelte";

  const dialogState = useMenuDialogState({
    paramName: "queue-dialog",
  });

  const panelState = useDialogState("player-detail");

  const isDesktop = $derived((innerWidth.current ?? 0) >= 768);

  let virtualScroll: any = $state(null);
  const ROW_HEIGHT = 74;
  let previousOpen = $state(false);
  let previousQueueIndex = $state(-1);

  let touchStartY = 0;
  let isTouchActive = false;

  function handleTouchStart(e: TouchEvent) {
    if (isDesktop) return;

    const container = virtualScroll?.getContainerRef?.();
    if (!container) return;

    if (container.scrollTop <= 0) {
      touchStartY = e.touches[0].clientY;
      isTouchActive = true;
    }
  }

  function handleTouchMove(e: TouchEvent) {
    if (!isTouchActive || isDesktop) return;

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
    if (isDesktop) return;

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
    const shouldScroll = dialogState.isOpen && !previousOpen;

    if (shouldScroll && virtualScroll) {
      requestAnimationFrame(() => {
        setTimeout(() => {
          virtualScroll?.scrollToIndex(playerStore.queueIndex, false);
        }, 0);
      });
    }

    if (virtualScroll) {
      previousOpen = dialogState.isOpen;
      previousQueueIndex = playerStore.queueIndex;
    }
  });
</script>

{#snippet header()}
  <button
    onclick={() =>
      dialogState.isOpen
        ? dialogState.close()
        : dialogState.open("queue-dialog")}
    class="absolute top-2 left-2 right-2 z-10 rounded-3xl border border-muted-foreground/10 flex flex-col
    {appearanceStore.disableBlur
      ? 'bg-muted'
      : 'bg-muted-foreground/10 dark:bg-muted/60 backdrop-blur-md'}"
  >
    <div class="px-2 py-3 flex justify-between items-center">
      <div class="size-8"></div>

      <p class="text-center text-sm text-muted-foreground min-w-0">
        {playerStore.queueLength} track{playerStore.queueLength !== 1
          ? "s"
          : ""} in queue
      </p>

      <div class="size-8"></div>
    </div>
  </button>
{/snippet}

{#snippet queueContent()}
  <VirtualScroll
    bind:this={virtualScroll}
    items={playerStore.trackQueue}
    rowHeight={ROW_HEIGHT}
    class="overscroll-y-contain h-dvh md:h-[90dvh]"
    topOffset={isDesktop ? 72 : 54}
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

{#if isDesktop}
  <Dialog.Root
    open={dialogState.isOpen}
    onOpenChange={dialogState.handleOpenChange}
  >
    <Dialog.Content
      showCloseButton={false}
      class="md:max-w-2xl h-dvh md:h-[90dvh] overflow-clip max-w-dvw flex flex-col z-60 p-0 max-md:border-0 max-md:rounded-none bg-background"
    >
      <div
        class="absolute z-10 inset-0 flex flex-col h-dvh md:h-[90dvh] pointer-events-none"
        style="
          background: linear-gradient(
            to top,
            color-mix(in oklab, var(--background) 100%, transparent) 0%,
            color-mix(in oklab, var(--background) 0%, transparent) 10%,
            color-mix(in oklab, var(--background) 0%, transparent) 90%,
            color-mix(in oklab, var(--background) 100%, transparent) 100%
          );
        "
      ></div>
      {@render header()}
      {@render queueContent()}
    </Dialog.Content>
  </Dialog.Root>
{:else}
  <Drawer.Root
    open={dialogState.isOpen}
    onOpenChange={dialogState.handleOpenChange}
  >
    <Drawer.Content class="h-dvh overflow-clip p-0 rounded-t-2xl bg-background">
      <div
        class="absolute z-10 inset-0 flex flex-col h-dvh pointer-events-none"
        style="
          background: linear-gradient(
            to top,
            color-mix(in oklab, var(--background) 100%, transparent) 0%,
            color-mix(in oklab, var(--background) 0%, transparent) 10%,
            color-mix(in oklab, var(--background) 0%, transparent) 90%,
            color-mix(in oklab, var(--background) 100%, transparent) 100%
          );
        "
      ></div>
      {@render header()}
      {@render queueContent()}
    </Drawer.Content>
  </Drawer.Root>
{/if}

<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
  import * as Drawer from "$lib/components/ui/drawer";
  import { playerStore } from "$lib/stores/player.svelte";
  import { ChevronDown, ListMusicIcon } from "@lucide/svelte";
  import { MediaQuery } from "svelte/reactivity";
  import { VirtualScroll } from "../ui/virtual-scroll";
  import QueueItem from "./QueueItem.svelte";

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }

  let { open = $bindable(), onOpenChange }: Props = $props();

  const isDesktop = new MediaQuery("(min-width: 768px)");

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
    class="mt-8 md:mt-13 h-[calc(80dvh-3.5rem)] md:h-[calc(90dvh-3.5rem)]"
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
  <Dialog.Root {open} {onOpenChange}>
    <Dialog.Content
      showCloseButton={false}
      class="md:max-w-2xl h-[90dvh] overflow-clip max-w-dvw flex flex-col z-60 p-0 max-md:border-0 rounded-none md:rounded-2xl bg-background"
    >
      {@render header()}
      {@render queueContent()}
    </Dialog.Content>
  </Dialog.Root>
{:else}
  <Drawer.Root {open} {onOpenChange}>
    <Drawer.Content class="overflow-clip p-0 rounded-t-2xl bg-background">
      {@render header()}
      {@render queueContent()}
    </Drawer.Content>
  </Drawer.Root>
{/if}

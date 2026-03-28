<script lang="ts" generics="T">
  import {
    createVirtualizer,
    type VirtualItem,
  } from "@tanstack/svelte-virtual";
  import type { Snippet } from "svelte";
  import { get } from "svelte/store";

  interface Props {
    items: T[];
    rowHeight: number;
    firstItemHeight?: number;
    overscan?: number;
    class?: string;
    containerClass?: string;
    contentClass?: string;
    topOffset?: number;
    leftPadding?: number;
    rightPadding?: number;
    itemGap?: number;
    getItemKey?: (item: T, index: number) => string | number;
    initialScrollIndex?: number;
    scrollThrottle?: number;
    onScroll?: (scrollTop: number) => void;
    onVisibleRangeChange?: (start: number, end: number) => void;
    onScrollDirectionChange?: (direction: "up" | "down" | null) => void;
    emptyState?: Snippet;
    children: Snippet<
      [
        {
          item: T;
          index: number;
          visibleIndex: number;
          actualIndex: number;
          dragHandleProps?: DragHandleProps;
        },
      ]
    >;
    enableDragReorder?: boolean;
    onReorder?: (fromIndex: number, toIndex: number) => void;
  }

  interface DragHandleProps {
    onpointerdown: (e: PointerEvent) => void;
    style: string;
  }

  let {
    items,
    rowHeight,
    firstItemHeight,
    overscan = 10,
    class: className,
    containerClass,
    contentClass,
    topOffset = 0,
    leftPadding = 0,
    rightPadding = 0,
    itemGap = 0,
    getItemKey,
    initialScrollIndex = 0,
    scrollThrottle = 16,
    onScroll,
    onVisibleRangeChange,
    onScrollDirectionChange,
    emptyState,
    children,
    enableDragReorder = false,
    onReorder,
  }: Props = $props();

  let isDragging = $state(false);
  let dragFromIndex = $state(-1);
  let dragToIndex = $state(-1);
  let dragOffsetY = $state(0);
  let pointerY = $state(0);
  let autoScrollInterval: number | null = null;

  let containerRef = $state<HTMLDivElement | null>(null);
  let lastScrollTop = $state(0);
  let scrollDirection = $state<"up" | "down" | null>(null);
  let scrollTimeout: number | null = null;
  let isInitialized = $state(false);
  let fallbackOffset = $state(0);

  let virtualItems = $state<VirtualItem[]>([]);
  let totalSize = $state(0);
  let visibleRange = $state({ start: -1, end: -1 });
  const dragHandleStyle = "cursor: grab; touch-action: none;";

  const itemSize = $derived(Math.max(1, rowHeight + itemGap));
  const firstItemSize = $derived(
    Math.max(1, (firstItemHeight ?? rowHeight) + itemGap),
  );

  function getItemSizeByIndex(index: number): number {
    return index === 0 ? firstItemSize : itemSize;
  }

  function getOffsetForIndex(index: number): number {
    if (index <= 0) return 0;
    return firstItemSize + Math.max(0, index - 1) * itemSize;
  }

  const virtualContentHeight = $derived(Math.max(0, totalSize - itemGap));
  const fallbackContentHeight = $derived(
    Math.max(
      0,
      items.length === 0
        ? 0
        : firstItemSize + Math.max(0, items.length - 1) * itemSize - itemGap,
    ),
  );
  const scrollContentHeight = $derived(
    virtualContentHeight > 0 ? virtualContentHeight : fallbackContentHeight,
  );
  const fallbackRenderCount = $derived(
    Math.min(
      items.length,
      Math.max(
        12,
        Math.ceil((containerRef?.clientHeight ?? 600) / itemSize) +
          overscan * 2,
      ),
    ),
  );
  const fallbackStart = $derived(Math.max(0, fallbackOffset));
  const fallbackEnd = $derived(
    Math.min(items.length, fallbackStart + fallbackRenderCount),
  );
  const hasReachedEnd = $derived(
    items.length > 0 &&
      (virtualItems.length > 0
        ? virtualItems[virtualItems.length - 1].index >= items.length - 1
        : fallbackEnd >= items.length),
  );

  const virtualizer = createVirtualizer<HTMLDivElement, HTMLDivElement>({
    count: 0,
    getScrollElement: () => containerRef,
    estimateSize: () => 1,
    overscan: 5,
  });

  function getKey(item: T, index: number): string | number {
    if (getItemKey) {
      return getItemKey(item, index);
    }
    if (item && typeof item === "object" && "id" in item) {
      return (item as any).id;
    }
    return index;
  }

  function toVisibleRange(currentItems: VirtualItem[]): {
    start: number;
    end: number;
  } {
    if (items.length === 0 || currentItems.length === 0) {
      return { start: 0, end: 0 };
    }

    const start = currentItems[0].index;
    const end = Math.min(
      items.length,
      currentItems[currentItems.length - 1].index + 1,
    );

    return { start, end };
  }

  function throttledScroll(callback: () => void) {
    if (scrollTimeout !== null) return;

    scrollTimeout = window.setTimeout(() => {
      callback();
      scrollTimeout = null;
    }, scrollThrottle);
  }

  function handleScroll(e: Event) {
    const ref = e.target as HTMLDivElement;
    const scrollTop = ref.scrollTop;

    throttledScroll(() => {
      const newDirection =
        scrollTop > lastScrollTop
          ? "down"
          : scrollTop < lastScrollTop
            ? "up"
            : null;

      if (newDirection !== scrollDirection) {
        scrollDirection = newDirection;
        onScrollDirectionChange?.(newDirection);
      }

      lastScrollTop = scrollTop;
      const rawFallbackIndex =
        items.length === 0
          ? 0
          : scrollTop < firstItemSize
            ? 0
            : 1 + Math.floor((scrollTop - firstItemSize) / itemSize);
      fallbackOffset = Math.max(0, rawFallbackIndex - overscan);
      onScroll?.(scrollTop);
    });
  }

  function calculateTargetIndex(clientY: number): number {
    if (!containerRef || items.length === 0) return -1;

    const rect = containerRef.getBoundingClientRect();
    const scrollTop = containerRef.scrollTop;
    const relativeY = clientY - rect.top + scrollTop - topOffset;

    if (relativeY <= 0) return 0;
    if (relativeY < firstItemSize) return 0;

    const remainingY = relativeY - firstItemSize;
    const targetIndex = 1 + Math.floor(remainingY / itemSize);
    return Math.max(0, Math.min(items.length - 1, targetIndex));
  }

  function stopAutoScroll() {
    if (autoScrollInterval !== null) {
      clearInterval(autoScrollInterval);
      autoScrollInterval = null;
    }
  }

  function startAutoScroll(clientY: number) {
    if (!containerRef || !isDragging) return;

    const rect = containerRef.getBoundingClientRect();
    const edgeThreshold = 60;
    const scrollSpeed = 8;
    const maxScrollTop = Math.max(
      0,
      containerRef.scrollHeight - containerRef.clientHeight,
    );

    stopAutoScroll();

    if (clientY - rect.top < edgeThreshold) {
      autoScrollInterval = window.setInterval(() => {
        if (!containerRef) return;
        containerRef.scrollTop = Math.max(
          0,
          containerRef.scrollTop - scrollSpeed,
        );
        dragToIndex = calculateTargetIndex(pointerY);
      }, 16);
    } else if (rect.bottom - clientY < edgeThreshold) {
      autoScrollInterval = window.setInterval(() => {
        if (!containerRef) return;
        containerRef.scrollTop = Math.min(
          maxScrollTop,
          containerRef.scrollTop + scrollSpeed,
        );
        dragToIndex = calculateTargetIndex(pointerY);
      }, 16);
    }
  }

  function handleDragStart(index: number, e: PointerEvent) {
    if (!enableDragReorder || !onReorder) return;
    if (e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();

    isDragging = true;
    dragFromIndex = index;
    dragToIndex = index;
    pointerY = e.clientY;

    if (containerRef) {
      const rect = containerRef.getBoundingClientRect();
      const scrollTop = containerRef.scrollTop;
      const itemTop =
        getOffsetForIndex(index) + topOffset - scrollTop + rect.top;
      dragOffsetY = e.clientY - itemTop;
    }

    window.addEventListener("pointermove", handleDragMove);
    window.addEventListener("pointerup", handleDragEnd);
    window.addEventListener("pointercancel", handleDragEnd);
  }

  function handleDragMove(e: PointerEvent) {
    if (!isDragging) return;

    e.preventDefault();

    pointerY = e.clientY;
    dragToIndex = calculateTargetIndex(e.clientY);
    startAutoScroll(e.clientY);
  }

  function handleDragEnd() {
    if (!isDragging) return;

    stopAutoScroll();
    window.removeEventListener("pointermove", handleDragMove);
    window.removeEventListener("pointerup", handleDragEnd);
    window.removeEventListener("pointercancel", handleDragEnd);

    if (
      onReorder &&
      dragFromIndex !== dragToIndex &&
      dragFromIndex >= 0 &&
      dragToIndex >= 0
    ) {
      onReorder(dragFromIndex, dragToIndex);
    }

    isDragging = false;
    dragFromIndex = -1;
    dragToIndex = -1;
    dragOffsetY = 0;
  }

  function getDragOffset(actualIndex: number): number {
    if (!isDragging || dragFromIndex < 0 || dragToIndex < 0) return 0;

    const dragItemSize = getItemSizeByIndex(dragFromIndex);

    if (actualIndex === dragFromIndex) {
      if (!containerRef) return 0;
      const rect = containerRef.getBoundingClientRect();
      const scrollTop = containerRef.scrollTop;
      const currentTop = getOffsetForIndex(dragFromIndex);
      const pointerRelativeTop =
        pointerY - rect.top + scrollTop - topOffset - dragOffsetY;
      return pointerRelativeTop - currentTop;
    }

    if (dragFromIndex < dragToIndex) {
      if (actualIndex > dragFromIndex && actualIndex <= dragToIndex) {
        return -dragItemSize;
      }
    } else if (dragFromIndex > dragToIndex) {
      if (actualIndex >= dragToIndex && actualIndex < dragFromIndex) {
        return dragItemSize;
      }
    }

    return 0;
  }

  $effect(() => {
    const instance = get(virtualizer);
    const scrollElement = containerRef;
    const currentItems = items;
    const currentOverscan = overscan;

    instance.setOptions({
      count: currentItems.length,
      getScrollElement: () => scrollElement,
      estimateSize: (index: number) => getItemSizeByIndex(index),
      overscan: currentOverscan,
      getItemKey: (index: number) => {
        const item = currentItems[index];
        return item === undefined ? index : getKey(item, index);
      },
    });

    if (scrollElement) {
      instance.measure();
      virtualItems = instance.getVirtualItems();
      totalSize = instance.getTotalSize();
    }
  });

  $effect(() => {
    const unsubscribe = virtualizer.subscribe((instance) => {
      virtualItems = instance.getVirtualItems();
      totalSize = instance.getTotalSize();
    });

    return () => {
      unsubscribe();
    };
  });

  $effect(() => {
    const nextRange =
      virtualItems.length > 0
        ? toVisibleRange(virtualItems)
        : { start: fallbackStart, end: fallbackEnd };

    if (
      nextRange.start !== visibleRange.start ||
      nextRange.end !== visibleRange.end
    ) {
      visibleRange = nextRange;
      onVisibleRangeChange?.(nextRange.start, nextRange.end);
    }
  });

  $effect(() => {
    if (!isDragging) return;

    return () => {
      stopAutoScroll();
      window.removeEventListener("pointermove", handleDragMove);
      window.removeEventListener("pointerup", handleDragEnd);
      window.removeEventListener("pointercancel", handleDragEnd);
    };
  });

  $effect(() => {
    if (containerRef && !isInitialized && items.length > 0) {
      if (initialScrollIndex > 0) {
        scrollToIndex(initialScrollIndex, false);
      }
      isInitialized = true;
    }
  });

  $effect(() => {
    if (!containerRef) return;

    containerRef.addEventListener("scroll", handleScroll);

    return () => {
      containerRef?.removeEventListener("scroll", handleScroll);
      if (scrollTimeout !== null) {
        clearTimeout(scrollTimeout);
      }
    };
  });

  export function getContainerRef() {
    return containerRef;
  }

  export function scrollToTop(smooth = true) {
    if (containerRef) {
      containerRef.scrollTo({
        top: 0,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  }

  export function scrollToIndex(index: number, smooth = true) {
    if (containerRef && index >= 0 && index < items.length) {
      const scrollTop = Math.max(0, getOffsetForIndex(index) - 100);
      containerRef.scrollTo({
        top: scrollTop,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  }

  export function scrollToBottom(smooth = true) {
    if (containerRef) {
      const maxTop = Math.max(
        0,
        scrollContentHeight - containerRef.clientHeight,
      );
      containerRef.scrollTo({
        top: maxTop,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  }

  export function getVisibleRange() {
    return {
      start: Math.max(0, visibleRange.start),
      end: Math.max(0, visibleRange.end),
    };
  }

  export function getScrollDirection() {
    return scrollDirection;
  }

  export function isDraggingItem() {
    return isDragging;
  }
</script>

<div
  class={"overflow-y-scroll " + (className ?? "")}
  bind:this={containerRef}
  role="list"
  aria-label="Virtualized list"
  aria-busy={items.length === 0}
>
  {#if items.length === 0 && emptyState}
    {@render emptyState()}
  {:else}
    <div
      class={containerClass}
      style="
        position: relative;
        width: 100%;
        height: {scrollContentHeight + topOffset}px;"
    >
      <div
        class={contentClass}
        style="
          position: relative;
          width: 100%;
          height: 100%;"
      >
        {#if virtualItems.length > 0}
          {#each virtualItems as virtualItem, visibleIndex (virtualItem.key)}
            {@const actualIndex = virtualItem.index}
            {@const item = items[actualIndex]}
            {@const dragOffset = getDragOffset(actualIndex)}
            {@const isBeingDragged =
              isDragging && actualIndex === dragFromIndex}

            {#if item !== undefined}
              <div
                role="listitem"
                aria-setsize={items.length}
                aria-posinset={actualIndex + 1}
                style="
                  position: absolute;
                  top: 0;
                  left: {leftPadding}px;
                  right: {rightPadding}px;
                  height: {virtualItem.size}px;
                  transition: {isDragging && !isBeingDragged
                  ? 'transform 150ms ease'
                  : 'none'};
                  transform: translate3d(0, {topOffset +
                  virtualItem.start +
                  dragOffset}px, 0);
                  {isBeingDragged ? 'z-index: 50;' : ''}"
                class={isBeingDragged ? "opacity-90 shadow-lg" : ""}
              >
                {@render children({
                  item,
                  index: actualIndex,
                  visibleIndex,
                  actualIndex,
                  dragHandleProps: enableDragReorder
                    ? {
                        onpointerdown: (e: PointerEvent) =>
                          handleDragStart(actualIndex, e),
                        style: dragHandleStyle,
                      }
                    : undefined,
                })}
              </div>
            {/if}
          {/each}
        {:else}
          {#each items.slice(fallbackStart, fallbackEnd) as item, i (getKey(item, fallbackStart + i))}
            {@const actualIndex = fallbackStart + i}
            {@const dragOffset = getDragOffset(actualIndex)}
            {@const isBeingDragged =
              isDragging && actualIndex === dragFromIndex}
            <div
              role="listitem"
              aria-setsize={items.length}
              aria-posinset={actualIndex + 1}
              style="
                position: absolute;
                top: 0;
                left: {leftPadding}px;
                right: {rightPadding}px;
                height: {getItemSizeByIndex(actualIndex)}px;
                transition: {isDragging && !isBeingDragged
                ? 'transform 150ms ease'
                : 'none'};
                transform: translate3d(0, {topOffset +
                getOffsetForIndex(actualIndex) +
                dragOffset}px, 0);
                {isBeingDragged ? 'z-index: 50;' : ''}"
              class={isBeingDragged ? "opacity-90 shadow-lg" : ""}
            >
              {@render children({
                item,
                index: actualIndex,
                visibleIndex: i,
                actualIndex,
                dragHandleProps: enableDragReorder
                  ? {
                      onpointerdown: (e: PointerEvent) =>
                        handleDragStart(actualIndex, e),
                      style: dragHandleStyle,
                    }
                  : undefined,
              })}
            </div>
          {/each}
        {/if}

        {#if hasReachedEnd}
          <div
            class="h-72"
            style="
              position: absolute;
              top: {topOffset + scrollContentHeight}px;
              left: 0;
              right: 0;"
          ></div>
        {/if}
      </div>
    </div>
  {/if}
</div>

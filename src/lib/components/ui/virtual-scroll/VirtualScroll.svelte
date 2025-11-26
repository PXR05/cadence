<script lang="ts" generics="T">
  import { ScrollArea } from "../scroll-area";
  import type { Snippet } from "svelte";

  interface Props {
    items: T[];
    rowHeight: number;
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

  let pagination = $state({
    offset: 0,
    pageSize: 20,
  });

  const range = $derived({
    start: Math.max(0, pagination.offset - overscan),
    end: Math.min(
      items.length,
      pagination.offset + pagination.pageSize + overscan,
    ),
  });

  let containerRef = $state<HTMLDivElement | null>(null);
  let contentRef = $state<HTMLDivElement | null>(null);
  let lastScrollTop = $state(0);
  let scrollDirection = $state<"up" | "down" | null>(null);
  let scrollTimeout: number | null = null;
  let isInitialized = $state(false);

  function calculateTargetIndex(clientY: number): number {
    if (!containerRef) return -1;
    const rect = containerRef.getBoundingClientRect();
    const scrollTop = containerRef.scrollTop;
    const relativeY = clientY - rect.top + scrollTop - topOffset;
    const targetIndex = Math.floor(relativeY / rowHeight);
    return Math.max(0, Math.min(items.length - 1, targetIndex));
  }

  function startAutoScroll(clientY: number) {
    if (!containerRef) return;
    const rect = containerRef.getBoundingClientRect();
    const edgeThreshold = 60;
    const scrollSpeed = 8;

    stopAutoScroll();

    if (clientY - rect.top < edgeThreshold) {
      autoScrollInterval = window.setInterval(() => {
        if (containerRef) {
          containerRef.scrollTop -= scrollSpeed;
          dragToIndex = calculateTargetIndex(pointerY);
        }
      }, 16);
    } else if (rect.bottom - clientY < edgeThreshold) {
      autoScrollInterval = window.setInterval(() => {
        if (containerRef) {
          containerRef.scrollTop += scrollSpeed;
          dragToIndex = calculateTargetIndex(pointerY);
        }
      }, 16);
    }
  }

  function stopAutoScroll() {
    if (autoScrollInterval !== null) {
      clearInterval(autoScrollInterval);
      autoScrollInterval = null;
    }
  }

  function handleDragStart(index: number, e: PointerEvent) {
    if (!enableDragReorder) return;
    e.preventDefault();

    isDragging = true;
    dragFromIndex = index;
    dragToIndex = index;
    pointerY = e.clientY;

    if (containerRef) {
      const rect = containerRef.getBoundingClientRect();
      const scrollTop = containerRef.scrollTop;
      const itemTop = index * rowHeight + topOffset - scrollTop + rect.top;
      dragOffsetY = e.clientY - itemTop;
    }

    window.addEventListener("pointermove", handleDragMove);
    window.addEventListener("pointerup", handleDragEnd);
  }

  function handleDragMove(e: PointerEvent) {
    if (!isDragging) return;
    e.preventDefault();

    pointerY = e.clientY;
    dragToIndex = calculateTargetIndex(e.clientY);
    startAutoScroll(e.clientY);
  }

  function handleDragEnd(e: PointerEvent) {
    if (!isDragging) return;

    stopAutoScroll();
    window.removeEventListener("pointermove", handleDragMove);
    window.removeEventListener("pointerup", handleDragEnd);

    if (
      dragFromIndex !== dragToIndex &&
      dragFromIndex >= 0 &&
      dragToIndex >= 0
    ) {
      onReorder?.(dragFromIndex, dragToIndex);
    }

    isDragging = false;
    dragFromIndex = -1;
    dragToIndex = -1;
    dragOffsetY = 0;
  }

  function getDragHandleProps(index: number): DragHandleProps {
    return {
      onpointerdown: (e: PointerEvent) => handleDragStart(index, e),
      style: "cursor: grab; touch-action: none;",
    };
  }

  function getDragTransform(actualIndex: number): string {
    if (!isDragging || dragFromIndex < 0 || dragToIndex < 0) return "";

    if (actualIndex === dragFromIndex) {
      if (containerRef) {
        const rect = containerRef.getBoundingClientRect();
        const scrollTop = containerRef.scrollTop;
        const currentTop = dragFromIndex * rowHeight + topOffset;
        const targetTop =
          pointerY - rect.top + scrollTop - topOffset - dragOffsetY;
        const offset = targetTop - currentTop;
        return `translateY(${offset}px)`;
      }
    } else if (dragFromIndex < dragToIndex) {
      if (actualIndex > dragFromIndex && actualIndex <= dragToIndex) {
        return `translateY(-${rowHeight}px)`;
      }
    } else if (dragFromIndex > dragToIndex) {
      if (actualIndex >= dragToIndex && actualIndex < dragFromIndex) {
        return `translateY(${rowHeight}px)`;
      }
    }
    return "";
  }

  function handleResize(ref: HTMLDivElement | null) {
    if (!ref) return;
    const clientHeight = ref.clientHeight;
    const visibleRows = Math.ceil(clientHeight / rowHeight);
    pagination.pageSize = visibleRows;
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
      const newOffset = Math.floor(scrollTop / rowHeight);
      const oldOffset = pagination.offset;

      pagination.offset = newOffset;

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

      onScroll?.(scrollTop);

      if (oldOffset !== newOffset) {
        onVisibleRangeChange?.(range.start, range.end);
      }
    });
  }

  $effect(() => {
    if (containerRef && !isInitialized && items.length > 0) {
      if (initialScrollIndex > 0) {
        scrollToIndex(initialScrollIndex, false);
      }
      isInitialized = true;
    }
  });

  $effect(() => {
    if (range.start !== undefined && range.end !== undefined) {
      onVisibleRangeChange?.(range.start, range.end);
    }
  });

  $effect(() => {
    if (containerRef) {
      handleResize(containerRef);
      const resizeHandler = () => handleResize(containerRef);
      window.addEventListener("resize", resizeHandler);
      containerRef.addEventListener("scroll", handleScroll);

      return () => {
        window.removeEventListener("resize", resizeHandler);
        containerRef?.removeEventListener("scroll", handleScroll);
        if (scrollTimeout !== null) {
          clearTimeout(scrollTimeout);
        }
      };
    }
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

  export function getContainerRef() {
    return containerRef;
  }

  export function scrollToTop(smooth = true) {
    if (containerRef) {
      containerRef.scrollTo({
        top: 0,
        behavior: smooth ? "smooth" : "auto",
      });
      pagination.offset = 0;
    }
  }

  export function scrollToIndex(index: number, smooth = true) {
    if (containerRef && index >= 0 && index < items.length) {
      const scrollTop = index * rowHeight - 100;
      containerRef.scrollTo({
        top: scrollTop,
        behavior: smooth ? "smooth" : "auto",
      });
      pagination.offset = index;
    }
  }

  export function scrollToBottom(smooth = true) {
    if (containerRef) {
      const scrollTop = items.length * rowHeight;
      containerRef.scrollTo({
        top: scrollTop,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  }

  export function getVisibleRange() {
    return { start: range.start, end: range.end };
  }

  export function getScrollDirection() {
    return scrollDirection;
  }

  export function isDraggingItem() {
    return isDragging;
  }
</script>

<ScrollArea
  class={className}
  bind:ref={containerRef}
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
        height: {items.length * rowHeight + topOffset}px;
        padding-top: {topOffset}px;
        padding-left: {leftPadding}px;
        padding-right: {rightPadding}px;"
    >
      <div
        bind:this={contentRef}
        class={contentClass}
        style="
        position: absolute;
        display: flex;
        flex-direction: column;
        top: {topOffset}px;
        left: {leftPadding}px;
        right: {rightPadding}px;
        gap: {itemGap}px;
        transform: translateY({range.start * rowHeight}px);"
      >
        {#each items.slice(range.start, range.end) as item, i (getKey(item, range.start + i))}
          {@const actualIndex = range.start + i}
          {@const dragTransform = getDragTransform(actualIndex)}
          {@const isBeingDragged = isDragging && actualIndex === dragFromIndex}
          <div
            role="listitem"
            aria-setsize={items.length}
            aria-posinset={actualIndex + 1}
            style="transition: {isDragging && !isBeingDragged
              ? 'transform 150ms ease-out'
              : 'none'}; transform: {dragTransform}; {isBeingDragged
              ? 'z-index: 50; position: relative;'
              : ''}"
            class={isBeingDragged ? "opacity-90 shadow-lg" : ""}
          >
            {@render children({
              item,
              index: actualIndex,
              visibleIndex: i,
              actualIndex: actualIndex,
              dragHandleProps: enableDragReorder
                ? getDragHandleProps(actualIndex)
                : undefined,
            })}
          </div>
        {/each}
        {#if range.end >= items.length}
          <div class="h-72"></div>
        {/if}
      </div>
    </div>
  {/if}
</ScrollArea>

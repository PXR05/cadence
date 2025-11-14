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
      [{ item: T; index: number; visibleIndex: number; actualIndex: number }]
    >;
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
  }: Props = $props();

  let pagination = $state({
    offset: 0,
    pageSize: 20,
  });

  const range = $derived({
    start: Math.max(0, pagination.offset - overscan),
    end: Math.min(
      items.length,
      pagination.offset + pagination.pageSize + overscan
    ),
  });

  let containerRef = $state<HTMLDivElement | null>(null);
  let lastScrollTop = $state(0);
  let scrollDirection = $state<"up" | "down" | null>(null);
  let scrollTimeout: number | null = null;
  let isInitialized = $state(false);

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
          <div
            role="listitem"
            aria-setsize={items.length}
            aria-posinset={range.start + i + 1}
          >
            {@render children({
              item,
              index: range.start + i,
              visibleIndex: i,
              actualIndex: range.start + i,
            })}
          </div>
          {#if range.start + i === items.length - 1}
            <div class="h-72"></div>
          {/if}
        {/each}
      </div>
    </div>
  {/if}
</ScrollArea>

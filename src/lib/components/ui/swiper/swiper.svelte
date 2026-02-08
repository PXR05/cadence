<script lang="ts">
  import { onMount, type Snippet } from "svelte";

  interface Props {
    children: Snippet;
    onswipe?: (direction: "left" | "right") => void;
    threshold?: number;
    class?: string;
    disabled?: boolean;
  }

  const {
    children,
    onswipe,
    threshold = 100,
    class: className = "",
    disabled = false,
  }: Props = $props();

  let swipeContainer: HTMLDivElement;
  let isRemoving = $state(false);
  let removeDirection = $state<"left" | "right" | null>(null);

  onMount(() => {
    if (swipeContainer && !isRemoving) {
      const centerPosition =
        swipeContainer.scrollWidth / 2 - swipeContainer.clientWidth / 2;
      swipeContainer.scrollLeft = centerPosition;
    }
  });

  function onSwipeEnd(e: PointerEvent | TouchEvent) {
    if (!swipeContainer || isRemoving || disabled) return;

    const target = e.target as HTMLElement;
    if (target?.closest("[data-vaul-no-drag]")) return;

    const scroll_center = swipeContainer.scrollWidth / 2;
    const viewport_center = swipeContainer.clientWidth / 2;
    const current = swipeContainer.scrollLeft + viewport_center;
    const dx = current - scroll_center;

    if (Math.abs(dx) >= threshold) {
      isRemoving = true;
      removeDirection = dx < 0 ? "right" : "left";
      setTimeout(() => {
        onswipe?.(removeDirection!);
      }, 200);
    }
  }

  export function reset() {
    isRemoving = false;
    removeDirection = null;
  }

  export function recenter() {
    if (swipeContainer && !isRemoving) {
      const centerPosition =
        swipeContainer.scrollWidth / 2 - swipeContainer.clientWidth / 2;
      swipeContainer.scrollLeft = centerPosition;
    }
  }
</script>

<div
  class="swipe-container {className}"
  class:removing={isRemoving}
  class:removing-left={removeDirection === "left"}
  class:removing-right={removeDirection === "right"}
  bind:this={swipeContainer}
  ontouchend={onSwipeEnd}
  onpointerup={onSwipeEnd}
>
  <div class="swipe-pad"></div>
  <div class="swipe-content">
    {@render children()}
  </div>
  <div class="swipe-pad"></div>
</div>

<style>
  .swipe-container {
    width: 100%;
    scroll-snap-type: x mandatory;
    overflow-x: scroll;
    display: grid;
    grid-template-columns: auto 1fr auto;
    container-type: inline-size;
    transition:
      opacity 200ms cubic-bezier(0.32, 0.72, 0, 1),
      transform 200ms cubic-bezier(0.32, 0.72, 0, 1);

    &.removing {
      opacity: 0;
    }

    &.removing-left {
      transform: translateX(-100%);
    }

    &.removing-right {
      transform: translateX(100%);
    }

    .swipe-content {
      width: 100cqw;
      scroll-snap-align: center;
    }

    .swipe-pad {
      width: 50cqw;
    }
    @media (width > 768px) {
      .swipe-pad {
        width: 0;
      }
    }

    -ms-overflow-style: none;
    scrollbar-width: none;
    ::-webkit-scrollbar {
      display: none;
    }
  }
</style>

<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import { getEmblaContext } from "./context.js";
  import { cn, type WithElementRef } from "$lib/utils.js";

  type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
    onlongpress?: (e: TouchEvent) => void;
    longPressDuration?: number;
    longPressMoveThreshold?: number;
  };

  let {
    ref = $bindable(null),
    class: className,
    children,
    onlongpress,
    longPressDuration = 500,
    longPressMoveThreshold = 10,
    onclick,
    ...restProps
  }: Props = $props();

  const emblaCtx = getEmblaContext("<Carousel.Item/>");

  let longPressTimer: ReturnType<typeof setTimeout> | null = null;
  let touchStartPos = { x: 0, y: 0 };
  let longPressTriggered = false;
  let lastTouchEvent: TouchEvent | null = null;

  function handleTouchStart(e: TouchEvent) {
    if (!onlongpress) return;

    longPressTriggered = false;
    lastTouchEvent = e;
    const touch = e.touches[0];
    touchStartPos = { x: touch.clientX, y: touch.clientY };

    longPressTimer = setTimeout(() => {
      longPressTriggered = true;
      onlongpress(e);
    }, longPressDuration);
  }

  function handleTouchMove(e: TouchEvent) {
    if (!longPressTimer) return;

    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartPos.x);
    const deltaY = Math.abs(touch.clientY - touchStartPos.y);

    if (deltaX > longPressMoveThreshold || deltaY > longPressMoveThreshold) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  function handleTouchEnd() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  function handleClick(e: MouseEvent) {
    if (longPressTriggered) {
      e.preventDefault();
      e.stopPropagation();
      longPressTriggered = false;
      return;
    }
    if (onclick) {
      (onclick as (e: MouseEvent) => void)(e);
    }
  }
</script>

<div
  bind:this={ref}
  data-slot="carousel-item"
  role="group"
  aria-roledescription="slide"
  class={cn(
    "min-w-0 shrink-0 grow-0 basis-full",
    emblaCtx.orientation === "horizontal" ? "pl-4" : "pt-4",
    className
  )}
  data-embla-slide=""
  onclick={handleClick}
  ontouchstart={handleTouchStart}
  ontouchmove={handleTouchMove}
  ontouchend={handleTouchEnd}
  {...restProps}
>
  {@render children?.()}
</div>

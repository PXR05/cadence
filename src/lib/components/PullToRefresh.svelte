<script lang="ts">
  import { appearanceStore } from "$lib/stores/appearance.svelte";
  import type { WithElementRef } from "$lib/utils";
  import {
    ArrowDownIcon,
    LoaderIcon,
    RefreshCwIcon,
    RotateCcwIcon,
  } from "@lucide/svelte";
  import { onDestroy, onMount } from "svelte";
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { innerWidth } from "svelte/reactivity/window";
  import { createWebHaptics } from "web-haptics/svelte";

  const { trigger, destroy } = createWebHaptics();
  onDestroy(destroy);

  type Props = {
    enabled?: boolean;
    keepContentFixed?: boolean;
    stageOneThreshold?: number;
    stageTwoThreshold?: number;
    stageOneHold?: number;
    stageOneMinDurationMs?: number;
    maxPullDistance?: number;
    directionLockThreshold?: number;
    indicatorMinTopMarginPx?: number;
    indicatorShowThresholdPx?: number;
    onStageOne?: () => Promise<void> | void;
    onStageTwo?: () => Promise<void> | void;
    children?: Snippet;
  } & WithElementRef<HTMLAttributes<HTMLDivElement>>;

  let {
    enabled = true,
    keepContentFixed = true,
    stageOneThreshold = 72,
    stageTwoThreshold,
    stageOneHold = 88,
    stageOneMinDurationMs = 300,
    maxPullDistance = 248,
    directionLockThreshold = 8,
    indicatorMinTopMarginPx = 16,
    indicatorShowThresholdPx = 24,
    onStageOne,
    onStageTwo,
    children,
    class: className,
    ...rest
  }: Props = $props();

  const isMobile = $derived((innerWidth.current ?? 0) <= 768);
  const resolvedStageTwoThreshold = $derived(
    stageTwoThreshold ?? (maxPullDistance * 0.8),
  );

  let pullHostEl: HTMLElement | null = null;
  let pullIndicatorEl: HTMLElement | null = null;
  let pullIndicatorBadgeEl: HTMLElement | null = null;
  let scrollContainerEl: HTMLElement | null = null;
  let pullFrameId: number | null = null;
  let indicatorPulseAnimation: Animation | null = null;
  let currentPullOffset = 0;
  let pendingPullOffset = 0;
  let touchStartX = 0;
  let touchStartY = 0;
  let isPointerTracking = false;
  let reloadTimeoutId: number | null = null;
  let gestureDirection: "undetermined" | "vertical" | "horizontal" =
    "undetermined";

  let isPulling = $state(false);
  let isStageOneRefreshing = $state(false);
  let shouldShowPullIndicatorByDistance = $state(false);
  let pullStage = $state<0 | 1 | 2>(0);

  const showPullIndicator = $derived(
    shouldShowPullIndicatorByDistance || isStageOneRefreshing,
  );
  const pullIconState = $derived.by<"idle" | "stage1" | "stage2" | "loading">(
    () => {
      if (isStageOneRefreshing) {
        return "loading";
      }

      if (pullStage === 2) {
        return "stage2";
      }

      if (pullStage === 1) {
        return "stage1";
      }

      return "idle";
    },
  );

  onMount(() => {
    scrollContainerEl = findScrollContainer(pullHostEl);

    if (!pullHostEl) {
      return;
    }

    const onTouchStart = (event: TouchEvent) => {
      handleTouchStart(event);
    };

    const onTouchMove = (event: TouchEvent) => {
      handleTouchMove(event);
    };

    const onTouchEnd = () => {
      handleTouchEnd();
    };

    const onTouchCancel = () => {
      handleTouchCancel();
    };

    pullHostEl.addEventListener("touchstart", onTouchStart, { passive: true });
    pullHostEl.addEventListener("touchmove", onTouchMove, { passive: false });
    pullHostEl.addEventListener("touchend", onTouchEnd);
    pullHostEl.addEventListener("touchcancel", onTouchCancel);

    return () => {
      pullHostEl?.removeEventListener("touchstart", onTouchStart);
      pullHostEl?.removeEventListener("touchmove", onTouchMove);
      pullHostEl?.removeEventListener("touchend", onTouchEnd);
      pullHostEl?.removeEventListener("touchcancel", onTouchCancel);

      if (reloadTimeoutId !== null) {
        window.clearTimeout(reloadTimeoutId);
      }

      if (pullFrameId !== null) {
        window.cancelAnimationFrame(pullFrameId);
      }
    };
  });

  function findScrollContainer(node: HTMLElement | null): HTMLElement | null {
    let current = node?.parentElement ?? null;

    while (current) {
      const { overflowY } = window.getComputedStyle(current);
      const canScrollY =
        overflowY === "auto" ||
        overflowY === "scroll" ||
        overflowY === "overlay";

      if (canScrollY) {
        return current;
      }

      current = current.parentElement;
    }

    return null;
  }

  function setPullTransitionDuration(durationMs: number) {
    if (pullHostEl) {
      pullHostEl.style.transitionDuration = `${durationMs}ms`;
    }

    if (pullIndicatorEl) {
      pullIndicatorEl.style.transitionDuration = `${durationMs}ms`;
    }
  }

  function applyPullOffset(nextOffset: number) {
    currentPullOffset = nextOffset;
    shouldShowPullIndicatorByDistance = nextOffset >= indicatorShowThresholdPx;

    if (pullHostEl) {
      const hostOffset = keepContentFixed ? 0 : nextOffset;
      pullHostEl.style.transform = `translate3d(0, ${hostOffset}px, 0)`;
    }

    if (pullIndicatorEl) {
      const indicatorBaseOffset = keepContentFixed
        ? (() => {
            if (nextOffset <= stageOneHold) {
              return nextOffset;
            }

            const extraPull = nextOffset - stageOneHold;
            const slowedExtra = 18 * (1 - Math.exp(-extraPull / 72));
            return stageOneHold + slowedExtra;
          })()
        : nextOffset / 2;
      const centeredTop = Math.max(
        indicatorMinTopMarginPx,
        indicatorBaseOffset,
      );
      const indicatorTranslateY = Math.max(
        0,
        centeredTop - indicatorMinTopMarginPx,
      );
      pullIndicatorEl.style.transform = `translate3d(0, ${indicatorTranslateY}px, 0)`;
    }
  }

  function queuePullOffset(nextOffset: number) {
    pendingPullOffset = nextOffset;

    if (pullFrameId !== null) {
      return;
    }

    pullFrameId = window.requestAnimationFrame(() => {
      pullFrameId = null;
      applyPullOffset(pendingPullOffset);
    });
  }

  function flushPullOffset() {
    if (pullFrameId !== null) {
      window.cancelAnimationFrame(pullFrameId);
      pullFrameId = null;
      applyPullOffset(pendingPullOffset);
    }
  }

  function settlePullTo(nextOffset: number, durationMs = 220) {
    setPullTransitionDuration(durationMs);
    queuePullOffset(nextOffset);
  }

  function waitMs(durationMs: number) {
    return new Promise<void>((resolve) => {
      window.setTimeout(resolve, durationMs);
    });
  }

  function getPullStage(offset: number): 0 | 1 | 2 {
    if (offset >= resolvedStageTwoThreshold) {
      return 2;
    }

    if (offset >= stageOneThreshold) {
      return 1;
    }

    return 0;
  }

  function getResistedPullDistance(deltaY: number): number {
    if (deltaY <= 0) {
      return 0;
    }

    if (deltaY <= resolvedStageTwoThreshold) {
      return deltaY * 0.82;
    }

    return (
      resolvedStageTwoThreshold * 0.82 +
      (deltaY - resolvedStageTwoThreshold) * 0.35
    );
  }

  function pulseWebHaptics(stage: 0 | 1 | 2 | "commit") {
    if (stage === 0) {
      trigger([
        {
          duration: 5,
        },
      ]);
      return;
    }

    if (stage === 1) {
      trigger([
        {
          duration: 10,
        },
      ]);
      return;
    }

    if (stage === 2) {
      trigger([
        {
          duration: 10,
        },
      ]);
      return;
    }

    trigger([
      {
        duration: 5,
        intensity: 1,
      },
    ]);
  }

  function pulseIndicator(stage: 0 | 1 | 2 | "commit") {
    if (!pullIndicatorBadgeEl) {
      return;
    }

    indicatorPulseAnimation?.cancel();

    const scalePeak =
      stage === 2 ? 1.25 : stage === 1 ? 1.25 : stage === "commit" ? 1.5 : 1.25;

    indicatorPulseAnimation = pullIndicatorBadgeEl.animate(
      [
        { transform: "scale(1)", offset: 0 },
        { transform: `scale(${scalePeak})`, offset: 0.45 },
        { transform: "scale(1)", offset: 1 },
      ],
      {
        duration: stage === 2 || stage === "commit" ? 220 : 170,
        easing: "cubic-bezier(0.22, 0.9, 0.2, 1)",
      },
    );
  }

  function handleTouchStart(event: TouchEvent) {
    if (!enabled || !isMobile || isStageOneRefreshing) {
      return;
    }

    if (event.touches.length !== 1) {
      return;
    }

    if (!scrollContainerEl) {
      scrollContainerEl = findScrollContainer(pullHostEl);
    }

    if (!scrollContainerEl || scrollContainerEl.scrollTop > 0) {
      return;
    }

    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    isPointerTracking = true;
    gestureDirection = "undetermined";
  }

  function handleTouchMove(event: TouchEvent) {
    if (
      !isPointerTracking ||
      isStageOneRefreshing ||
      event.touches.length !== 1
    ) {
      return;
    }

    const touch = event.touches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;

    if (gestureDirection === "undetermined") {
      if (
        Math.abs(deltaX) < directionLockThreshold &&
        Math.abs(deltaY) < directionLockThreshold
      ) {
        return;
      }

      gestureDirection =
        Math.abs(deltaX) > Math.abs(deltaY) * 1.15 ? "horizontal" : "vertical";
    }

    if (gestureDirection === "horizontal") {
      isPointerTracking = false;
      return;
    }

    if (deltaY <= 0) {
      if (isPulling) {
        queuePullOffset(0);
        pullStage = 0;
      }
      return;
    }

    if (!scrollContainerEl) {
      scrollContainerEl = findScrollContainer(pullHostEl);
    }

    if (scrollContainerEl && scrollContainerEl.scrollTop > 0 && !isPulling) {
      isPointerTracking = false;
      return;
    }

    event.preventDefault();

    if (!isPulling) {
      isPulling = true;
      setPullTransitionDuration(0);
    }

    const nextOffset = Math.min(
      maxPullDistance,
      getResistedPullDistance(deltaY),
    );
    const nextStage = getPullStage(nextOffset);
    const didStageChange = nextStage !== pullStage;

    if (didStageChange) {
      pulseIndicator(nextStage);
      pulseWebHaptics(nextStage);
    }

    queuePullOffset(nextOffset);
    pullStage = nextStage;
  }

  function handleTouchEnd() {
    if (!isPointerTracking && !isPulling) {
      return;
    }

    flushPullOffset();
    isPointerTracking = false;

    if (!isPulling) {
      gestureDirection = "undetermined";
      return;
    }

    isPulling = false;
    const stageAtRelease = getPullStage(currentPullOffset);
    gestureDirection = "undetermined";

    if (stageAtRelease === 2) {
      pullStage = 2;
      pulseWebHaptics("commit");
      pulseIndicator("commit");

      if (reloadTimeoutId !== null) {
        window.clearTimeout(reloadTimeoutId);
      }

      reloadTimeoutId = window.setTimeout(() => {
        if (onStageTwo) {
          Promise.resolve(onStageTwo())
            .catch((error) => {
              console.error("Pull-to-refresh stage 2 action failed:", error);
            })
            .finally(() => {
              pullStage = 0;
              settlePullTo(0, 220);
            });
          return;
        }

        window.location.reload();
      }, 70);
      return;
    }

    if (stageAtRelease === 1) {
      void runStageOneRefresh();
      return;
    }

    pullStage = 0;
    settlePullTo(0);
  }

  function handleTouchCancel() {
    flushPullOffset();
    isPointerTracking = false;
    isPulling = false;
    gestureDirection = "undetermined";
    pullStage = 0;

    if (reloadTimeoutId !== null) {
      window.clearTimeout(reloadTimeoutId);
      reloadTimeoutId = null;
    }

    settlePullTo(0);
  }

  async function runStageOneRefresh() {
    if (isStageOneRefreshing) {
      settlePullTo(0);
      return;
    }

    isStageOneRefreshing = true;
    pullStage = 1;
    settlePullTo(stageOneHold, 180);
    const startedAt = performance.now();

    try {
      await onStageOne?.();
    } catch (error) {
      console.error("Pull-to-refresh stage 1 action failed:", error);
    }

    const elapsed = performance.now() - startedAt;
    if (elapsed < stageOneMinDurationMs) {
      await waitMs(stageOneMinDurationMs - elapsed);
    }

    isStageOneRefreshing = false;
    pullStage = 0;
    settlePullTo(0, 260);
  }
</script>

<div class="relative {className}" {...rest}>
  <div
    bind:this={pullIndicatorEl}
    class="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center"
    style="transform: translate3d(0, 0px, 0); transition-property: transform; transition-duration: 220ms; transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);"
  >
    <div
      bind:this={pullIndicatorBadgeEl}
      class="flex size-11 items-center justify-center rounded-full border border-muted-foreground/10 text-muted-foreground transition-opacity duration-200
      {showPullIndicator ? 'opacity-100' : 'opacity-0'}
      {appearanceStore.disableBlur
        ? 'bg-muted'
        : 'bg-muted-foreground/10 dark:bg-muted/60 backdrop-blur-md'}
        "
    >
      <div class="relative size-5">
        <ArrowDownIcon
          strokeWidth={2.5}
          absoluteStrokeWidth
          class="absolute inset-0 size-5 transition-all duration-200 ease-out {pullIconState ===
          'idle'
            ? 'opacity-100 scale-100 rotate-0'
            : 'opacity-0 scale-150 -rotate-45'}"
        />
        <RotateCcwIcon
          strokeWidth={2.5}
          absoluteStrokeWidth
          class="absolute inset-0 size-5 transition-all duration-200 ease-out {pullIconState ===
          'stage1'
            ? 'opacity-100 scale-100 rotate-0'
            : 'opacity-0 scale-150 rotate-45'}"
        />
        <RefreshCwIcon
          strokeWidth={2.5}
          absoluteStrokeWidth
          class="absolute inset-0 size-5 transition-all duration-200 ease-out {pullIconState ===
          'stage2'
            ? 'opacity-100 scale-100 rotate-0'
            : 'opacity-0 scale-150 rotate-45'}"
        />
        <LoaderIcon
          strokeWidth={2.5}
          absoluteStrokeWidth
          class="absolute inset-0 size-5 animate-spin transition-all duration-200 ease-out {pullIconState ===
          'loading'
            ? 'opacity-100 scale-100 rotate-0'
            : 'opacity-0 scale-150 -rotate-45'}"
        />
      </div>
    </div>
  </div>

  <div
    bind:this={pullHostEl}
    class="will-change-transform"
    style="transform: translate3d(0, 0px, 0); transition-property: transform; transition-duration: 220ms; transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);"
  >
    {@render children?.()}
  </div>
</div>

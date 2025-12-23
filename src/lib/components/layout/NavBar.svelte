<script lang="ts">
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { authStore } from "$lib/stores/auth.svelte";
  import { onMount } from "svelte";
  import { flip } from "svelte/animate";
  import { Tween } from "svelte/motion";
  import { playerStore } from "$lib/stores/player.svelte";
  import { vaulEase } from "$lib/utils";
  import { navItems } from "./navItems";
  import { appearanceStore } from "$lib/stores/appearance.svelte";

  const {
    orientation = "horizontal",
    size = 36,
  }: {
    orientation?: "vertical" | "horizontal";
    size?: number;
  } = $props();

  let isDragging = $state(false);
  let isReleaseAnimating = $state(false);
  let dragStartPosition = $state(0);
  let dragStartTabPosition = $state(0);
  let dragOffset = $state(0);
  let navElement: HTMLElement | null = $state(null);
  let indicatorElement: HTMLElement | null = $state(null);

  const tabPosition = new Tween(0, {
    duration: appearanceStore.disableAnimations ? 0 : 400,
    easing: vaulEase,
  });

  onMount(async () => {
    try {
      if (authStore.token) {
        await authStore.getCurrentUser();
      }
    } catch (error) {
      console.error(error);
    }
  });

  const tabs = $derived(navItems);

  const isTopRoute = $derived(page.url.pathname.split("/").length <= 2);

  const activeTabIndex = $derived(tabs.findIndex((tab) => isActive(tab.path)));

  const displayPosition = $derived(
    isDragging ? dragOffset : tabPosition.current,
  );

  $effect(() => {
    if (activeTabIndex >= 0 && !isDragging && !isReleaseAnimating) {
      tabPosition.target = activeTabIndex;
    }
  });

  function isActive(tabPath: string): boolean {
    if (tabPath === "/") {
      return page.url.pathname === "/";
    }
    return page.url.pathname.startsWith(tabPath);
  }

  function handleIndicatorPointerDown(e: PointerEvent) {
    if (!navElement || !indicatorElement) return;

    e.stopPropagation();
    e.preventDefault();

    isDragging = true;
    const rect = navElement.getBoundingClientRect();

    if (orientation === "horizontal") {
      dragStartPosition = e.clientX - rect.left;
    } else {
      dragStartPosition = e.clientY - rect.top;
    }

    dragStartTabPosition = tabPosition.current;
    dragOffset = dragStartTabPosition;
    indicatorElement.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: PointerEvent) {
    if (!isDragging || !navElement) return;

    const rect = navElement.getBoundingClientRect();
    const dimension = orientation === "horizontal" ? rect.width : rect.height;
    const padding = 6; // 0.375rem | 1.5 tailwind
    const gap = 6; // 0.375rem | 1.5 tailwind
    const availableSpace = dimension - padding * 2;
    const tabWidth = (availableSpace - gap * (tabs.length - 1)) / tabs.length;

    let currentPos: number;
    if (orientation === "horizontal") {
      currentPos = e.clientX - rect.left;
    } else {
      currentPos = e.clientY - rect.top;
    }

    const delta = currentPos - dragStartPosition;
    const tabDelta = delta / (tabWidth + gap);

    let newPosition = dragStartTabPosition + tabDelta;
    newPosition = Math.max(0, Math.min(tabs.length - 1, newPosition));

    dragOffset = newPosition;
  }

  async function handleIndicatorPointerUp(e: PointerEvent) {
    if (!isDragging || !indicatorElement) return;

    indicatorElement.releasePointerCapture(e.pointerId);

    const nearestTab = Math.round(dragOffset);
    const clampedTab = Math.max(0, Math.min(tabs.length - 1, nearestTab));

    tabPosition.set(dragOffset, {
      duration: 0,
    });

    isDragging = false;
    isReleaseAnimating = true;

    if (clampedTab !== activeTabIndex) {
      goto(tabs[clampedTab].path);
    }

    const distanceToTarget = Math.abs(clampedTab - dragOffset);
    const adjustedDuration = Math.min(400, 200 + distanceToTarget * 150);

    await tabPosition.set(clampedTab, {
      duration: appearanceStore.disableAnimations ? 0 : adjustedDuration,
      easing: vaulEase,
    });

    isReleaseAnimating = false;
  }

  function handleTabClick(e: MouseEvent, tabIndex: number) {
    if (tabIndex === activeTabIndex) return;

    e.preventDefault();
    tabPosition.target = tabIndex;
    goto(tabs[tabIndex].path);
  }
</script>

{#if isTopRoute}
  <nav
    bind:this={navElement}
    onpointermove={handlePointerMove}
    class="overflow-clip mx-auto flex rounded-xl border border-input/15 relative p-1.5 gap-1.5 select-none
      {orientation === 'horizontal' ? 'flex-row w-full' : 'flex-col h-full'}
      {appearanceStore.disableBlur
      ? 'bg-muted'
      : 'bg-muted-foreground/10 dark:bg-muted/50 backdrop-blur-md'}
      "
  >
    {#if activeTabIndex >= 0}
      <div
        bind:this={indicatorElement}
        onpointerdown={handleIndicatorPointerDown}
        onpointerup={handleIndicatorPointerUp}
        onpointercancel={handleIndicatorPointerUp}
        class="absolute rounded-lg touch-none cursor-grab active:cursor-grabbing z-10
        {isDragging
          ? 'opacity-90 max-md:scale-y-90 md:scale-x-90'
          : 'pointer-events-auto'}
        {appearanceStore.disableAnimations
          ? ''
          : 'transition-all duration-100 ease-out-back'}"
        style="
        background-color:
          color-mix(
            in oklab,
            {playerStore.trackColor ?? 'var(--primary)'} 40%,
            var(--foreground)
          );
        {orientation === 'horizontal'
          ? `
            top: 0.375rem;
            bottom: 0.375rem;
            left: 0.375rem;
            width: calc((100% - 0.75rem) / ${tabs.length} - 0.375rem);
            transform: translate3d(calc(${displayPosition} * (100% + 0.5rem)), 0, 0);
            `
          : `
            left: 0.375rem;
            right: 0.375rem;
            top: 0.375rem;
            height: calc((100% - 0.75rem) / ${tabs.length} - 0.375rem);
            transform: translate3d(0, calc(${displayPosition} * (100% + 0.5rem)), 0);
            `}"
      ></div>
    {/if}

    {#each tabs as tab, i (tab.path)}
      {@const active = isActive(tab.path)}
      {@const isUnderIndicator = Math.abs(displayPosition - i) < 0.5}
      <button
        draggable="false"
        animate:flip={{ duration: appearanceStore.disableAnimations ? 0 : 200 }}
        onclick={(e) => handleTabClick(e, i)}
        class="relative flex-1 z-20 grid place-items-center cursor-pointer
        {active ? 'pointer-events-none' : ''}"
      >
        <div
          class="grid place-items-center"
          style="width: {size}px; height: {size}px;"
        >
          <tab.icon
            absoluteStrokeWidth
            strokeWidth={2}
            class="size-5 m-auto
            {isUnderIndicator
              ? 'text-primary-foreground'
              : active
                ? 'text-[color-mix(in_oklab,var(--primary)_40%,var(--foreground))]'
                : 'text-muted-foreground hover:text-accent-foreground'}"
          />
        </div>
      </button>
    {/each}
  </nav>
{/if}

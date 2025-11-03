<script lang="ts">
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { authStore } from "$lib/stores/auth.svelte";
  import {
    HouseIcon,
    ListMusicIcon,
    SearchIcon,
    ShieldIcon,
  } from "@lucide/svelte";
  import { onMount } from "svelte";
  import { navigationStore } from "$lib/stores/navigation.svelte";
  import { flip } from "svelte/animate";
  import { Tween } from "svelte/motion";

  const {
    orientation = "horizontal",
    size = 36,
  }: {
    orientation?: "vertical" | "horizontal";
    size?: number;
  } = $props();

  let isAdmin = $state(false);

  let isDragging = $state(false);
  let isReleaseAnimating = $state(false);
  let dragStartPosition = $state(0);
  let dragStartTabPosition = $state(0);
  let dragOffset = $state(0);
  let navElement: HTMLElement | null = $state(null);
  let indicatorElement: HTMLElement | null = $state(null);

  const tabPosition = new Tween(0, {
    duration: 400,
    easing: (t) => {
      const c1 = 1.70158;
      const c3 = c1 + 1;

      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
  });

  onMount(async () => {
    try {
      if (authStore.token) {
        await authStore.getCurrentUser();
        isAdmin = authStore.isAdmin;
      }
    } catch (error) {
      isAdmin = false;
    }
  });

  const tabs = $derived([
    { path: "/", label: "home", icon: HouseIcon },
    { path: "/search", label: "search", icon: SearchIcon },
    { path: "/library", label: "library", icon: ListMusicIcon },
    ...(isAdmin ? [{ path: "/admin", label: "admin", icon: ShieldIcon }] : []),
  ]);

  const isTopRoute = $derived(page.url.pathname.split("/").length <= 2);

  const activeTabIndex = $derived(tabs.findIndex((tab) => isActive(tab.path)));

  const displayPosition = $derived(
    isDragging ? dragOffset : tabPosition.current
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

  $effect(() => {
    if (isTopRoute) {
      navigationStore.clear();
    }
  });

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
      duration: adjustedDuration,
      easing: (t) => {
        return 1 - Math.pow(1 - t, 3);
      },
    });

    isReleaseAnimating = false;
  }

  function handleTabClick(e: MouseEvent, tabIndex: number) {
    if (tabIndex === activeTabIndex) return;

    e.preventDefault();

    goto(tabs[tabIndex].path);
  }
</script>

{#if isTopRoute}
  <nav
    bind:this={navElement}
    onpointermove={handlePointerMove}
    class="overflow-clip mx-auto flex rounded-xl border border-input bg-muted/50 backdrop-blur-md relative p-1.5 gap-1.5 select-none
      {orientation === 'horizontal' ? 'flex-row w-full' : 'flex-col h-full'}"
  >
    {#if activeTabIndex >= 0}
      <div
        bind:this={indicatorElement}
        onpointerdown={handleIndicatorPointerDown}
        onpointerup={handleIndicatorPointerUp}
        onpointercancel={handleIndicatorPointerUp}
        class="absolute rounded-lg bg-primary touch-none cursor-grab active:cursor-grabbing z-10 transition-all duration-100 ease-out-back
        {isDragging ? 'opacity-90 scale-y-90' : 'pointer-events-auto'}"
        style={orientation === "horizontal"
          ? `
            top: 0.375rem;
            bottom: 0.375rem;
            left: 0.375rem;
            width: calc((100% - 0.75rem) / ${tabs.length} - 0.375rem);
            transform: translateX(calc(${displayPosition} * (100% + 0.5rem)));
            `
          : `
            left: 0.375rem;
            right: 0.375rem;
            top: 0.375rem;
            height: calc((100% - 0.75rem) / ${tabs.length} - 0.375rem);
            transform: translateY(calc(${displayPosition} * (100% + 0.5rem)));
            `}
      ></div>
    {/if}

    {#each tabs as tab, i (tab.path)}
      {@const active = isActive(tab.path)}
      {@const isUnderIndicator = Math.abs(displayPosition - i) < 0.5}
      <a
        href={tab.path}
        draggable="false"
        animate:flip={{ duration: 200 }}
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
                ? 'text-primary'
                : 'text-muted-foreground hover:text-accent-foreground'}"
          />
        </div>
      </a>
    {/each}
  </nav>
{/if}

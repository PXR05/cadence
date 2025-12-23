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

  let navElement: HTMLElement | null = $state(null);

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

  $effect(() => {
    if (activeTabIndex >= 0) {
      tabPosition.target = activeTabIndex;
    }
  });

  function isActive(tabPath: string): boolean {
    if (tabPath === "/") {
      return page.url.pathname === "/";
    }
    return page.url.pathname.startsWith(tabPath);
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
    class="overflow-clip mx-auto flex rounded-xl border border-input/15 relative p-1.5 gap-1.5 select-none
      {orientation === 'horizontal' ? 'flex-row w-full' : 'flex-col h-full'}
      {appearanceStore.disableBlur
      ? 'bg-muted'
      : 'bg-muted-foreground/10 dark:bg-muted/50 backdrop-blur-md'}
      "
  >
    {#if activeTabIndex >= 0}
      <div
        class="absolute rounded-lg pointer-events-none z-10
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
            transform: translate3d(calc(${tabPosition.current} * (100% + 0.5rem)), 0, 0);
            `
          : `
            left: 0.375rem;
            right: 0.375rem;
            top: 0.375rem;
            height: calc((100% - 0.75rem) / ${tabs.length} - 0.375rem);
            transform: translate3d(0, calc(${tabPosition.current} * (100% + 0.5rem)), 0);
            `}"
      ></div>
    {/if}

    {#each tabs as tab, i (tab.path)}
      {@const active = isActive(tab.path)}
      {@const isUnderIndicator = Math.abs(tabPosition.current - i) < 0.5}
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

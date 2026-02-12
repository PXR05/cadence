<script lang="ts">
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { flip } from "svelte/animate";
  import { playerStore } from "$lib/stores/player.svelte";
  import { isActive, navItems } from "./navItems";
  import { appearanceStore } from "$lib/stores/appearance.svelte";

  const {
    orientation = "horizontal",
    size = 36,
  }: {
    orientation?: "vertical" | "horizontal";
    size?: number;
  } = $props();

  const tabs = $derived(navItems);

  const isTopRoute = $derived(page.url.pathname.split("/").length <= 2);

  const activeTabIndex = $derived(tabs.findIndex((tab) => isActive(tab.path)));

  function handleTabClick(e: MouseEvent, tabIndex: number) {
    if (tabIndex === activeTabIndex) return;

    e.preventDefault();
    goto(tabs[tabIndex].path);
  }
</script>

{#if isTopRoute}
  <nav
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
          : 'transition-all duration-300 ease-vaul'}"
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
            transform: translate3d(calc(${activeTabIndex} * (100% + 0.5rem)), 0, 0);
            `
          : `
            left: 0.375rem;
            right: 0.375rem;
            top: 0.375rem;
            height: calc((100% - 0.75rem) / ${tabs.length} - 0.375rem);
            transform: translate3d(0, calc(${activeTabIndex} * (100% + 0.5rem)), 0);
            `}"
      ></div>
    {/if}

    {#each tabs as tab, i (tab.path)}
      {@const active = isActive(tab.path)}
        {@const isUnderIndicator = activeTabIndex === i}
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

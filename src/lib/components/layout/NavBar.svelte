<script lang="ts">
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { flip } from "svelte/animate";
  import { isActive, navItems } from "./navItems";
  import { appearanceStore } from "$lib/stores/appearance.svelte";

  const {
    size = 36,
  }: {
    size?: number;
  } = $props();

  const tabs = $derived(navItems);

  const isTopRoute = $derived(page.url.pathname.split("/").length <= 2);

  const activeTabIndex = $derived(tabs.findIndex((tab) => isActive(tab.path)));

  async function handleTabClick(e: MouseEvent, tabIndex: number) {
    if (tabIndex === activeTabIndex) {
      await tabs[tabIndex].action?.();
      return;
    }

    e.preventDefault();
    goto(tabs[tabIndex].path);
  }
</script>

{#if isTopRoute}
  <nav class="overflow-clip flex relative px-2 py-3 gap-1.5 select-none">
    {#if activeTabIndex >= 0}
      <div
        class="absolute rounded-full pointer-events-none z-10
        {appearanceStore.disableAnimations
          ? ''
          : 'transition-all duration-300 ease-vaul'}"
        style="
        background-color: color-mix(in oklab, var(--muted-foreground) 15%, transparent);
        top: 0.5rem;
        bottom: 0.5rem;
        left: 0.5rem;
        width: calc((100% - 1rem) / {tabs.length} - 0.375rem);
        transform: translate3d(calc({activeTabIndex} * (100% + 0.5rem)), 0, 0);
        "
      ></div>
      <!-- top, bottom, left = padding, 1rem = total side padding -->
    {/if}

    {#each tabs as tab, i (tab.path)}
      {@const active = isActive(tab.path)}
      <button
        draggable="false"
        animate:flip={{ duration: appearanceStore.disableAnimations ? 0 : 200 }}
        onclick={(e) => handleTabClick(e, i)}
        class="relative flex-1 z-20 grid place-items-center cursor-pointer"
      >
        <div
          class="grid place-items-center"
          style="width: {size}px; height: {size}px;"
        >
          <tab.icon
            absoluteStrokeWidth
            strokeWidth={2}
            class="size-5 m-auto"
            style="color: {active
              ? 'var(--foreground)'
              : 'var(--muted-foreground)'} !important;"
          />
        </div>
      </button>
    {/each}
  </nav>
{/if}

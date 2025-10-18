<script lang="ts">
  import { page } from "$app/state";
  import { checkToken } from "$lib/api";
  import {
    HouseIcon,
    ListMusicIcon,
    SearchIcon,
    ShieldIcon,
  } from "@lucide/svelte";
  import { onMount } from "svelte";
  import { navigationStore } from "$lib/stores/navigation.svelte";
  import { flip } from "svelte/animate";

  const {
    orientation = "horizontal",
    size = 36,
  }: {
    orientation?: "vertical" | "horizontal";
    size?: number;
  } = $props();

  let isAdmin = $state(false);

  onMount(async () => {
    try {
      const result = await checkToken();
      isAdmin = result.data.isAdmin;
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
</script>

{#if isTopRoute}
  <nav
    class="overflow-clip mx-auto flex rounded-xl border border-input bg-muted/50 backdrop-blur-md relative p-1.5 gap-1.5
      {orientation === 'horizontal' ? 'flex-row w-full' : 'flex-col h-full'}"
  >
    {#if activeTabIndex >= 0}
      <div
        class="absolute top-1.5 bottom-1.5 rounded-lg bg-primary transition-all duration-500 pointer-events-none"
        style="{orientation === 'horizontal'
          ? `
            left: calc(${activeTabIndex} * (100% - 0.25rem) / ${tabs.length} + 0.375rem); 
            width: calc((100% - 0.75rem) / ${tabs.length} - 0.375rem);
            `
          : `
            top: calc(${activeTabIndex} * (100% - 0.25rem) / ${tabs.length} + 0.375rem); 
            height: calc((100% - 0.75rem) / ${tabs.length} - 0.375rem);
            width: calc(100% - 0.75rem);
            `}
            transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);"
      ></div>
    {/if}

    {#each tabs as tab (tab.path)}
      {@const active = isActive(tab.path)}
      <a
        href={tab.path}
        draggable="false"
        animate:flip={{ duration: 200 }}
        class="relative flex-1 z-10 grid place-items-center"
      >
        <div
          class="text-center flex gap-2 items-center justify-center p-2 rounded-lg transition-colors
            {active
            ? 'text-primary-foreground'
            : 'text-muted-foreground hover:text-accent-foreground'}"
          style="width: {size}px; height: {size}px;"
        >
          <tab.icon absoluteStrokeWidth strokeWidth={2} class="size-5 m-auto" />
        </div>
      </a>
    {/each}
  </nav>
{/if}

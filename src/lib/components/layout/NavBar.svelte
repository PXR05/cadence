<script lang="ts">
  import { page } from "$app/state";
  import { checkToken } from "$lib/api";
  import { onMount } from "svelte";

  let isAdmin = $state(false);
  let loading = $state(true);

  onMount(async () => {
    try {
      const result = await checkToken();
      isAdmin = result.data.isAdmin;
    } catch (error) {
      isAdmin = false;
    } finally {
      loading = false;
    }
  });

  const tabs = $derived([
    { path: "/", label: "home" },
    { path: "/search", label: "search" },
    { path: "/library", label: "library" },
    ...(isAdmin ? [{ path: "/admin", label: "admin" }] : []),
  ]);

  function isActive(tabPath: string): boolean {
    if (tabPath === "/") {
      return page.url.pathname === "/";
    }
    return page.url.pathname.startsWith(tabPath);
  }
</script>

<nav class="sticky top-0 z-10 bg-background border-y">
  <div class="max-w-4xl mx-auto flex">
    {#each tabs as tab, i}
      {@const activeClass = isActive(tab.path)
        ? "bg-muted text-foreground"
        : "text-muted-foreground"}
      <a
        href={tab.path}
        class="relative flex-1 p-3 hover:bg-muted/30 transition-colors border-r text-center
        {activeClass}
        {i === 0 ? 'border-l' : ''}"
      >
        {tab.label}
      </a>
    {/each}
  </div>
</nav>

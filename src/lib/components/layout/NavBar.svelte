<script lang="ts">
  import { page } from "$app/state";
  import { checkToken } from "$lib/api";
  import { ArrowLeftIcon } from "@lucide/svelte";
  import { onMount } from "svelte";
  import { navigationStore } from "$lib/stores/navigation.svelte";
  import { Button } from "$lib/components/ui/button";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb";

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

  const isTopRoute = $derived(page.url.pathname.split("/").length <= 2);

  function isActive(tabPath: string): boolean {
    if (tabPath === "/") {
      return page.url.pathname === "/";
    }
    return page.url.pathname.startsWith(tabPath);
  }

  function goBack() {
    window.history.back();
  }

  $effect(() => {
    if (isTopRoute) {
      navigationStore.clear();
    }
  });
</script>

{#if isTopRoute}
  <nav class="sticky top-0 z-10 bg-background border-y overflow-x-auto">
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
{:else}
  <nav class="sticky top-0 z-10 bg-background border-y">
    <div class="max-w-4xl mx-auto flex items-center border-x">
      <Button
        variant="ghost"
        size="icon"
        class="size-12 border-r"
        onclick={goBack}
      >
        <ArrowLeftIcon size={18} />
      </Button>

      <div class="flex-1 min-w-0 px-2">
        <Breadcrumb.Root>
          <Breadcrumb.List>
            {#each navigationStore.breadcrumbs as crumb, i}
              <Breadcrumb.Item>
                <Breadcrumb.Link href={crumb.path}>
                  {crumb.label}
                </Breadcrumb.Link>
              </Breadcrumb.Item>
              <Breadcrumb.Separator />
            {/each}

            {#if navigationStore.title}
              <Breadcrumb.Item>
                <Breadcrumb.Page>{navigationStore.title}</Breadcrumb.Page>
              </Breadcrumb.Item>
            {/if}
          </Breadcrumb.List>
        </Breadcrumb.Root>
      </div>
    </div>
  </nav>
{/if}

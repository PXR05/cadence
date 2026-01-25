<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { ArrowLeftIcon, LoaderIcon } from "@lucide/svelte";
  import { UserManagement, TrackManagement } from "$lib/components/admin";
  import { authStore } from "$lib/stores/auth.svelte";
  import { Button } from "$lib/components/ui/button";

  let isAdmin = $state(false);
  let loading = $state(true);
  let activeTab = $state<"users" | "tracks">("tracks");

  onMount(async () => {
    try {
      if (authStore.user) {
        await authStore.getCurrentUser();
        isAdmin = authStore.isAdmin;
      }
      if (!isAdmin) {
        goto("/settings");
        return;
      }
    } catch {
      goto("/settings");
    }
    loading = false;
  });

  function switchTab(tab: "users" | "tracks") {
    activeTab = tab;
  }
</script>

<svelte:head>
  <title>Admin | Cadence</title>
</svelte:head>

{#if loading}
  <div class="absolute inset-0 m-auto flex items-center justify-center h-full">
    <LoaderIcon class="animate-spin text-muted-foreground" size={24} />
  </div>
{/if}

<div class="sticky top-0 w-full p-1.5 md:p-2 z-50">
  <div
    class="flex-1 flex items-center flex-row gap-1.5 md:gap-2 bg-muted-foreground/10 dark:bg-muted/50 rounded-xl p-1.5 md:p-2 backdrop-blur-md border border-input/15"
  >
    <Button
      variant="ghost"
      size="icon"
      class="size-10"
      onclick={() => history.back()}
    >
      <ArrowLeftIcon />
    </Button>
    <h1 class="flex-1 flex items-center gap-2 font-semibold truncate text-2xl">
      Admin Dashboard
    </h1>
  </div>
</div>

<div
  class="px-2 pb-4 pt-0.5 w-full space-y-2 mb-[50dvh] transition-opacity {loading
    ? 'opacity-0'
    : ''}"
>
  <div
    class="flex gap-2 sticky top-0 z-40 py-2 bg-background/80 backdrop-blur-sm"
  >
    <Button
      variant={activeTab === "tracks" ? "default" : "outline"}
      onclick={() => switchTab("tracks")}
      class="flex-1 h-11"
    >
      Tracks
    </Button>
    <Button
      variant={activeTab === "users" ? "default" : "outline"}
      onclick={() => switchTab("users")}
      class="flex-1 h-11"
    >
      Users
    </Button>
  </div>

  <div class="relative space-y-2">
    {#if activeTab === "users"}
      <UserManagement />
    {:else}
      <TrackManagement />
    {/if}
  </div>
</div>

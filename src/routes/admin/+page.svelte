<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { LoaderIcon, LogOutIcon } from "@lucide/svelte";
  import { UserManagement, TrackManagement } from "$lib/components/admin";
  import { authStore } from "$lib/stores/auth.svelte";
  import { getCurrentUser } from "$lib/remote";
  import { Button } from "$lib/components/ui/button";

  let isAdmin = $state(false);
  let loading = $state(true);
  let activeTab = $state<"users" | "tracks">("tracks");

  onMount(async () => {
    try {
      const result = await getCurrentUser();
      isAdmin = result.data.role === "admin";
      if (!isAdmin) {
        goto("/");
        return;
      }
    } catch {
      goto("/");
    }
    loading = false;
  });

  function switchTab(tab: "users" | "tracks") {
    activeTab = tab;
  }

  async function handleLogout() {
    await authStore.logout();
    goto("/");
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
<div
  class="relative flex flex-col mx-auto w-full h-full border-x overflow-y-auto transition-opacity
  {loading ? 'opacity-0 scale-0' : ''}"
>
  <div class="flex border-b sticky top-0 p-2 z-50 gap-2 bg-background">
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
    <Button
      variant="outline"
      size="icon"
      onclick={handleLogout}
      title="Logout"
      class="size-11"
    >
      <LogOutIcon size={18} />
    </Button>
  </div>

  <div class="relative p-2 space-y-2">
    {#if activeTab === "users"}
      <UserManagement />
    {:else}
      <TrackManagement />
    {/if}
  </div>
</div>

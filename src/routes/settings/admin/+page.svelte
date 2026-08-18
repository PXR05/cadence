<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import {
    Disc3 as Disc3Icon,
    Loader as LoaderIcon,
    ShieldCheck as ShieldCheckIcon,
    Users as UsersIcon,
  } from "@lucide/svelte";
  import SettingsHeader from "$lib/components/SettingsHeader.svelte";
  import { UserManagement, TrackManagement } from "$lib/components/admin";
  import { authStore } from "$lib/stores/auth.svelte";
  import { Button } from "$lib/components/ui/button";
  import { playerStore } from "$lib/stores/player.svelte";
  import { backendCapabilities } from "$lib/backend/config";

  const isAdmin = $derived(authStore.isAdmin);
  let loading = $state(true);
  const canManageUsers = backendCapabilities.auth.userManagement;
  const canManageTracks = backendCapabilities.library.delete;
  let activeTab = $state<"users" | "tracks">(
    canManageTracks ? "tracks" : "users",
  );

  onMount(async () => {
    try {
      if (!isAdmin || (!canManageUsers && !canManageTracks)) {
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
  <title>{playerStore.isPlaying && playerStore.currentTrack?.metadata?.title
      ? playerStore.currentTrack.metadata?.title
      : "Admin"} | Cadence</title>
</svelte:head>

<SettingsHeader title="Administration" />

{#if loading}
  <div class="flex min-h-80 items-center justify-center">
    <LoaderIcon class="size-6 animate-spin text-muted-foreground" />
  </div>
{:else}
  <div class="w-full space-y-3 px-2 pb-4 pt-0.5 mb-[50dvh]">
    {#if canManageTracks && canManageUsers}
      <nav
        class="grid grid-cols-2 gap-1 rounded-xl border bg-muted/40 p-1"
        aria-label="Administration sections"
      >
        <Button
          variant="ghost"
          onclick={() => switchTab("tracks")}
          aria-pressed={activeTab === "tracks"}
          class="h-12 justify-start gap-3 rounded-lg px-3 {activeTab ===
          'tracks'
            ? 'bg-background text-foreground shadow-sm hover:bg-background'
            : 'text-muted-foreground'}"
        >
          <Disc3Icon class="size-5" />
          <span class="text-left leading-tight">
            <span class="block font-medium">Library</span>
            <span class="hidden text-xs font-normal text-muted-foreground sm:block">
              Manage tracks
            </span>
          </span>
        </Button>
        <Button
          variant="ghost"
          onclick={() => switchTab("users")}
          aria-pressed={activeTab === "users"}
          class="h-12 justify-start gap-3 rounded-lg px-3 {activeTab === 'users'
            ? 'bg-background text-foreground shadow-sm hover:bg-background'
            : 'text-muted-foreground'}"
        >
          <UsersIcon class="size-5" />
          <span class="text-left leading-tight">
            <span class="block font-medium">People</span>
            <span class="hidden text-xs font-normal text-muted-foreground sm:block">
              Manage access
            </span>
          </span>
        </Button>
      </nav>
    {/if}

    <div class="min-w-0">
      {#if activeTab === "users" && canManageUsers}
        <UserManagement />
      {:else if canManageTracks}
        <TrackManagement />
      {/if}
    </div>
  </div>
{/if}

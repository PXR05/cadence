<script lang="ts">
  import "../app.css";
  import { ModeWatcher } from "mode-watcher";
  import {
    AuthDialog,
    BottomBar,
    SplashScreen,
    UpdateNotification,
    AppSidebar,
  } from "$lib/components";
  import { TrackMenuDialog } from "$lib/components/tracks";
  import { PlaylistMenuDialog } from "$lib/components/playlists";
  import { playerStore } from "$lib/stores/player.svelte";
  import { tracksStore } from "$lib/stores/tracks.svelte";
  import { playlistsStore } from "$lib/stores/playlists.svelte";
  import { authStore } from "$lib/stores/auth.svelte";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { innerWidth } from "svelte/reactivity/window";
  import { page } from "$app/state";
  import { Toaster } from "$lib/components/ui/sonner";
  import * as Sidebar from "$lib/components/ui/sidebar";

  let { children } = $props();

  let showSplash = $state(true);
  let updateWorker = $state<ServiceWorker | null>(null);

  onMount(async () => {
    if (authStore.token) {
      await authStore.getCurrentUser();
      if (authStore.isAuthenticated) {
        loadInitialData();
      }
    }

    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;

      if (registration.waiting) {
        updateWorker = registration.waiting;
      }

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              updateWorker = newWorker;
            }
          });
        }
      });

      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "SW_UPDATE_AVAILABLE") {
          if (registration.waiting) {
            updateWorker = registration.waiting;
          }
        }
      });

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        window.location.reload();
      });
    }
  });

  function handleUpdate() {
    if (updateWorker) {
      updateWorker.postMessage({ type: "SKIP_WAITING" });
      updateWorker = null;
    }
  }

  function loadInitialData() {
    tracksStore.loadAllTracks().catch((error) => {
      console.error("Failed to load tracks on app initialization:", error);
    });
    playlistsStore.loadAllPlaylists().catch((error) => {
      console.error("Failed to load playlists on app initialization:", error);
    });
  }

  function handleKeyboardEvent(e: KeyboardEvent) {
    const target = e.target as HTMLElement;
    if (
      target &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable)
    ) {
      return;
    }

    if (e.code === "Space") {
      e.preventDefault();
      playerStore.togglePlayPause();
    }

    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          playerStore.playNext();
          break;
        case "ArrowLeft":
          e.preventDefault();
          playerStore.playPrevious();
          break;
        case "k":
          e.preventDefault();
          goto("/search");
      }
    }

    if (e.shiftKey) {
      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          playerStore.seek(playerStore.currentTime + 5);
          break;
        case "ArrowLeft":
          e.preventDefault();
          playerStore.seek(playerStore.currentTime - 5);
          break;
        case "ArrowUp":
          e.preventDefault();
          playerStore.volume = Math.min(playerStore.volume + 0.05, 1);
          break;
        case "ArrowDown":
          e.preventDefault();
          playerStore.volume = Math.max(playerStore.volume - 0.05, 0);
          break;
      }
    }
  }

  const isMobile = $derived((innerWidth.current ?? 0) <= 768);
  const isTopRoute = $derived(page.url.pathname.split("/").length <= 2);

  const navHeight = $derived(isMobile && isTopRoute ? 72 : 0);
</script>

<svelte:window onkeydown={(e) => handleKeyboardEvent(e)} />

<Toaster position="top-right" richColors />
<ModeWatcher />
<TrackMenuDialog />
<PlaylistMenuDialog />

{#if showSplash && !authStore.isAuthenticated}
  <SplashScreen onComplete={() => (showSplash = false)} />
{:else if !authStore.isAuthenticated}
  <AuthDialog onAuthenticated={loadInitialData} />
{/if}

{#if updateWorker}
  <UpdateNotification onUpdate={handleUpdate} />
{/if}

{#if authStore.isAuthenticated}
  <Sidebar.Provider>
    <AppSidebar />
    <Sidebar.Inset
      class="relative bg-background min-h-dvh flex flex-col"
      style="--h: {navHeight}px;"
    >
      <div
        class="relative overflow-y-auto overflow-x-hidden h-dvh md:w-[calc(100dvw-256px)] bg-linear-to-t from-primary/5 via-transparent to-transparent"
      >
        {@render children?.()}
      </div>
      <BottomBar />
    </Sidebar.Inset>
  </Sidebar.Provider>
{/if}

<script lang="ts">
  import "../app.css";
  import { ModeWatcher } from "mode-watcher";
  import {
    AuthDialog,
    BottomBar,
    SplashScreen,
    UpdateNotification,
    AppSidebar,
    TrackInfoDialog,
  } from "$lib/components";
  import { TrackMenuDialog } from "$lib/components/tracks";
  import { PlaylistMenuDialog } from "$lib/components/playlists";
  import { playerStore } from "$lib/stores/player.svelte";
  import { tracksStore } from "$lib/stores/tracks.svelte";
  import { playlistsStore } from "$lib/stores/playlists.svelte";
  import { authStore } from "$lib/stores/auth.svelte";
  import { beforeNavigate, goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { innerWidth } from "svelte/reactivity/window";
  import { page } from "$app/state";
  import { Toaster } from "$lib/components/ui/sonner";
  import * as Sidebar from "$lib/components/ui/sidebar";
  import { vaulEase } from "$lib/utils";
  import { fade } from "svelte/transition";
  import { isActive, navItems } from "$lib/components/layout/navItems";
  import { appearanceStore } from "$lib/stores/appearance.svelte";

  let { children } = $props();

  let showSplash = $state(true);
  let updateWorker = $state<ServiceWorker | null>(null);

  onMount(async () => {
    if (authStore.isAuthenticated) {
      loadInitialData();
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
    tracksStore
      .loadAllTracks()
      .then(() => console.log("Tracks loaded"))
      .catch((error) => {
        console.error("Failed to load tracks on app initialization:", error);
      });
    playlistsStore
      .loadAllPlaylists()
      .then(() => console.log("Playlists loaded"))
      .catch((error) => {
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

  let goingLeft = $state(false);
  beforeNavigate((e) => {
    const oldIndex = navItems.findIndex((i) =>
      isActive(i.path, e.from?.url.pathname || ""),
    );
    const newIndex = navItems.findIndex((i) =>
      isActive(i.path, e.to?.url.pathname || ""),
    );
    if (newIndex < oldIndex) {
      goingLeft = true;
    } else {
      goingLeft = false;
    }
  });

  const isMobile = $derived((innerWidth.current ?? 0) <= 768);
  const isTopRoute = $derived(page.url.pathname.split("/").length <= 2);

  const navHeight = $derived(isMobile && isTopRoute ? 72 : 0);
</script>

<svelte:window onkeydown={(e) => handleKeyboardEvent(e)} />

<Toaster position="top-right" richColors />
<ModeWatcher />

{#if showSplash}
  <SplashScreen onComplete={() => (showSplash = false)} />
{:else if !authStore.isAuthenticated}
  <AuthDialog onAuthenticated={loadInitialData} />
{/if}

{#if updateWorker}
  <UpdateNotification onUpdate={handleUpdate} />
{/if}

{#if authStore.isAuthenticated}
  <TrackInfoDialog />
  <TrackMenuDialog />
  <PlaylistMenuDialog />
  <Sidebar.Provider>
    {#if innerWidth.current ?? window.innerWidth > 768}
      <AppSidebar />
    {/if}
    <Sidebar.Inset
      class="relative min-h-dvh grid grid-rows-1 grid-cols-1 grow overflow-x-hidden"
      style="--h: {navHeight}px;"
    >
      {#key page.url.pathname}
        <div
          class="@container row-start-1 col-start-1 relative overflow-x-hidden overflow-y-scroll h-dvh flex flex-col transition-[width] duration-200
          {Sidebar.useSidebar().state === 'collapsed'
            ? 'md:w-[calc(100dvw-64px)]'
            : 'md:w-[calc(100dvw-256px)]'}
          {playerStore.queueLength > 0 ? 'md:h-[calc(100dvh-88px)]' : ''}"
          in:fade={{
            duration: !appearanceStore.disableAnimations ? 150 : 0,
            easing: vaulEase,
          }}
          out:fade={{
            duration: !appearanceStore.disableAnimations ? 150 : 0,
            easing: vaulEase,
          }}
        >
          {@render children?.()}
        </div>
      {/key}
      <BottomBar />
    </Sidebar.Inset>
  </Sidebar.Provider>
{/if}

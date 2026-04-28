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
  import { nativeBridgeStore } from "$lib/stores/nativeBridge.svelte";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { innerWidth } from "svelte/reactivity/window";
  import { Toaster } from "$lib/components/ui/sonner";
  import * as Sidebar from "$lib/components/ui/sidebar";

  let { children } = $props();

  let showSplash = $state(true);
  let updateWorker = $state<ServiceWorker | null>(null);

  onMount(async () => {
    nativeBridgeStore.refreshNativeInfo();

    if (authStore.isAuthenticated) {
      void loadInitialData();
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

  async function loadInitialData() {
    await playerStore.hydrateEqPresetsFromBackend().catch((error) => {
      console.error(
        "Failed to hydrate EQ presets on app initialization:",
        error,
      );
    });

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
        target.tagName === "BUTTON" ||
        target.tagName === "A" ||
        target.isContentEditable)
    ) {
      return;
    }

    if (e.code === "Space" && playerStore.currentTrack) {
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
</script>

<svelte:window onkeydown={(e) => handleKeyboardEvent(e)} />

<Toaster position="top-right" richColors />
<ModeWatcher />

{#if showSplash}
  <SplashScreen onComplete={() => (showSplash = false)} />
{:else if !authStore.isAuthenticated}
  <AuthDialog
    onAuthenticated={() => {
      playerStore.onAuthStateChanged();
      void loadInitialData();
    }}
  />
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
      class="min-h-dvh grid grid-rows-1 grid-cols-1 grow overflow-x-hidden"
    >
      <div
        class="@container row-start-1 col-start-1 relative overflow-x-hidden overflow-y-scroll h-dvh flex flex-col transition-[width] duration-200
          {Sidebar.useSidebar().state === 'collapsed'
          ? 'md:w-[calc(100dvw-64px)]'
          : 'md:w-[calc(100dvw-256px)]'}
          {playerStore.queueLength > 0 ? 'md:h-[calc(100dvh-88px)]' : ''}"
      >
        {@render children?.()}
      </div>
      <BottomBar />
    </Sidebar.Inset>
  </Sidebar.Provider>
{/if}

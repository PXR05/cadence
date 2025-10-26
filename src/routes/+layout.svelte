<script lang="ts">
  import "../app.css";
  import { ModeWatcher } from "mode-watcher";
  import { AuthDialog, BottomBar, NavBar } from "$lib/components";
  import { playerStore } from "$lib/stores/player.svelte";
  import { tracksStore } from "$lib/stores/tracks.svelte";
  import { authStore } from "$lib/stores/auth.svelte";
  import { downloadStore } from "$lib/stores/download.svelte";
  import { goto, onNavigate } from "$app/navigation";
  import { onMount } from "svelte";
  import { innerWidth } from "svelte/reactivity/window";
  import { page } from "$app/state";
  import { slide } from "svelte/transition";
  import { Toaster } from "$lib/components/ui/sonner";

  let { children } = $props();

  onMount(() => {
    if (authStore.isAuthenticated) {
      loadInitialData();
    }
  });

  function loadInitialData() {
    tracksStore.loadAllTracks().catch((error) => {
      console.error("Failed to load tracks on app initialization:", error);
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

  onNavigate((navigation) => {
    if (!document.startViewTransition) return;

    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve();
        await navigation.complete;
      });
    });
  });

  const isMobile = $derived((innerWidth.current ?? 0) <= 768);
  const isTopRoute = $derived(page.url.pathname.split("/").length <= 2);
  const isDownloading = $derived(downloadStore.isDownloading);

  const navHeight = $derived(isMobile && isTopRoute ? 72 : 0);
  const playerHeight = 80;
  const downloadHeight = $derived(isDownloading ? 55 : 0);
</script>

<svelte:window onkeydown={(e) => handleKeyboardEvent(e)} />

<Toaster position="top-right" />
<ModeWatcher />

{#if !authStore.isAuthenticated}
  <AuthDialog onAuthenticated={loadInitialData} />
{:else}
  <div
    class="relative bg-background min-h-dvh flex flex-col"
    style="--h: {navHeight + playerHeight + downloadHeight + 32}px;"
  >
    {#if !isMobile && isTopRoute}
      <div
        transition:slide={{
          axis: "x",
          duration: 200,
        }}
        class="fixed right-2 top-1/2 -translate-y-1/2 z-50"
      >
        <NavBar orientation="vertical" size={48} />
      </div>
    {/if}
    <div
      class="relative overflow-auto h-dvh max-w-4xl w-full mx-auto bg-gradient-to-t from-primary/5 via-transparent to-primary/5"
    >
      {@render children?.()}
    </div>
    <BottomBar />
  </div>
{/if}

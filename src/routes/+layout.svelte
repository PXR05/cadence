<script lang="ts">
  import "../app.css";
  import { NavBar } from "$lib/components";
  import { PlayerBar } from "$lib/components";
  import { AuthDialog } from "$lib/components";
  import { GlobalDownloadProgress } from "$lib/components/layout";
  import { playerStore } from "$lib/stores/player.svelte";
  import { tracksStore } from "$lib/stores/tracks.svelte";
  import { authStore } from "$lib/stores/auth.svelte";
  import { downloadStore } from "$lib/stores/download.svelte";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";

  let { children } = $props();

  const hasDownloadProgress = $derived(downloadStore.progress !== null);

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
</script>

<svelte:window onkeydown={(e) => handleKeyboardEvent(e)} />

{#if !authStore.isAuthenticated}
  <AuthDialog onAuthenticated={loadInitialData} />
{:else}
  <div class="relative bg-background min-h-dvh flex flex-col font-mono">
    <NavBar />
    <div
      class="overflow-auto transition-all duration-300"
      class:h-[calc(100dvh-8.5rem-2px)]={!hasDownloadProgress}
      class:h-[calc(100dvh-8.5rem-2px-4.15rem)]={hasDownloadProgress}
    >
      {@render children?.()}
    </div>
    <GlobalDownloadProgress />
    <PlayerBar />
  </div>
{/if}

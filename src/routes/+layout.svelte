<script lang="ts">
  import "../app.css";
  import { ModeWatcher } from "mode-watcher";
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
  import { innerWidth } from "svelte/reactivity/window";
  import { page } from "$app/state";
  import { slide } from "svelte/transition";

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

  const isMobile = $derived((innerWidth.current ?? 0) <= 768);
  const isTopRoute = $derived(page.url.pathname.split("/").length <= 2);
</script>

<svelte:window onkeydown={(e) => handleKeyboardEvent(e)} />

<ModeWatcher />

{#if !authStore.isAuthenticated}
  <AuthDialog onAuthenticated={loadInitialData} />
{:else}
  <div
    class="relative bg-background min-h-dvh flex flex-col"
    style="--h: {isTopRoute && isMobile ? '14rem' : '10rem'}"
  >
    {#if !isMobile && isTopRoute}
      <div
        transition:slide={{
          axis: "x",
          duration: 200,
        }}
      class="fixed left-2 top-1/2 -translate-y-1/2 z-50">
        <NavBar orientation="vertical" size={48} />
      </div>
    {/if}
    <div
      class="overflow-auto transition-all duration-300 h-dvh"
      class:md:h-dvh={!downloadStore.isDownloading}
      class:md:h-[calc(100dvh-4.15rem)]={downloadStore.isDownloading}
    >
      {@render children?.()}
    </div>
    <GlobalDownloadProgress />
    <div class="flex flex-col gap-1.5 fixed bottom-0 left-0 right-0 z-50 p-1.5">
      <!-- <div class="_bg _blur absolute inset-0 -z-10"></div> -->
      <div class="_bg _color absolute inset-0 -z-10"></div>
      <PlayerBar />
      {#if isMobile && isTopRoute}
        <div
          transition:slide={{
            duration: 200,
          }}
        >
          <NavBar />
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  ._bg {
    &::before,
    &::after {
      pointer-events: none;
      content: "";
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: -1;
      mask: linear-gradient(to bottom, transparent, black);
    }
    &::before {
      height: var(--h);
    }
    &::after {
      height: calc(var(--h) - 1rem);
    }
  }

  ._color {
    &::before,
    &::after {
      background-color: hsl(from var(--background) h s l / 0.8);
    }
  }

  /* ._blur {
    &::before,
    &::after {
      backdrop-filter: blur(1rem) saturate(120%) contrast(120%) brightness(120%);
    }
  } */
</style>

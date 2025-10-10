<script lang="ts">
  import { onMount } from "svelte";
  import "../app.css";
  import NavBar from "$lib/components/NavBar.svelte";
  import PlayerBar from "$lib/components/PlayerBar.svelte";
  import { playerStore } from "$lib/stores/player.svelte";
  import { tracksStore } from "$lib/stores/tracks.svelte";
  import { goto } from "$app/navigation";

  let { children } = $props();

  onMount(() => {
    tracksStore.loadAllTracks().catch((error) => {
      console.error("Failed to load tracks on app initialization:", error);
    });
  });

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

<div class="relative bg-background min-h-dvh flex flex-col font-mono">
  <NavBar />
  <div class="flex-1">
    {@render children?.()}
  </div>
  <PlayerBar />
</div>

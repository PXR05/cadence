<script lang="ts">
  import { slide } from "svelte/transition";
  import PlayerBar from "../player/PlayerBar.svelte";
  import NavBar from "./NavBar.svelte";
  import GlobalDownloadProgress from "./GlobalDownloadProgress.svelte";
  import { innerWidth } from "svelte/reactivity/window";
  import { page } from "$app/state";
  import { useDialogState } from "$lib/hooks";

  const isMobile = $derived((innerWidth.current ?? 0) <= 768);
  const isTopRoute = $derived(page.url.pathname.split("/").length <= 2);

  const panelState = useDialogState("player-detail");
</script>

<div
  class="flex flex-col gap-1.5 fixed bottom-0 left-0 right-0 z-50 transition-all duration-200
{panelState.isOpen ? 'p-0' : 'p-1.5'}"
>
  <div class="_bg _blur absolute inset-0 -z-10"></div>
  <div class="_bg _color absolute inset-0 -z-10"></div>
  <GlobalDownloadProgress />
  <PlayerBar {panelState} />
  {#if isMobile && isTopRoute && !panelState.isOpen}
    <div
      transition:slide={{
        duration: 200,
      }}
    >
      <NavBar />
    </div>
  {/if}
</div>

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

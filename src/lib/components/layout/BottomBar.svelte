<script lang="ts">
  import PlayerBar from "../player/PlayerBar.svelte";
  import NavBar from "./NavBar.svelte";
  import GlobalDownloadProgress from "./GlobalDownloadProgress.svelte";
  import { innerWidth } from "svelte/reactivity/window";
  import { page } from "$app/state";
  import { useDialogState } from "$lib/hooks";

  const isMobile = $derived((innerWidth.current ?? 0) <= 768);
  const isTopRoute = $derived(page.url.pathname.split("/").length <= 2);

  const panelState = useDialogState("player-detail");

  const playerTranslate = $derived.by(() => {
    if (panelState.isOpen) {
      return `0`;
    }
    if (isTopRoute && isMobile) {
      return `calc(100dvh - 3.875rem)`;
    }
    return `calc(100dvh - 0.375rem)`;
  });

  const downloadTranslate = $derived.by(() => {
    if (isTopRoute && isMobile) {
      return `-9.3rem`;
    }
    return `-5.775rem`;
  });
</script>

<div class="flex flex-col gap-1.5 fixed bottom-0 left-0 right-0 z-50">
  <div class="_bg _blur absolute inset-0 -z-10"></div>
  <div class="_bg _color absolute inset-0 -z-10"></div>
  <div
    class="absolute bottom-0 left-0 right-0 transition-all duration-200"
    style="
      transform: translateY({downloadTranslate}); 
      will-change: transform;"
  >
    <GlobalDownloadProgress />
  </div>
  <div
    class="absolute bottom-0 left-0 right-0 transition-transform duration-200"
    style="
      transform: translateY({playerTranslate}); 
      will-change: transform;"
  >
    <PlayerBar {panelState} />
  </div>
  <div
    class="absolute bottom-1.5 left-1.5 right-1.5 transition-all duration-200"
    style="
    transform: translateY({panelState.isOpen || !isTopRoute || !isMobile
      ? '3.625rem'
      : '0'});
    will-change: transform;
    "
  >
    <NavBar />
  </div>
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

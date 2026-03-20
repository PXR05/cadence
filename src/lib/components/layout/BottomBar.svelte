<script lang="ts">
  import PlayerBar from "../player/PlayerBar.svelte";
  import NavBar from "./NavBar.svelte";
  import OfflineDownloadProgress from "./OfflineDownloadProgress.svelte";
  import RemoteDownloadProgress from "./RemoteDownloadProgress.svelte";
  import { innerWidth } from "svelte/reactivity/window";
  import { page } from "$app/state";
  import { useDialogState } from "$lib/hooks";
  import { appearanceStore } from "$lib/stores/appearance.svelte";

  const isMobile = $derived((innerWidth.current ?? 0) <= 768);
  const isTopRoute = $derived(
    page.url.pathname.split("/").length <= 2 &&
      !page.url.pathname.includes("/playlist"),
  );

  const panelState = useDialogState("player-detail");

  const downloadTranslate = $derived.by(() => {
    if (isTopRoute && isMobile) {
      return `-9.3rem`;
    }
    return `-6rem`;
  });

  const navTranslate = $derived.by(() => {
    if (panelState.isOpen || !isTopRoute || !isMobile) {
      return `3.625rem`;
    }
    return `0`;
  });
</script>

<div class="flex flex-col gap-1.5 fixed bottom-0 left-0 right-0 z-50">
  <div class="_bg _color absolute inset-0 -z-10"></div>
  <div
    class="absolute bottom-0 left-0 right-0 space-y-1.5
    {appearanceStore.disableAnimations ? '' : 'transition-all duration-200'}"
    style="
      transform: translate3d(0, {downloadTranslate}, 0);
      will-change: transform;"
  >
    <RemoteDownloadProgress />
    <OfflineDownloadProgress />
  </div>
  <PlayerBar />
  <div
    class="absolute bottom-1.5 left-1.5 right-1.5 z-60
    {appearanceStore.disableAnimations ? '' : 'transition-all duration-200'}"
    style="
    transform: translate3d(0, {navTranslate}, 0);
    will-change: transform;"
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
      background-color: var(--background);
    }
  }
</style>

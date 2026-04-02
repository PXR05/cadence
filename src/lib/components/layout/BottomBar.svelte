<script lang="ts">
  import PlayerBar from "../player/PlayerBar.svelte";
  import NavBar from "./NavBar.svelte";
  import OfflineDownloadProgress from "./OfflineDownloadProgress.svelte";
  import RemoteDownloadProgress from "./RemoteDownloadProgress.svelte";
  import { innerWidth } from "svelte/reactivity/window";
  import { page } from "$app/state";
  import { appearanceStore } from "$lib/stores/appearance.svelte";
  import { playerDetailMotionStore } from "$lib/stores/playerDetailMotion.svelte";
  import { playerStore } from "$lib/stores/player.svelte";

  function lerp(start: number, end: number, progress: number): number {
    return start + (end - start) * progress;
  }

  const isMobile = $derived((innerWidth.current ?? 0) <= 768);
  const isTopRoute = $derived(
    page.url.pathname.split("/").length <= 2 &&
      !page.url.pathname.includes("/playlist"),
  );

  const downloadTranslate = $derived.by(() => {
    if (isTopRoute && isMobile) {
      return `-10rem`;
    }
    return `-6rem`;
  });

  const navMotionProgress = $derived.by(() => {
    if (!isTopRoute || !isMobile) {
      return 1;
    }

    const progress = playerDetailMotionStore.openProgress;
    return Math.min(1, progress * 2);
  });

  const navTranslate = $derived.by(() => {
    if (!isTopRoute || !isMobile) {
      return `4.375rem`;
    }

    return `${lerp(0, 4.375, navMotionProgress).toFixed(4)}rem`;
  });

  const navOpacity = $derived.by(() => {
    if (!isTopRoute || !isMobile) {
      return `1`;
    }

    return `${(1 - navMotionProgress).toFixed(4)}`;
  });

  const bgTopOffset = $derived.by(() => {
    if (!isTopRoute) {
      if (
        playerStore.trackQueue.length > 0 &&
        page.url.pathname.split("/").length > 2
      ) {
        return -4.75 + "rem";
      }
      return -0.25 + "rem";
    }
    if (playerStore.trackQueue.length > 0) {
      return -4.25 + "rem";
    }
    return 0.5 + "rem";
  });

</script>

<div class="flex flex-col gap-1.5 fixed bottom-0 left-0 right-0 z-50">
  <div
    style="
      --h: {isTopRoute ? 5 : 2}rem;
      top: calc(-1*var(--h));
    "
    class="md:hidden _bg _color absolute inset-0 -z-10"
  ></div>

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

  <div class="absolute bottom-0 left-0 right-0 z-60">
    <div
      style="
      top: calc(-100dvh + 5rem);
      left: 0.5rem;
      right: 0.5rem;
      bottom: 0.5rem;
      clip-path: inset(calc(({bgTopOffset}) - (-100dvh + 5rem)) 0 0 0 round var(--radius-4xl));
      will-change: clip-path;
    "
      class="md:hidden absolute inset-0 rounded-4xl border border-input/15
      {appearanceStore.disableBlur
        ? 'bg-muted'
        : 'bg-muted-foreground/10 dark:bg-muted/60 backdrop-blur-md'}
      {!isTopRoute && playerStore.trackQueue.length === 0
        ? 'opacity-0 pointer-events-none'
        : ''}
      "
    ></div>

    <div
      class={playerStore.trackQueue.length === 0
        ? "max-md:pointer-events-none max-md:opacity-0"
        : ""}
    >
      <PlayerBar />
    </div>

    <div
      class="md:hidden m-3
      {appearanceStore.disableAnimations ? '' : 'transition-all duration-200'}
      {playerDetailMotionStore.isDragging || playerDetailMotionStore.isAnimating
        ? 'transition-none!'
        : ''}"
      style="
        will-change: transform, opacity;
        transform: translate3d(0, {navTranslate}, 0);
        opacity: {navOpacity};
      "
    >
      <NavBar />
    </div>
  </div>
</div>

<style>
  ._bg {
    &::before,
    &::after {
      pointer-events: none;
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      z-index: -1;
      mask: linear-gradient(to bottom, transparent, black 90%, black);
    }
    &::before {
      height: var(--h);
    }
    &::after {
      height: calc(var(--h) - 0rem);
    }
  }

  ._color {
    &::before,
    &::after {
      background-color: var(--background);
    }
  }
</style>

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
  import { cubicOut, quintOut } from "svelte/easing";
  import { Progress } from "bits-ui";

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
    const hasQueue = playerStore.trackQueue.length > 0;

    if (isTopRoute) {
      return hasQueue ? 9.5 : 4.75;
    }

    return hasQueue ? 5.5 : 9.5;
  });

  const bgTopInset = $derived.by(() => {
    // const baseOffset = bgTopOffset;
    // const progress = playerDetailMotionStore.openProgress;

    // return `${100 * (1 - progress)}dvh - ${baseOffset * (1 - progress)}rem`;
    return `100dvh - ${bgTopOffset}rem`;
  });

  const bgInset = $derived(
    0.5,
    // 0.5 - quintOut(0.5 * playerDetailMotionStore.openProgress),
  );
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

  <div
    style="
      top: -100dvh;
      left: 0;
      right: 0;
      bottom: 0;
      clip-path: inset(calc({bgTopInset}) {bgInset}rem {bgInset}rem {bgInset}rem round var(--radius-4xl));
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
  <div class="absolute bottom-0 left-0 right-0 z-60">
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

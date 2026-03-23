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
  import { cubicOut } from "svelte/easing";

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
      return -0.25 + "rem";
    }
    if (playerStore.trackQueue.length > 0) {
      return -4.25 + "rem";
    }
    return 0.5 + "rem";
  });

  const panelOpenProgress = $derived.by(() => {
    const openProgress = playerDetailMotionStore.openProgress;
    return cubicOut(openProgress);
  });

  const bgInset = $derived.by(() => {
    const progress = panelOpenProgress;
    const closedInset = 0.5;
    const openInset = -0.75;

    return lerp(closedInset, openInset, progress).toFixed(4) + "rem";
  });

  const bgTopStyle = $derived.by(() => {
    const progress = playerDetailMotionStore.openProgress;
    const closedTop = bgTopOffset;

    if (progress <= 0) {
      return closedTop;
    }

    if (progress >= 1) {
      return "calc(-100dvh + 6rem)";
    }

    const closedWeight = (1 - progress).toFixed(4);
    const openWeight = progress.toFixed(4);

    return `calc((${closedTop}) * ${closedWeight} + (-100dvh + 6rem) * ${openWeight})`;
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
      top: {bgTopStyle};
      left: {bgInset};
      right: {bgInset};
      bottom: {bgInset};
    "
      class="md:hidden transition-all duration-200 absolute inset-0 rounded-4xl border border-input/15
      {appearanceStore.disableBlur
        ? 'bg-muted'
        : 'bg-muted-foreground/10 dark:bg-muted/70 backdrop-blur-md'}
      {playerDetailMotionStore.isDragging || playerDetailMotionStore.isAnimating
        ? 'transition-none!'
        : ''}
      {!isTopRoute && playerStore.trackQueue.length === 0
        ? 'opacity-0 pointer-events-none'
        : ''}
      {panelOpenProgress > 0.98 ? 'rounded-none' : 'rounded-4xl'}  
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

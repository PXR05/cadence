<script lang="ts">
  import { goto } from "$app/navigation";
  import { trackInfoDialogStore } from "$lib/stores/trackInfoDialog.svelte";
  import { onMount } from "svelte";

  interface Props {
    trackId: string;
    title: string;
    artists: string[];
    color?: string;
    compact?: boolean;
    openDialogOnClick?: boolean;
  }

  let {
    trackId,
    title,
    artists,
    color,
    compact = false,
    openDialogOnClick = true,
  }: Props = $props();

  const AUTO_SCROLL_PX_PER_SEC = 28;
  const EDGE_HOLD_MS = 1000;

  let titleViewport: HTMLDivElement | null = $state(null);
  let titleContent: HTMLHeadingElement | null = $state(null);
  let titleOffset = $state(0);
  let titleMaxOffset = $state(0);
  let titleDirection: 1 | -1 = 1;
  let titlePauseUntil = 0;

  let artistsViewport: HTMLDivElement | null = $state(null);
  let artistsContent: HTMLParagraphElement | null = $state(null);
  let artistsOffset = $state(0);
  let artistsMaxOffset = $state(0);
  let artistsDirection: 1 | -1 = 1;
  let artistsPauseUntil = 0;

  let rafId = 0;
  let lastTick = 0;
  let lastTitleKey = "";
  let lastArtistsKey = "";

  function measureTitle() {
    if (!titleViewport || !titleContent) {
      titleMaxOffset = 0;
      titleOffset = 0;
      return;
    }

    titleMaxOffset = Math.max(
      0,
      titleContent.scrollWidth - titleViewport.clientWidth,
    );
    if (titleOffset > titleMaxOffset) {
      titleOffset = titleMaxOffset;
    }
  }

  function measureArtists() {
    if (!artistsViewport || !artistsContent) {
      artistsMaxOffset = 0;
      artistsOffset = 0;
      return;
    }

    artistsMaxOffset = Math.max(
      0,
      artistsContent.scrollWidth - artistsViewport.clientWidth,
    );
    if (artistsOffset > artistsMaxOffset) {
      artistsOffset = artistsMaxOffset;
    }
  }

  function updateAutoScroll(
    now: number,
    dt: number,
    maxOffset: number,
    offset: number,
    direction: 1 | -1,
    pauseUntil: number,
  ) {
    if (maxOffset <= 0) {
      return { offset: 0, direction: 1 as const, pauseUntil: 0 };
    }

    if (now < pauseUntil) {
      return { offset, direction, pauseUntil };
    }

    const nextOffset =
      offset + ((AUTO_SCROLL_PX_PER_SEC * dt) / 1000) * direction;

    if (nextOffset >= maxOffset) {
      return {
        offset: maxOffset,
        direction: -1 as const,
        pauseUntil: now + EDGE_HOLD_MS,
      };
    }

    if (nextOffset <= 0) {
      return {
        offset: 0,
        direction: 1 as const,
        pauseUntil: now + EDGE_HOLD_MS,
      };
    }

    return { offset: nextOffset, direction, pauseUntil };
  }

  function frame(now: number) {
    const dt = lastTick === 0 ? 16 : now - lastTick;
    lastTick = now;

    const nextTitle = updateAutoScroll(
      now,
      dt,
      titleMaxOffset,
      titleOffset,
      titleDirection,
      titlePauseUntil,
    );
    titleOffset = nextTitle.offset;
    titleDirection = nextTitle.direction;
    titlePauseUntil = nextTitle.pauseUntil;

    const nextArtists = updateAutoScroll(
      now,
      dt,
      artistsMaxOffset,
      artistsOffset,
      artistsDirection,
      artistsPauseUntil,
    );
    artistsOffset = nextArtists.offset;
    artistsDirection = nextArtists.direction;
    artistsPauseUntil = nextArtists.pauseUntil;

    rafId = requestAnimationFrame(frame);
  }

  function titleMaskStyle() {
    const leftColor = titleOffset > 0.5 ? "transparent" : "black";
    const rightColor =
      titleOffset < titleMaxOffset - 0.5 ? "transparent" : "black";
    return `
      -webkit-mask-image: linear-gradient(to right, ${leftColor} 0%, black 1rem, black calc(100% - 2rem), ${rightColor} 100%);
      mask-image: linear-gradient(to right, ${leftColor} 0%, black 1rem, black calc(100% - 2rem), ${rightColor} 100%);
      -webkit-mask-repeat: no-repeat;
      mask-repeat: no-repeat;
    `;
  }

  function artistsMaskStyle() {
    const leftColor = artistsOffset > 0.5 ? "transparent" : "black";
    const rightColor =
      artistsOffset < artistsMaxOffset - 0.5 ? "transparent" : "black";
    return `
      -webkit-mask-image: linear-gradient(to right, ${leftColor} 0%, black 1rem, black calc(100% - 2rem), ${rightColor} 100%);
      mask-image: linear-gradient(to right, ${leftColor} 0%, black 1rem, black calc(100% - 2rem), ${rightColor} 100%);
      -webkit-mask-repeat: no-repeat;
      mask-repeat: no-repeat;
    `;
  }

  onMount(() => {
    measureTitle();
    measureArtists();

    const resizeObserver = new ResizeObserver(() => {
      measureTitle();
      measureArtists();
    });

    if (titleViewport) resizeObserver.observe(titleViewport);
    if (titleContent) resizeObserver.observe(titleContent);
    if (artistsViewport) resizeObserver.observe(artistsViewport);
    if (artistsContent) resizeObserver.observe(artistsContent);

    rafId = requestAnimationFrame(frame);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
    };
  });

  $effect(() => {
    const titleKey = title;
    const artistsKey = artists.join("\u0000");

    if (titleKey === lastTitleKey && artistsKey === lastArtistsKey) {
      return;
    }

    lastTitleKey = titleKey;
    lastArtistsKey = artistsKey;

    measureTitle();
    measureArtists();

    titleOffset = 0;
    titleDirection = 1;
    titlePauseUntil = 0;

    artistsOffset = 0;
    artistsDirection = 1;
    artistsPauseUntil = 0;
  });

  function openInfoDialog() {
    if (!trackId) return;
    trackInfoDialogStore.openById(trackId);
  }
</script>

{#snippet trackInfoContent()}
  <div
    bind:this={titleViewport}
    class="overflow-hidden"
    role="group"
    aria-label="Auto-scrolling track title"
    style={titleMaskStyle()}
  >
    <h2
      bind:this={titleContent}
      class="whitespace-nowrap font-medium will-change-transform {compact
        ? 'text-base'
        : 'text-xl'}"
      style="color: {color}; transform: translateX(-{titleOffset}px);"
    >
      {title}
    </h2>
  </div>

  <div
    bind:this={artistsViewport}
    class="overflow-hidden"
    role="group"
    aria-label="Auto-scrolling artists"
    style={artistsMaskStyle()}
  >
    <p
      bind:this={artistsContent}
      class="text-muted-foreground whitespace-nowrap will-change-transform {compact
        ? 'text-sm'
        : ''}"
      style="color: {color}; transform: translateX(-{artistsOffset}px);"
    >
      {#each artists as a, i}
        {#if openDialogOnClick}
          <span>{a}</span>{#if i < artists.length - 1},&nbsp;{/if}
        {:else}
          <span
            role="link"
            tabindex="0"
            class="hover:underline cursor-pointer max-md:pointer-events-none"
            onclick={(e) => {
              e.stopPropagation();
              goto(`/playlist?id=artist_${a}`);
            }}
            onkeydown={(e) =>
              e.key === "Enter" && goto(`/playlist?id=artist_${a}`)}>{a}</span
          >{#if i < artists.length - 1},&nbsp;{/if}
        {/if}
      {/each}
    </p>
  </div>
{/snippet}

{#if openDialogOnClick}
  <button
    type="button"
    data-allow-panel-drag
    class="text-left grid w-full min-w-0 {compact
      ? 'gap-0.5'
      : 'mb-2 gap-1'} cursor-pointer"
    onclick={openInfoDialog}
    aria-label="Open track info"
    draggable="false"
  >
    {@render trackInfoContent()}
  </button>
{:else}
  <div
    data-allow-panel-drag
    class="text-left grid w-full min-w-0 {compact ? 'gap-0.5' : 'mb-2 gap-1'}"
    role="presentation"
  >
    {@render trackInfoContent()}
  </div>
{/if}

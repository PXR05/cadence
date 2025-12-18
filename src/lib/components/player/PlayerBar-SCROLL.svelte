<script lang="ts">
    import { page } from "$app/state";
    import type { CarouselAPI } from "$lib/components/ui/carousel/context";
    import { useDialogState } from "$lib/hooks/useDialogState.svelte";
    import { playerStore } from "$lib/stores/player.svelte";
    import { ListMusicIcon, PauseIcon, PlayIcon } from "@lucide/svelte";
    import { onDestroy, onMount, tick } from "svelte";
    import { innerWidth } from "svelte/reactivity/window";
    import { Button } from "../ui/button";
    import PlaybackControls from "./PlaybackControls.svelte";
    import PlayerDetailsPanel from "./PlayerDetailsPanel.svelte";
    import ProgressBar from "./ProgressBar.svelte";
    import QueueDialog from "./QueueDialog.svelte";
    import TrackCarousel from "./TrackCarousel.svelte";
    import VolumeControl from "./VolumeControl.svelte";
    import { cubicOut } from "svelte/easing";

    const { panelState }: { panelState: ReturnType<typeof useDialogState> } =
        $props();

    const isMobile = $derived((innerWidth.current ?? 0) <= 768);
    const isTopRoute = $derived(page.url.pathname.split("/").length <= 2);

    const navbarOffset = $derived(isTopRoute && isMobile ? 62 : 6);

    let scrollContainerEl: HTMLDivElement | null = $state(null);
    let barSnapEl: HTMLDivElement | null = $state(null);
    let panelSnapEl: HTMLDivElement | null = $state(null);
    let barWrapperEl: HTMLDivElement | null = $state(null);
    let detailsWrapperEl: HTMLDivElement | null = $state(null);
    let audioEl: HTMLAudioElement | null = $state(null);

    let isScrolling = $state(false);
    let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
    let lastPanelState: boolean | null = null;
    let isProgrammaticScroll = $state(false);

    const isPanelAnimating = $derived(isScrolling);
    const queueDialog = useDialogState("queue");

    $effect(() => {
        if (audioEl && !playerStore.isLoaded) {
            playerStore.initialize(audioEl);
        }
    });

    $effect(() => {
        const isOpen = panelState.isOpen;
        if (scrollContainerEl && lastPanelState !== isOpen) {
            lastPanelState = isOpen;
            scrollToPosition(isOpen);
        }
    });

    async function scrollToPosition(open: boolean) {
        if (!scrollContainerEl || !barSnapEl || !panelSnapEl) return;

        isProgrammaticScroll = true;
        const targetEl = open ? panelSnapEl : barSnapEl;
        targetEl.scrollIntoView({ behavior: "smooth", block: "start" });

        await tick();
        setTimeout(() => {
            isProgrammaticScroll = false;
        }, 350);
    }

    function handleScroll() {
        if (!scrollContainerEl) return;

        isScrolling = true;
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            isScrolling = false;
        }, 150);

        updateOpacity();
    }

    function handleScrollEnd() {
        if (!scrollContainerEl || !panelSnapEl || isProgrammaticScroll) return;

        const scrollTop = scrollContainerEl.scrollTop;
        const panelTop = panelSnapEl.offsetTop;

        const shouldBeOpen = scrollTop > panelTop / 2;

        if (shouldBeOpen !== panelState.isOpen) {
            lastPanelState = shouldBeOpen;
            if (shouldBeOpen) {
                panelState.open();
            } else {
                panelState.close();
            }
        }
    }

    function updateOpacity() {
        if (
            !scrollContainerEl ||
            !panelSnapEl ||
            !barWrapperEl ||
            !detailsWrapperEl
        )
            return;

        const scrollTop = scrollContainerEl.scrollTop;
        const panelTop = panelSnapEl.offsetTop;

        if (panelTop <= 0) return;

        const progress = Math.min(1, Math.max(0, scrollTop / panelTop));
        const easedProgress = cubicOut(progress);
        const barOpacity = 1 - easedProgress;
        const detailsOpacity = easedProgress;

        barWrapperEl.style.opacity = String(barOpacity);
        detailsWrapperEl.style.opacity = String(detailsOpacity);
    }

    onMount(() => {
        if (scrollContainerEl && barSnapEl) {
            lastPanelState = panelState.isOpen;
            if (panelState.isOpen && panelSnapEl) {
                panelSnapEl.scrollIntoView({
                    behavior: "instant",
                    block: "start",
                });
            } else {
                barSnapEl.scrollIntoView({
                    behavior: "instant",
                    block: "start",
                });
            }
            updateOpacity();
        }
    });

    onDestroy(() => {
        if (scrollTimeout) clearTimeout(scrollTimeout);
        playerStore.cleanup();
    });

    function setCarouselApi(api: CarouselAPI | null) {
        if (api) playerStore.initializeCarousel("main", api);
    }
</script>

{#snippet barControls()}
    <div class="hidden md:flex place-self-center">
        <PlaybackControls />
    </div>

    <div
        class="hidden md:flex items-center gap-2 shrink-0 self-center justify-self-end pr-3"
    >
        <Button
            variant="ghost"
            onclick={() => queueDialog.open()}
            class="size-8 grid place-items-center"
            aria-label="Open queue"
        >
            <ListMusicIcon size={18} />
        </Button>
        <VolumeControl />
    </div>

    <Button
        variant="ghost"
        onclick={() => playerStore.togglePlayPause()}
        class="md:hidden size-12 grid place-items-center shrink-0 mr-2 p-0"
        aria-label={playerStore.isPlaying ? "Pause" : "Play"}
    >
        {#if playerStore.isPlaying}
            <PauseIcon
                absoluteStrokeWidth
                strokeWidth={2}
                fill="currentColor"
                class="size-6"
            />
        {:else}
            <PlayIcon
                absoluteStrokeWidth
                strokeWidth={2}
                fill="currentColor"
                class="size-6"
            />
        {/if}
    </Button>
{/snippet}

{#snippet bar()}
    <div data-player-bar>
        <div
            class="mx-1.5 rounded-xl overflow-clip border border-input/15 bg-muted-foreground/10 dark:bg-muted/50 backdrop-blur-md"
        >
            <div
                class="relative flex md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center max-md:justify-between py-2 min-h-16"
            >
                <TrackCarousel
                    onTrackClick={() => (isMobile ? panelState.open() : {})}
                    setApi={(emblaApi) => setCarouselApi(emblaApi)}
                />

                {#if playerStore.currentTrack}
                    {@render barControls()}
                {/if}
            </div>
            <div class="px-2 pb-2">
                <ProgressBar {isPanelAnimating} />
            </div>
        </div>
    </div>
{/snippet}

<div
    bind:this={scrollContainerEl}
    class="hide-scrollbar fixed inset-0 z-50 overscroll-none select-none pointer-events-none"
    class:overflow-y-auto={isMobile && playerStore.currentTrack}
    class:overflow-hidden={!isMobile || !playerStore.currentTrack}
    style="
        scroll-snap-type: {isMobile && playerStore.currentTrack
        ? 'y mandatory'
        : 'none'}; 
        -webkit-overflow-scrolling: touch;"
    onscroll={handleScroll}
    onscrollend={handleScrollEnd}
>
    <div
        bind:this={barSnapEl}
        class="h-dvh flex flex-col justify-end"
        style="scroll-snap-align: {isMobile && playerStore.currentTrack
            ? 'start'
            : 'none'};"
    >
        <div
            bind:this={barWrapperEl}
            class="pointer-events-auto"
            style="padding-bottom: {navbarOffset}px;"
        >
            {@render bar()}
        </div>
    </div>

    {#if isMobile && playerStore.currentTrack}
        <div
            bind:this={panelSnapEl}
            class="h-dvh pointer-events-auto"
            style="scroll-snap-align: end;"
        >
            <div
                bind:this={detailsWrapperEl}
                data-details-panel
                class="h-full"
                style="opacity: 0;"
            >
                <PlayerDetailsPanel
                    onOpenChange={(v: boolean) =>
                        v ? panelState.open() : panelState.close()}
                    onQueueOpen={() => queueDialog.open()}
                    {isPanelAnimating}
                />
            </div>
        </div>
    {/if}
</div>

<audio bind:this={audioEl}></audio>

<QueueDialog
    open={queueDialog.isOpen}
    onOpenChange={(open) => !open && queueDialog.close()}
/>

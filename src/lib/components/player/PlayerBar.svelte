<script lang="ts">
    import { page } from "$app/state";
    import type { CarouselAPI } from "$lib/components/ui/carousel/context";
    import { useDialogState } from "$lib/hooks/useDialogState.svelte";
    import { playerStore } from "$lib/stores/player.svelte";
    import { ListMusicIcon, PauseIcon, PlayIcon } from "@lucide/svelte";
    import { onDestroy, onMount } from "svelte";
    import { innerHeight, innerWidth } from "svelte/reactivity/window";
    import { Button } from "../ui/button";
    import PlaybackControls from "./PlaybackControls.svelte";
    import PlayerDetailsPanel from "./PlayerDetailsPanel.svelte";
    import ProgressBar from "./ProgressBar.svelte";
    import QueueDialog from "./QueueDialog.svelte";
    import TrackCarousel from "./TrackCarousel.svelte";
    import VolumeControl from "./VolumeControl.svelte";

    const { panelState }: { panelState: ReturnType<typeof useDialogState> } =
        $props();

    const isMobile = $derived((innerWidth.current ?? 0) <= 768);
    const isTopRoute = $derived(page.url.pathname.split("/").length <= 2);
    const closedPosition = $derived.by(() => {
        if (isTopRoute && isMobile) {
            return (innerHeight.current ?? window.innerHeight) - 62;
        }
        return (innerHeight.current ?? window.innerHeight) - 6;
    });

    let containerEl: HTMLDivElement | null = $state(null);
    let barWrapperEl: HTMLDivElement | null = $state(null);
    let detailsWrapperEl: HTMLDivElement | null = $state(null);
    let playerBarEl: HTMLDivElement | null = $state(null);
    let audioEl: HTMLAudioElement | null = $state(null);

    let isDragging = $state(false);
    let dragStartY = $state(0);
    let dragCurrentY = $state(0);
    let dragLastY = $state(0);
    let dragLastTime = $state(0);
    let currentTranslateY = $state(0);

    let isAnimating = $state(false);
    let animationTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let lastPanelState: boolean | null = null;

    const isPanelAnimating = $derived(isDragging || isAnimating);
    const queueDialog = useDialogState("queue");

    $effect(() => {
        if (audioEl && !playerStore.isLoaded) {
            playerStore.initialize(audioEl);
        }
    });

    $effect(() => {
        const isOpen = panelState.isOpen;
        if (!isDragging && containerEl && lastPanelState !== isOpen) {
            lastPanelState = isOpen;
            const targetY = isOpen ? 0 : closedPosition;
            animateToPosition(targetY);
        }
    });

    function getOpacity(yPos: number) {
        return Math.min(1, Math.max(0, yPos / (closedPosition || 1)));
    }

    function applyPosition(yPos: number, transition = false) {
        if (!containerEl) return;

        const barOpacity = getOpacity(yPos);
        const detailsOpacity = 1 - barOpacity;
        const duration = "0.3s";
        const easing = "cubic-bezier(0.33, 1, 0.68, 1)";
        const transitionValue = transition ? `${duration} ${easing}` : "";

        containerEl.style.transition = transition
            ? `transform ${transitionValue}`
            : "";
        containerEl.style.transform = `translate3d(0, ${yPos}px, 0)`;

        if (barWrapperEl) {
            barWrapperEl.style.transition = transition
                ? `opacity ${transitionValue}`
                : "";
            barWrapperEl.style.opacity = String(barOpacity);
        }
        if (detailsWrapperEl) {
            detailsWrapperEl.style.transition = transition
                ? `opacity ${transitionValue}`
                : "";
            detailsWrapperEl.style.opacity = String(detailsOpacity);
        }

        currentTranslateY = yPos;
    }

    function clearTransitions() {
        if (containerEl) containerEl.style.transition = "";
        if (barWrapperEl) barWrapperEl.style.transition = "";
        if (detailsWrapperEl) detailsWrapperEl.style.transition = "";
    }

    function animateToPosition(targetY: number, duration = 0.3) {
        if (!containerEl) return;

        if (animationTimeoutId) {
            clearTimeout(animationTimeoutId);
            animationTimeoutId = null;
        }

        isAnimating = true;

        requestAnimationFrame(() => {
            applyPosition(targetY, true);

            animationTimeoutId = setTimeout(() => {
                clearTransitions();
                isAnimating = false;
                animationTimeoutId = null;
            }, duration * 1000);
        });
    }

    function shouldIgnoreDrag(target: EventTarget | null): boolean {
        if (!(target instanceof Element)) return false;
        if (!panelState.isOpen) return false;

        const selectors = [
            "button",
            "input",
            "textarea",
            "select",
            "a",
            '[role="button"]',
            '[role="slider"]',
            '[data-slot="carousel"]',
            '[data-slot="carousel-content"]',
            '[data-slot="carousel-item"]',
            "[data-embla-container]",
            "[data-embla-slide]",
            '[role="region"][aria-roledescription="carousel"]',
            '[role="progressbar"]',
            'input[type="range"]',
            ".touch-none",
        ].join(",");

        return target.closest(selectors) !== null;
    }

    function handleDragStart(clientY: number, event: TouchEvent | MouseEvent) {
        if (!isMobile || shouldIgnoreDrag(event.target)) return;

        if (animationTimeoutId) {
            clearTimeout(animationTimeoutId);
            animationTimeoutId = null;
        }
        clearTransitions();
        isAnimating = false;

        isDragging = true;
        dragStartY = clientY;
        dragCurrentY = clientY;
        dragLastY = clientY;
        dragLastTime = Date.now();
    }

    function handleDragMove(clientY: number, event?: TouchEvent | MouseEvent) {
        if (!isDragging) return;

        if (event && "touches" in event && event.cancelable) {
            event.preventDefault();
        }

        const deltaY = clientY - dragStartY;
        const startPos = panelState.isOpen ? 0 : closedPosition;
        const newY = Math.max(0, Math.min(closedPosition, startPos + deltaY));

        applyPosition(newY, false);

        dragLastY = dragCurrentY;
        dragCurrentY = clientY;
        dragLastTime = Date.now();
    }

    function handleDragEnd() {
        if (!isDragging) return;

        const timeDelta = Date.now() - dragLastTime;
        const moveDelta = dragCurrentY - dragLastY;
        const velocity = timeDelta > 0 ? moveDelta / timeDelta : 0;

        let shouldOpen: boolean;
        if (Math.abs(velocity) > 0.3) {
            shouldOpen = moveDelta < 0;
        } else {
            const threshold = closedPosition * 0.1;
            shouldOpen = panelState.isOpen
                ? currentTranslateY < threshold
                : currentTranslateY < closedPosition - threshold;
        }

        const targetY = shouldOpen ? 0 : closedPosition;
        const duration =
            Math.abs(velocity) > 0.5
                ? Math.max(0.15, 0.3 - Math.abs(velocity) * 0.1)
                : 0.25;

        isDragging = false;
        lastPanelState = shouldOpen;

        animateToPosition(targetY, duration);

        if (shouldOpen) {
            panelState.open();
        } else {
            panelState.close();
        }
    }

    function handleTouchStart(e: TouchEvent) {
        if (!playerStore.currentTrack) return;
        handleDragStart(e.touches[0].clientY, e);
    }

    function handleTouchMove(e: TouchEvent) {
        if (isDragging) handleDragMove(e.touches[0].clientY, e);
    }

    function handleTouchEnd() {
        handleDragEnd();
    }

    function handleMouseDown(e: MouseEvent) {
        handleDragStart(e.clientY, e);
    }

    function handleMouseMove(e: MouseEvent) {
        handleDragMove(e.clientY, e);
    }

    function handleMouseUp() {
        handleDragEnd();
    }

    onMount(() => {
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        if (containerEl) {
            const initialY = panelState.isOpen ? 0 : closedPosition;
            lastPanelState = panelState.isOpen;
            applyPosition(initialY, false);
        }

        if (playerBarEl) {
            playerBarEl.addEventListener("touchstart", handleTouchStart, {
                passive: false,
            });
            playerBarEl.addEventListener("touchmove", handleTouchMove, {
                passive: false,
            });
        }

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
            playerBarEl?.removeEventListener("touchstart", handleTouchStart);
            playerBarEl?.removeEventListener("touchmove", handleTouchMove);
        };
    });

    onDestroy(() => {
        if (animationTimeoutId) clearTimeout(animationTimeoutId);
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
    <div
        bind:this={barWrapperEl}
        data-player-bar
        role="button"
        tabindex="0"
        ontouchend={handleTouchEnd}
        onmousedown={handleMouseDown}
    >
        <div
            bind:this={playerBarEl}
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
    bind:this={containerEl}
    class="absolute bottom-0 left-0 right-0"
    style="will-change: transform; overscroll-behavior: none;"
>
    <div class="select-none h-[calc(100dvh+5rem)]">
        {@render bar()}

        <audio bind:this={audioEl}></audio>

        <QueueDialog
            open={queueDialog.isOpen}
            onOpenChange={(open) => !open && queueDialog.close()}
        />

        <div
            bind:this={detailsWrapperEl}
            data-details-panel
            style="touch-action: none; overscroll-behavior: none; will-change: opacity;"
        >
            <PlayerDetailsPanel
                onOpenChange={(v) =>
                    v ? panelState.open() : panelState.close()}
                onQueueOpen={() => queueDialog.open()}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
                {isPanelAnimating}
            />
        </div>
    </div>
</div>

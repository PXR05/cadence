<script lang="ts">
    import { page } from "$app/state";
    import type { CarouselAPI } from "$lib/components/ui/carousel/context";
    import { useDialogState } from "$lib/hooks/useDialogState.svelte";
    import { getImageUrl, playerStore } from "$lib/stores/player.svelte";
    import { ListMusicIcon, PauseIcon, PlayIcon } from "@lucide/svelte";
    import gsap from "gsap";
    import { onDestroy, onMount } from "svelte";
    import { cubicOut } from "svelte/easing";
    import { innerHeight, innerWidth } from "svelte/reactivity/window";
    import { Button } from "../ui/button";
    import PlaybackControls from "./PlaybackControls.svelte";
    import PlayerDetailsPanel from "./PlayerDetailsPanel.svelte";
    import ProgressBar from "./ProgressBar.svelte";
    import QueueDialog from "./QueueDialog.svelte";
    import TrackCarousel from "./TrackCarousel.svelte";
    import VolumeControl from "./VolumeControl.svelte";

    const isMobile = $derived((innerWidth.current ?? 0) <= 768);
    const isTopRoute = $derived(page.url.pathname.split("/").length <= 2);

    const {
        panelState,
    }: {
        panelState: ReturnType<typeof useDialogState>;
    } = $props();

    let isDragging = $state(false);
    let startY = $state(0);
    let currentY = $state(0);
    let lastMoveY = $state(0);
    let lastMoveTime = $state(0);

    let translateY = $state(
        innerHeight.current ??
            (typeof window !== "undefined" ? window.innerHeight : 0),
    );
    let containerEl: HTMLDivElement | null = $state(null);
    let gsapTween: gsap.core.Tween | null = null;

    const closedPosition = $derived.by(() => {
        if (isTopRoute && isMobile) {
            return (innerHeight.current ?? window.innerHeight) - 62; // 3.875rem = 62px
        }
        return (innerHeight.current ?? window.innerHeight) - 6; // 0.375rem = 6px
    });

    const isPanelAnimating = $derived(
        isDragging ||
            (gsapTween !== null
                ? (gsapTween as gsap.core.Tween).isActive()
                : false),
    );

    $effect(() => {
        if (!isDragging && containerEl) {
            const targetY = panelState.isOpen ? 0 : closedPosition;
            animateToPosition(targetY);
        }
    });

    function animateToPosition(targetY: number, duration?: number) {
        if (!containerEl) return;

        if (gsapTween) {
            gsapTween.kill();
        }

        const currentTranslateY = gsap.getProperty(containerEl, "y") as number;
        const distance = Math.abs(targetY - currentTranslateY);

        const animDuration =
            duration ?? Math.min(0.25, Math.max(0.1, distance / 2500));

        gsapTween = gsap.to(containerEl, {
            y: targetY,
            duration: animDuration,
            ease: "power2.out",
            force3D: true,
            onUpdate: function () {
                translateY = gsap.getProperty(containerEl, "y") as number;
            },
            onComplete: () => {
                translateY = targetY;
                gsapTween = null;
            },
        });
    }

    const playerBarOpacity = $derived.by(() => {
        const closedPos = closedPosition || 1;
        const clampedPos = Math.min(1, translateY / closedPos);
        return cubicOut(clampedPos);
    });

    const detailsPanelOpacity = $derived.by(() => {
        const closedPos = closedPosition || 1;
        const clampedPos = Math.max(0, 1 - translateY / closedPos);
        return cubicOut(clampedPos);
    });

    let audioEl: HTMLAudioElement | null = $state(null);
    const queueDialog = useDialogState("queue");

    $effect(() => {
        if (audioEl && !playerStore.isLoaded) {
            playerStore.initialize(audioEl);
        }
    });

    function shouldIgnoreDrag(target: EventTarget | null): boolean {
        if (!(target instanceof Element)) return false;

        if (!panelState.isOpen) return false;

        const interactiveSelectors = [
            "button",
            "input",
            "textarea",
            "select",
            "a",
            '[role="button"]',
            '[role="slider"]',
            // Carousel
            '[data-slot="carousel"]',
            '[data-slot="carousel-content"]',
            '[data-slot="carousel-item"]',
            "[data-embla-container]",
            "[data-embla-slide]",
            '[role="region"][aria-roledescription="carousel"]',
            // Progress bar
            '[role="progressbar"]',
            'input[type="range"]',
            ".touch-none",
        ].join(",");

        return target.closest(interactiveSelectors) !== null;
    }

    function handleDragStart(clientY: number, event: TouchEvent | MouseEvent) {
        if (!isMobile) {
            return;
        }

        if (shouldIgnoreDrag(event.target)) {
            return;
        }

        if (gsapTween) {
            gsapTween.kill();
            gsapTween = null;
        }

        isDragging = true;
        startY = clientY;
        currentY = clientY;
        lastMoveY = clientY;
        lastMoveTime = Date.now();
    }

    function handleDragMove(clientY: number, event?: TouchEvent | MouseEvent) {
        if (!isDragging) return;

        const deltaY = clientY - startY;
        const startPosition = panelState.isOpen ? 0 : closedPosition;
        const newTranslate = startPosition + deltaY;

        if (event && "touches" in event && event.cancelable) {
            event.preventDefault();
        }

        const clampedTranslate = Math.max(
            0,
            Math.min(closedPosition, newTranslate),
        );

        if (containerEl) {
            gsap.set(containerEl, { y: clampedTranslate, force3D: true });
        }
        translateY = clampedTranslate;

        lastMoveY = currentY;
        currentY = clientY;
        lastMoveTime = Date.now();
    }

    function handleDragEnd() {
        if (!isDragging) return;

        const timeDelta = Date.now() - lastMoveTime;
        const moveDelta = currentY - lastMoveY;
        const velocityPxPerMs = timeDelta > 0 ? moveDelta / timeDelta : 0;

        let shouldOpen = false;

        if (Math.abs(velocityPxPerMs) > 0.3) {
            shouldOpen = moveDelta < 0;
        } else {
            const threshold = closedPosition * 0.1;
            const currentPos = translateY;

            if (panelState.isOpen) {
                shouldOpen = currentPos < threshold;
            } else {
                shouldOpen = currentPos < closedPosition - threshold;
            }
        }

        const targetPosition = shouldOpen ? 0 : closedPosition;

        let duration = 0.3;
        if (Math.abs(velocityPxPerMs) > 0.5) {
            duration = Math.max(0.15, 0.3 - Math.abs(velocityPxPerMs) * 0.1);
        }

        animateToPosition(targetPosition, duration);

        if (shouldOpen) {
            panelState.open();
        } else {
            panelState.close();
        }

        isDragging = false;
    }

    function handleTouchStart(e: TouchEvent) {
        if (!playerStore.currentTrack) {
            return;
        }
        handleDragStart(e.touches[0].clientY, e);
    }

    function handleTouchMove(e: TouchEvent) {
        if (isDragging) {
            handleDragMove(e.touches[0].clientY, e);
        }
    }

    let playerBarElement: HTMLDivElement | null = $state(null);

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
            gsap.set(containerEl, { y: initialY, force3D: true });
            translateY = initialY;
        }

        if (playerBarElement) {
            const touchStartHandler = (e: TouchEvent) => {
                handleTouchStart(e);
            };

            const touchMoveHandler = (e: TouchEvent) => {
                handleTouchMove(e);
            };

            playerBarElement.addEventListener("touchstart", touchStartHandler, {
                passive: false,
            });
            playerBarElement.addEventListener("touchmove", touchMoveHandler, {
                passive: false,
            });

            return () => {
                window.removeEventListener("mousemove", handleMouseMove);
                window.removeEventListener("mouseup", handleMouseUp);
                playerBarElement?.removeEventListener(
                    "touchstart",
                    touchStartHandler,
                );
                playerBarElement?.removeEventListener(
                    "touchmove",
                    touchMoveHandler,
                );
            };
        }

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    });

    onDestroy(() => {
        if (gsapTween) {
            gsapTween.kill();
        }
        playerStore.cleanup();
    });

    function setCarouselApi(api: CarouselAPI | null) {
        if (api) {
            playerStore.initializeCarousel("main", api);
        }
    }

    const track = $derived(playerStore.currentTrack);
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
        bind:this={playerBarElement}
        class="mx-1.5 rounded-xl overflow-clip border border-input/15 bg-muted-foreground/10 dark:bg-muted/50 backdrop-blur-md"
        style="opacity: {playerBarOpacity};"
        role="button"
        tabindex="0"
        ontouchend={handleTouchEnd}
        onmousedown={handleMouseDown}
    >
        <div
            class=" relative flex md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center max-md:justify-between py-2 min-h-16"
        >
            <!-- <TrackCarousel
                onTrackClick={() => (isMobile ? panelState.open() : {})}
                setApi={(emblaApi) => setCarouselApi(emblaApi)}
            /> -->

            <div
                class="md:pointer-events-none flex items-center flex-1 min-w-0 gap-2 text-left w-full pl-2"
            >
                <img
                    loading="lazy"
                    src={getImageUrl(track?.id ?? "")}
                    alt={track?.id}
                    class="rounded-md size-12 shrink-0 object-cover text-transparent"
                />
                <div class="text-left flex-1 min-w-0">
                    <p class="font-medium truncate">
                        {track?.metadata?.title ?? track?.filename ?? ""}
                    </p>
                    <p class="text-sm truncate font-light">
                        {track?.metadata?.artist ?? "Unknown Artist"}
                    </p>
                </div>
            </div>

            {#if playerStore.currentTrack}
                {@render barControls()}
            {/if}
        </div>
        <div class="px-2 pb-2">
            <ProgressBar {isPanelAnimating} />
        </div>
    </div>
{/snippet}

<div
    bind:this={containerEl}
    class="absolute bottom-0 left-0 right-0 will-change-transform overscroll-none"
>
    <div class="select-none h-[calc(100dvh+5rem)]">
        {@render bar()}

        <audio bind:this={audioEl}></audio>

        <QueueDialog
            open={queueDialog.isOpen}
            onOpenChange={(open) => !open && queueDialog.close()}
        />

        <div
            class="overscroll-none contain-layout contain-style contain-paint"
            style="opacity: {detailsPanelOpacity};"
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

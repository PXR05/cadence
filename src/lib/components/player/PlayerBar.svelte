<script lang="ts">
    import { page } from "$app/state";
    import type { CarouselAPI } from "$lib/components/ui/carousel/context";
    import { useDialogState } from "$lib/hooks/useDialogState.svelte";
    import { playerStore } from "$lib/stores/player.svelte";
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
    import { vaulEase } from "$lib/utils";
    import { useMenuDialogState } from "$lib/hooks";

    const isMobile = $derived((innerWidth.current ?? 0) <= 768);
    const isTopRoute = $derived(page.url.pathname.split("/").length <= 2);

    const panelState = useDialogState("player-detail");

    let isDragging = $state(false);
    let startY = $state(0);
    let currentY = $state(0);
    let lastMoveY = $state(0);
    let lastMoveTime = $state(0);

    let containerEl: HTMLDivElement | null = $state(null);
    let barElement: HTMLDivElement | null = $state(null);
    let detailsPanelElement: HTMLDivElement | null = $state(null);
    let gsapTween: gsap.core.Tween | null = null;

    const closedPosition = $derived.by(() => {
        const height = innerHeight.current || window.innerHeight;
        if (height === 0) return 0;
        if (isTopRoute && isMobile) return height - 62 - 80; // 3.875rem = 62px
        return height - 6 - 80; // 0.375rem = 6px
    });

    const isPanelAnimating = $derived(
        isDragging ||
            (gsapTween !== null
                ? (gsapTween as gsap.core.Tween).isActive()
                : false),
    );

    function updateOpacity(currentY: number) {
        const closedPos = closedPosition || 1;
        const normalizedPos = Math.max(0, Math.min(1, currentY / closedPos));
        const detailsOpacity = cubicOut(1 - normalizedPos);

        if (detailsPanelElement) {
            detailsPanelElement.style.opacity = String(detailsOpacity);
        }
    }

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

        const startY = gsap.getProperty(containerEl, "y") as number;
        const distance = Math.abs(targetY - startY);

        const animDuration =
            duration ?? Math.min(0.3, Math.max(0.15, distance / 1000));

        const proxy = { y: startY };

        gsapTween = gsap.to(proxy, {
            y: targetY,
            duration: animDuration,
            ease: vaulEase,
            onUpdate: () => {
                if (containerEl) {
                    gsap.set(containerEl, { y: proxy.y, force3D: true });
                }
                updateOpacity(proxy.y);
            },
            onComplete: () => {
                if (containerEl) {
                    gsap.set(containerEl, { y: targetY, force3D: true });
                }
                updateOpacity(targetY);
                gsapTween = null;
            },
        });
    }

    let audioEl: HTMLAudioElement | null = $state(null);

    $effect(() => {
        if (audioEl && !playerStore.isLoaded) {
            playerStore.initialize(audioEl);
        }
    });

    let gestureStartX = $state(0);
    let gestureStartY = $state(0);
    let gestureDirection: "none" | "horizontal" | "vertical" = $state("none");
    let isOnCarousel = $state(false);
    const DIRECTION_THRESHOLD = 10;

    function isCarouselElement(target: EventTarget | null): boolean {
        if (!(target instanceof Element)) return false;

        const carouselSelectors = [
            '[data-slot="carousel"]',
            '[data-slot="carousel-content"]',
            '[data-slot="carousel-item"]',
            "[data-embla-container]",
            "[data-embla-slide]",
            '[role="region"][aria-roledescription="carousel"]',
        ].join(",");

        return target.closest(carouselSelectors) !== null;
    }

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

        isOnCarousel = isCarouselElement(event.target);

        const clientX =
            "touches" in event ? event.touches[0].clientX : event.clientX;
        gestureStartX = clientX;
        gestureStartY = clientY;
        gestureDirection = "none";

        if (!isOnCarousel) {
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
    }

    function handleGestureMove(clientX: number, clientY: number) {
        if (isOnCarousel && gestureDirection === "none") {
            const deltaX = Math.abs(clientX - gestureStartX);
            const deltaY = Math.abs(clientY - gestureStartY);

            if (deltaX > DIRECTION_THRESHOLD || deltaY > DIRECTION_THRESHOLD) {
                if (deltaY > deltaX) {
                    gestureDirection = "vertical";

                    if (gsapTween) {
                        gsapTween.kill();
                        gsapTween = null;
                    }

                    isDragging = true;
                    startY = gestureStartY;
                    currentY = clientY;
                    lastMoveY = gestureStartY;
                    lastMoveTime = Date.now();
                } else {
                    gestureDirection = "horizontal";
                }
            }
        }
    }

    function handleDragMove(
        clientX: number,
        clientY: number,
        event?: TouchEvent | MouseEvent,
    ) {
        handleGestureMove(clientX, clientY);

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
            updateOpacity(clampedTranslate);
        }

        lastMoveY = currentY;
        currentY = clientY;
        lastMoveTime = Date.now();
    }

    function handleDragEnd() {
        gestureDirection = "none";
        isOnCarousel = false;

        if (!isDragging) return;

        const timeDelta = Date.now() - lastMoveTime;
        const moveDelta = currentY - lastMoveY;
        const velocityPxPerMs = timeDelta > 0 ? moveDelta / timeDelta : 0;

        let shouldOpen = false;

        if (Math.abs(velocityPxPerMs) > 0.3) {
            shouldOpen = moveDelta < 0;
        } else {
            const threshold = closedPosition * 0.1;
            const currentPos = containerEl
                ? (gsap.getProperty(containerEl, "y") as number)
                : 0;

            if (panelState.isOpen) {
                shouldOpen = currentPos < threshold;
            } else {
                shouldOpen = currentPos < closedPosition - threshold;
            }
        }

        const targetPosition = shouldOpen ? 0 : closedPosition;

        let duration = 0.3;
        if (Math.abs(velocityPxPerMs) > 0.5) {
            duration = Math.max(0.2, 0.3 - Math.abs(velocityPxPerMs) * 0.15);
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
        handleDragMove(e.touches[0].clientX, e.touches[0].clientY, e);
    }

    function handleTouchEnd() {
        handleDragEnd();
    }

    function handleMouseDown(e: MouseEvent) {
        handleDragStart(e.clientY, e);
    }

    function handleMouseMove(e: MouseEvent) {
        handleDragMove(e.clientX, e.clientY, e);
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
            updateOpacity(initialY);
        }

        if (barElement) {
            const touchStartHandler = (e: TouchEvent) => {
                handleTouchStart(e);
            };

            const touchMoveHandler = (e: TouchEvent) => {
                handleTouchMove(e);
            };

            barElement.addEventListener("touchstart", touchStartHandler, {
                passive: false,
            });
            barElement.addEventListener("touchmove", touchMoveHandler, {
                passive: false,
            });

            return () => {
                window.removeEventListener("mousemove", handleMouseMove);
                window.removeEventListener("mouseup", handleMouseUp);
                barElement?.removeEventListener(
                    "touchstart",
                    touchStartHandler,
                );
                barElement?.removeEventListener("touchmove", touchMoveHandler);
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

    const queueDialog = useMenuDialogState({
        paramName: "queue-dialog",
    });
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
            onclick={() => queueDialog.open("")}
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
        bind:this={barElement}
        class="mx-1.5 rounded-xl overflow-clip border border-input/15 bg-muted-foreground/10 dark:bg-muted/50 backdrop-blur-md"
        role="button"
        tabindex="0"
        ontouchend={handleTouchEnd}
        onmousedown={handleMouseDown}
    >
        <div
            class=" relative flex md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center max-md:justify-between py-2 min-h-16"
        >
            <TrackCarousel
                onTrackClick={() => (isMobile ? panelState.open() : {})}
                setApi={(emblaApi) => setCarouselApi(emblaApi)}
                isDisabled={isPanelAnimating}
            />

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
    <div class="relative select-none h-dvh">
        <div class="absolute top-0 left-0 right-0">
            {@render bar()}
        </div>

        <div
            bind:this={detailsPanelElement}
            class="overscroll-none contain-layout contain-style contain-paint"
            style="pointer-events: {panelState.isOpen ? 'auto' : 'none'};"
        >
            <PlayerDetailsPanel
                onOpenChange={(v) =>
                    v ? panelState.open() : panelState.close()}
                onQueueOpen={() => queueDialog.open("")}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
                {isPanelAnimating}
            />
        </div>

        <audio bind:this={audioEl}></audio>

        <QueueDialog />
    </div>
</div>

<script lang="ts">
  import { appearanceStore } from "$lib/stores/appearance.svelte";
  import { onMount } from "svelte";

  let {
    onComplete = () => {},
    isLoading = false,
  }: { onComplete?: () => void; isLoading?: boolean } = $props();

  const noAnimation = appearanceStore.disableAnimations;
  const minDuration = noAnimation ? 0 : 1000;
  const fadeOutDuration = noAnimation ? 0 : 300;

  let minTimeElapsed = $state(false);
  let fadingOut = $state(false);

  onMount(() => {
    const timeout = setTimeout(() => {
      minTimeElapsed = true;
    }, minDuration);
    return () => clearTimeout(timeout);
  });

  $effect(() => {
    if (minTimeElapsed && !isLoading && !fadingOut) {
      fadingOut = true;
      setTimeout(onComplete, fadeOutDuration);
    }
  });
</script>

<div
  class="splash-container fixed inset-0 z-100 flex items-center justify-center bg-background"
  class:fading-out={fadingOut}
  class:no-animation={noAnimation}
>
  <img
    src="/favicon.svg"
    alt="Cadence Logo"
    class="splash-logo w-32 h-32"
    class:fading-out={fadingOut}
    class:no-animation={noAnimation}
  />
</div>

<style>
  .splash-container {
    opacity: 1;
    transition: opacity 200ms ease-out 100ms;
  }

  .splash-container.fading-out {
    opacity: 0;
    pointer-events: none;
  }

  .splash-container.no-animation {
    transition: none;
  }

  .splash-logo {
    opacity: 0;
    animation: fade-in 300ms var(--ease-vaul) forwards;
    transition:
      opacity 200ms ease-out,
      transform 200ms ease-out;
  }

  .splash-logo.fading-out {
    opacity: 0;
    transform: scale(0.95);
  }

  .splash-logo.no-animation {
    opacity: 1;
    animation: none;
    transition: none;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>

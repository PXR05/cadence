<script lang="ts">
  import { appearanceStore } from "$lib/stores/appearance.svelte";

  let { onComplete = () => {} }: { onComplete?: () => void } = $props();

  let show = $state(true);

  function handleAnimationEnd() {
    show = false;
    onComplete();
  }
</script>

{#if show}
  <div
    class="splash-container fixed inset-0 z-9999 flex items-center justify-center bg-background"
    style:animation-duration={appearanceStore.disableAnimations ? "0s" : "1s"}
    onanimationend={handleAnimationEnd}
  >
    <img
      src="/favicon.svg"
      alt="Cadence Logo"
      class="splash-logo w-32 h-32"
      style:animation-duration={appearanceStore.disableAnimations ? "0s" : "1s"}
    />
  </div>
{/if}

<style>
  .splash-container {
    animation: container-fade 1s ease-out forwards;
  }

  @keyframes container-fade {
    0%,
    85% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }

  .splash-logo {
    opacity: 0;
    animation: splash-fade 1s var(--ease-vaul) forwards;
  }

  @keyframes splash-fade {
    0% {
      opacity: 0;
      transform: scale(0.9);
    }
    15% {
      opacity: 1;
      transform: scale(1);
    }
    75% {
      opacity: 1;
      transform: scale(1);
    }
    100% {
      opacity: 0;
      transform: scale(0.9);
    }
  }
</style>

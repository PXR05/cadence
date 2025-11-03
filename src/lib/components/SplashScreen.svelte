<script lang="ts">
  import { fade } from "svelte/transition";
  import { onMount } from "svelte";

  let { onComplete = () => {} }: { onComplete?: () => void } = $props();

  let show = $state(true);
  let logoVisible = $state(false);

  onMount(() => {
    setTimeout(() => {
      logoVisible = true;
    }, 100);

    const timer = setTimeout(() => {
      logoVisible = false;
      setTimeout(() => {
        show = false;
        onComplete();
      }, 200);
    }, 1000);

    return () => clearTimeout(timer);
  });
</script>

{#if show}
  <div
    class="fixed inset-0 z-[9999] flex items-center justify-center bg-background"
  >
    {#if logoVisible}
      <img
        transition:fade={{ duration: 200 }}
        src="/favicon.svg"
        alt="Cadence Logo"
        class="w-32 h-32"
      />
    {/if}
  </div>
{/if}

<script lang="ts">
  import { appearanceStore } from "$lib/stores/appearance.svelte";

  const {
    percentage = 0,
    height = 6,
    color = "var(--primary)",
  }: {
    percentage?: number;
    height?: number;
    color?: string;
  } = $props();

  const clampedPercentage = $derived(Math.max(0, Math.min(100, percentage)));
</script>

<div
  style="height: {height}px;"
  class="relative w-full rounded-full overflow-clip"
>
  <div
    class="absolute inset-0"
    style="background-color:
      color-mix(
        in oklab,
        {color} 20%,
        transparent
      );"
  ></div>
  <div
    style="
      transform: translate3d({-100 + clampedPercentage}%, 0, 0);
      transition: {appearanceStore.disableAnimations
      ? 'none'
      : 'transform 150ms ease-out'};
      background-color:
        color-mix(
          in oklab,
          {color} 40%,
          var(--foreground)
        );"
    class="w-full h-full rounded-full"
  ></div>
</div>

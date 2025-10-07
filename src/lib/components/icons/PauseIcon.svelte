<script lang="ts">
  let { size = 24, class: className = "" }: { size?: number; class?: string } =
    $props();
</script>

<svg
  viewBox="0 0 24 24"
  fill="currentColor"
  width={size}
  height={size}
  class={className}
>
  <rect x="5" y="4" width="4" height="16" />
  <rect x="13" y="4" width="4" height="16" />
</svg>

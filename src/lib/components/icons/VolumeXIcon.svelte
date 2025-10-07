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
  <path
    d="M3 9h4l5-5v16l-5-5H3V9zm11 0l2-2 2 2 2-2 2 2-2 2 2 2-2 2-2-2-2 2-2-2 2-2-2-2z"
  />
</svg>

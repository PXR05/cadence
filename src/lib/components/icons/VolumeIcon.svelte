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
  <path d="M3 9h4l5-5v16l-5-5H3V9z" />
  <path d="M14 10h2v4h-2z M14 10l2-1v6l-2-1z" />
  <path d="M17 8h2v8h-2z M17 8l2-2v12l-2-2z" />
  <path d="M20 6h2v12h-2z M20 6l2-3v18l-2-3z" />
</svg>

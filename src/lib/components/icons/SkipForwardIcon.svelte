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
  <path d="M16 4h2v16h-2V4zM6 4l10 8-10 8V4z" />
</svg>

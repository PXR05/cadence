<script lang="ts">
  let {
    type,
    message,
    onDismiss,
  }: {
    type: "error" | "success";
    message: string;
    onDismiss: () => void;
  } = $props();

  const colorClasses =
    type === "error"
      ? "border-destructive text-destructive"
      : "border-green-500 text-green-600 dark:text-green-400";
</script>

<div
  class="px-3 py-2 text-sm border flex items-start justify-between {colorClasses}"
>
  <p>{message}</p>
  <button onclick={onDismiss} class="hover:opacity-80">✕</button>
</div>

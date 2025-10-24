<script lang="ts">
  import { onMount } from "svelte";
  import { Button } from "../ui/button";
  import { XIcon } from "@lucide/svelte";

  let {
    type,
    message,
    onDismiss,
    duration = 5000,
  }: {
    type: "error" | "success";
    message: string;
    onDismiss: () => void;
    duration?: number;
  } = $props();

  let visible = $state(false);

  const bgClasses =
    type === "error"
      ? "bg-destructive/20 text-destructive-foreground border-destructive"
      : "bg-green-600/20 border-green-600";

  onMount(() => {
    visible = true;

    const timer = setTimeout(() => {
      visible = false;
      setTimeout(onDismiss, 300);
    }, duration);

    return () => clearTimeout(timer);
  });

  function handleDismiss() {
    visible = false;
    setTimeout(onDismiss, 300);
  }
</script>

<div
  class="bg-background fixed top-4 right-4 z-50 max-w-md w-full sm:w-auto transition-all duration-300 ease-out"
  style="transform: translateX({visible ? '0' : '400px'}); 
  opacity: {visible ? '1' : '0'};"
>
  <div
    class="border p-2 rounded-lg shadow-lg flex items-start justify-between gap-3 {bgClasses}"
  >
    <p class="text-sm font-medium">{message}</p>
    <Button
      onclick={handleDismiss}
      variant="ghost"
      size="icon"
      class="flex-shrink-0 text-lg leading-none size-fit"
      aria-label="Dismiss"
    >
      <XIcon size={16} />
    </Button>
  </div>
</div>

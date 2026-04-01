<script lang="ts">
  import { RefreshCwIcon } from "@lucide/svelte";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";

  let {
    value = $bindable(""),
    defaultValue = "",
    disabled = false,
    isApplying = false,
    error = "",
    placeholder = "https://api.example.com",
    applyLabel = "Apply",
    applyingLabel = "Applying...",
    onApply,
    onReset,
  }: {
    value: string;
    defaultValue?: string;
    disabled?: boolean;
    isApplying?: boolean;
    error?: string;
    placeholder?: string;
    applyLabel?: string;
    applyingLabel?: string;
    onApply: () => void | Promise<void>;
    onReset?: () => void;
  } = $props();

  function normalizeUrlLike(input: string): string {
    return input.trim().replace(/\/+$/, "");
  }

  const canReset = $derived(
    Boolean(defaultValue) &&
      normalizeUrlLike(value) !== normalizeUrlLike(defaultValue),
  );
</script>

<div class="space-y-2">
  <div class="flex items-center gap-2">
    <div class="relative flex-1">
      <Input
        type="url"
        bind:value
        {placeholder}
        disabled={disabled || isApplying}
        class={canReset ? "pr-10" : undefined}
        autocomplete="off"
      />
      {#if canReset}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          class="absolute right-0.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          disabled={disabled || isApplying}
          title="Reset to default"
          aria-label="Reset to default"
          onclick={() => onReset?.()}
        >
          <RefreshCwIcon class="size-4" />
        </Button>
      {/if}
    </div>

    <Button
      type="button"
      onclick={() => onApply()}
      disabled={disabled || isApplying}
    >
      {isApplying ? applyingLabel : applyLabel}
    </Button>
  </div>

  {#if error}
    <p class="text-xs text-red-500">{error}</p>
  {/if}
</div>

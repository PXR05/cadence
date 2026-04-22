<script lang="ts">
  import { RefreshCw as RefreshCwIcon } from "@lucide/svelte";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";

  let {
    value = $bindable(""),
    resetContentOnApply = $bindable(true),
    defaultValue = "",
    disabled = false,
    isApplying = false,
    error = "",
    placeholder = "https://api.example.com",
    resetContentLabel = "Clear local cached content after switching backend",
    showResetContentOption = true,
    applyLabel = "Apply",
    applyingLabel = "Applying...",
    onApply,
    onReset,
  }: {
    value: string;
    resetContentOnApply?: boolean;
    defaultValue?: string;
    disabled?: boolean;
    isApplying?: boolean;
    error?: string;
    placeholder?: string;
    resetContentLabel?: string;
    showResetContentOption?: boolean;
    applyLabel?: string;
    applyingLabel?: string;
    onApply: (options: { resetContent: boolean }) => void | Promise<void>;
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

<div class="space-y-3">
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
      onclick={() => onApply({ resetContent: resetContentOnApply })}
      disabled={disabled || isApplying}
    >
      {isApplying ? applyingLabel : applyLabel}
    </Button>
  </div>

  {#if showResetContentOption}
    <label class="flex items-start gap-2 text-xs text-muted-foreground mx-1">
      <input
        type="checkbox"
        class="mt-0.5 accent-primary"
        bind:checked={resetContentOnApply}
        disabled={disabled || isApplying}
      />
      <span>{resetContentLabel}</span>
    </label>
  {/if}

  {#if error}
    <p class="text-xs text-red-500">{error}</p>
  {/if}
</div>

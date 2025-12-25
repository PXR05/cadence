<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Icon as LucideIcon, PowerIcon, PowerOffIcon } from "@lucide/svelte";

  interface Props {
    icon: typeof LucideIcon;
    title: string;
    enabled?: boolean;
    onToggle?: () => void;
    headerActions?: import("svelte").Snippet;
    children?: import("svelte").Snippet;
  }

  let {
    icon: Icon,
    title,
    enabled,
    onToggle,
    headerActions,
    children,
  }: Props = $props();
</script>

<div class="border rounded-xl p-2 flex flex-col gap-2 bg-background md:bg-card">
  <div class="flex items-center justify-between pl-2">
    <div class="flex items-center gap-2">
      <Icon class="size-5" />
      <h2 class="text-lg font-semibold">{title}</h2>
    </div>
    <div class="flex gap-2">
      {#if headerActions}
        {@render headerActions()}
      {/if}
      {#if onToggle !== undefined}
        <Button
          variant={enabled ? "default" : "outline"}
          onclick={onToggle}
          size="icon"
          class="size-10"
        >
          {#if enabled}
            <PowerIcon />
          {:else}
            <PowerOffIcon />
          {/if}
        </Button>
      {/if}
    </div>
  </div>
  {#if children}
    {@render children()}
  {/if}
</div>

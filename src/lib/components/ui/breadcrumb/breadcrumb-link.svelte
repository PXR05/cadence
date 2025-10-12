<script lang="ts">
  import { cn, type WithElementRef } from "$lib/utils.js";
  import type { HTMLAnchorAttributes } from "svelte/elements";

  type Props = WithElementRef<HTMLAnchorAttributes> & {
    asChild?: boolean;
  };

  let {
    ref = $bindable(null),
    class: className,
    asChild = false,
    href,
    children,
    ...restProps
  }: Props = $props();
</script>

{#if asChild}
  {@render children?.()}
{:else}
  <a
    bind:this={ref}
    {href}
    class={cn("transition-colors hover:text-foreground", className)}
    {...restProps}
  >
    {@render children?.()}
  </a>
{/if}

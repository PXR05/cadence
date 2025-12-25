<script lang="ts">
  import { ChevronRightIcon } from "@lucide/svelte";
  import { cn, type WithElementRef } from "$lib/utils.js";
  import type { HTMLLiAttributes } from "svelte/elements";

  type Props = WithElementRef<HTMLLiAttributes>;

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: Props = $props();
</script>

<li
  bind:this={ref}
  role="presentation"
  aria-hidden="true"
  class={cn("[&>svg]:size-3.5", className)}
  {...restProps}
>
  {#if children}
    {@render children()}
  {:else}
    <ChevronRightIcon />
  {/if}
</li>

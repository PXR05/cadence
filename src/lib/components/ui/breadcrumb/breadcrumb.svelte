<script lang="ts">
  import { cn, type WithElementRef } from "$lib/utils.js";
  import type { HTMLAttributes } from "svelte/elements";

  type Props = WithElementRef<HTMLAttributes<HTMLElement>>;

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: Props = $props();
</script>

<nav
  bind:this={ref}
  aria-label="breadcrumb"
  class={cn("", className)}
  {...restProps}
>
  {@render children?.()}
</nav>

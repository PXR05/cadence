<script lang="ts">
  import { cn, type WithElementRef } from "$lib/utils.js";
  import type { HTMLAttributes } from "svelte/elements";

  type Props = WithElementRef<HTMLAttributes<HTMLSpanElement>>;

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: Props = $props();
</script>

<span
  bind:this={ref}
  role="link"
  aria-disabled="true"
  aria-current="page"
  class={cn("font-normal text-foreground", className)}
  {...restProps}
>
  {@render children?.()}
</span>

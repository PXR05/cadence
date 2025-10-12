<script lang="ts">
  import { cn, type WithElementRef } from "$lib/utils.js";
  import type { HTMLOlAttributes } from "svelte/elements";

  type Props = WithElementRef<HTMLOlAttributes>;

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: Props = $props();
</script>

<ol
  bind:this={ref}
  class={cn(
    "flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5",
    className
  )}
  {...restProps}
>
  {@render children?.()}
</ol>

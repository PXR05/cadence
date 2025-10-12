<script lang="ts">
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
  class={cn("inline-flex items-center gap-1.5", className)}
  {...restProps}
>
  {@render children?.()}
</li>

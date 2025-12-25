<script lang="ts">
  import { EllipsisIcon } from "@lucide/svelte";
  import { cn, type WithElementRef } from "$lib/utils.js";
  import type { HTMLAttributes } from "svelte/elements";

  type Props = WithElementRef<HTMLAttributes<HTMLSpanElement>>;

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: Props = $props();
</script>

<span
  bind:this={ref}
  role="presentation"
  aria-hidden="true"
  class={cn("flex size-9 items-center justify-center", className)}
  {...restProps}
>
  <EllipsisIcon class="size-4" />
  <span class="sr-only">More</span>
</span>

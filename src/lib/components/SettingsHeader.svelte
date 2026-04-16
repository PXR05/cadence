<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import {  ArrowLeft as ArrowLeftIcon } from "@lucide/svelte";
  import { appearanceStore } from "$lib/stores/appearance.svelte";

  interface Props {
    title: string;
  }

  let { title }: Props = $props();
</script>

<div style="--h: 5rem" class="sticky top-0 w-full p-1.5 md:p-2 z-50">
  <div class="_bg _color absolute inset-0 -z-10"></div>
  <div
    class="flex-1 flex items-center flex-row gap-1.5 md:gap-2 rounded-xl p-1.5 md:p-2 border border-muted-foreground/10 {appearanceStore.disableBlur
      ? 'bg-muted'
      : 'bg-muted-foreground/10 dark:bg-muted/60 backdrop-blur-md'}"
  >
    <Button
      variant="ghost"
      size="icon"
      class="size-10"
      onclick={() => history.back()}
    >
      <ArrowLeftIcon />
    </Button>
    <h1 class="flex-1 flex items-center gap-2 font-semibold truncate text-2xl">
      {title}
    </h1>
  </div>
</div>

<style>
  ._bg {
    &::before,
    &::after {
      pointer-events: none;
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      z-index: -1;
      mask: linear-gradient(to top, transparent, black 90%);
    }
    &::before {
      height: var(--h);
    }
    &::after {
      height: calc(var(--h) - 2rem);
    }
  }

  ._color {
    &::before,
    &::after {
      background-color: var(--background);
    }
  }
</style>

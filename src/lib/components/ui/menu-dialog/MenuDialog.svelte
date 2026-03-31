<script lang="ts">
  import type { Snippet } from "svelte";
  import { MediaQuery } from "svelte/reactivity";
  import * as Dialog from "$lib/components/ui/dialog";
  import * as Drawer from "$lib/components/ui/drawer";
  import { buttonVariants } from "$lib/components/ui/button";
  import { XIcon } from "@lucide/svelte";
  import { Image } from "../image";

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    imageUrl?: string;
    imageFallback?: Snippet;
    title: string;
    subtitle: string;
    menuItems: Snippet;
    children?: Snippet;
  }

  let {
    open,
    onOpenChange,
    imageUrl,
    imageFallback,
    title,
    subtitle,
    menuItems,
    children,
  }: Props = $props();

  const isDesktop = new MediaQuery("(min-width: 768px)");
</script>

{#snippet header()}
  <div class="truncate flex gap-3 p-4">
    <div
      class="rounded-md size-20 shrink-0 overflow-hidden bg-muted grid place-items-center"
    >
      {#if imageUrl}
        <Image
          crossorigin="use-credentials"
          src={imageUrl}
          alt={title}
          class="size-full object-cover"
        />
      {:else if imageFallback}
        {@render imageFallback()}
      {/if}
    </div>
    <div class="flex flex-col flex-1 min-w-0 mt-auto">
      <p class="font-medium truncate">{title}</p>
      <p class="text-sm text-muted-foreground truncate">{subtitle}</p>
    </div>
    {#if isDesktop.current}
      <Dialog.Close class={buttonVariants({ variant: "ghost", size: "icon" })}>
        <XIcon class="size-5" />
      </Dialog.Close>
    {/if}
  </div>
{/snippet}

{#snippet menu()}
  <div class="flex flex-col p-2">
    {@render menuItems()}
  </div>
{/snippet}

{#if isDesktop.current}
  <Dialog.Root {open} {onOpenChange}>
    <Dialog.Content class="max-w-sm p-0 gap-0" showCloseButton={false}>
      {@render header()}
      {@render menu()}
    </Dialog.Content>
  </Dialog.Root>
{:else}
  <Drawer.Root {open} {onOpenChange}>
    <Drawer.Content>
      <Drawer.Header class="text-left p-0">
        {@render header()}
      </Drawer.Header>
      {@render menu()}
    </Drawer.Content>
  </Drawer.Root>
{/if}

{#if children}
  {@render children()}
{/if}

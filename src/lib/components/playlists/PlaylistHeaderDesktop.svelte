<script lang="ts">
  import PlaylistCoverImage from "$lib/components/playlists/PlaylistCoverImage.svelte";
  import type { PlaylistDetail } from "$lib/schemas";
  import {
    ArrowLeft,
    CloudCheckIcon,
    EllipsisIcon,
    PlayIcon,
  } from "@lucide/svelte";
  import { Button } from "../ui/button";
  import { appearanceStore } from "$lib/stores/appearance.svelte";
  import { fly } from "svelte/transition";
  import { vaulEase } from "$lib/utils";

  interface Props {
    playlist: PlaylistDetail;
    isScrolled: boolean;
    isOffline: boolean;
    onPlay: () => void;
    onMenu: (e: MouseEvent) => void;
  }

  let { playlist, isScrolled, isOffline, onPlay, onMenu }: Props = $props();
</script>

<div class="grid grid-cols-1 grid-rows-1 p-2">
  {#if isScrolled}
    <div
      in:fly={{
        y: -50,
        duration: appearanceStore.disableAnimations ? 0 : 150,
        easing: vaulEase,
        delay: appearanceStore.disableAnimations ? 0 : 100,
      }}
      out:fly={{
        y: -50,
        duration: appearanceStore.disableAnimations ? 0 : 150,
        easing: vaulEase,
      }}
      class="p-2 row-start-1 col-start-1 h-fit flex items-center rounded-xl border relative w-full gap-2
      {appearanceStore.disableBlur
        ? 'bg-muted border-input/15'
        : 'bg-muted-foreground/10 dark:bg-muted/60 backdrop-blur-md border-input/15'}"
    >
      <Button
        variant="ghost"
        size="icon"
        class="size-9"
        title="Back"
        onclick={() => history.back()}
      >
        <ArrowLeft />
      </Button>

      <div class="flex-1 flex items-center gap-2 truncate">
        <h1 class="truncate font-semibold text-2xl">
          {playlist.name}
        </h1>
        {#if isOffline}
          <CloudCheckIcon size={20} class="shrink-0 text-primary" />
        {/if}
      </div>

      <Button
        onclick={onPlay}
        disabled={playlist.items.length === 0}
        class="w-fit border bg-foreground text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 px-6 text-sm"
      >
        <PlayIcon size={16} />
        Play
      </Button>
    </div>
  {:else}
    <div
      in:fly={{
        y: -160,
        duration: appearanceStore.disableAnimations ? 0 : 150,
        easing: vaulEase,
        delay: appearanceStore.disableAnimations ? 0 : 100,
      }}
      out:fly={{
        y: -160,
        duration: appearanceStore.disableAnimations ? 0 : 150,
        easing: vaulEase,
      }}
      style="--h: 5rem"
      class="relative row-start-1 col-start-1 flex-1 flex items-end bg-background p-1"
    >
      <div class="_bg _color absolute inset-0 top-64 -z-10"></div>

      {#key playlist.coverImage}
        <PlaylistCoverImage
          {playlist}
          iconSize={64}
          youtubeIconSize={48}
          containerClass="shrink-0 overflow-hidden bg-muted relative grid place-items-center rounded-xl size-64"
          imageClass="w-full h-full object-cover relative z-10"
        />
      {/key}

      <div class="w-full flex flex-col gap-2 truncate h-64 ml-4">
        <Button
          variant="outline"
          size="icon"
          class="size-10 mb-auto"
          title="Back"
          onclick={() => history.back()}
        >
          <ArrowLeft />
        </Button>

        <div class="flex max-lg:flex-col gap-2 truncate lg:items-end">
          <div class="shrink truncate">
            <p class="text-sm text-muted-foreground h-5">
              {playlist.items.length} tracks
            </p>

            <div class="flex items-center gap-2 truncate">
              <h1 class="truncate font-semibold text-4xl">
                {playlist.name}
              </h1>
              {#if isOffline}
                <CloudCheckIcon size={20} class="shrink-0 text-primary" />
              {/if}
            </div>
          </div>

          <Button
            onclick={onPlay}
            disabled={playlist.items.length === 0}
            class="font-medium h-10 rounded-lg lg:ml-auto border bg-foreground text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 px-6 max-sm:w-full  max-lg:text-sm"
          >
            <PlayIcon size={16} />
            Play
          </Button>
        </div>
      </div>

      <div class="top-2 right-2 absolute z-10">
        <Button
          variant="ghost"
          size="icon"
          class="p-2 bg-background"
          onclick={onMenu}
        >
          <EllipsisIcon size={20} />
        </Button>
      </div>
    </div>
  {/if}
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

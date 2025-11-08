<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { CreatePlaylistDialog, PlaylistCard } from "$lib/components";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import { AudioWaveformIcon, PlusIcon } from "@lucide/svelte";
  import { playlistsStore } from "$lib/stores/playlists.svelte";
  import { Button } from "$lib/components/ui/button/index.js";

  let { data } = $props();

  let createDialogOpen = $state(false);
  let userPlaylists = $state(data.userPlaylists);
  let youtubePlaylists = $state(data.youtubePlaylists);

  const specialPlaylists = $derived(data.specialPlaylists);
  const allUserPlaylists = $derived([
    ...specialPlaylists,
    ...userPlaylists,
    ...youtubePlaylists,
  ]);

  $effect(() => {
    if (data.streaming?.userPlaylists) {
      data.streaming.userPlaylists.then((playlists) => {
        userPlaylists = playlists;
      });
    }
    if (data.streaming?.youtubePlaylists) {
      data.streaming.youtubePlaylists.then((playlists) => {
        youtubePlaylists = playlists;
      });
    }
  });

  async function handlePlaylistCreated() {
    playlistsStore.invalidate();
    await invalidateAll();
  }
</script>

<svelte:head>
  <title>Library | Cadence</title>
</svelte:head>

<div style="--h: 4rem;" class="p-2 absolute top-0 left-0 right-0 z-30">
  <div class="_bg _blur absolute inset-0 -z-10"></div>
  <div class="_bg _color absolute inset-0 -z-10"></div>
  <div class="flex items-center justify-between gap-2">
    <h2 class="text-2xl font-semibold p-2">Playlists</h2>
    <Button href="/settings/audio" variant="outline" size="icon" class="size-11">
      <AudioWaveformIcon />
    </Button>
  </div>
</div>

<ScrollArea class="h-dvh md:border-x">
  <div class="p-2 pt-16 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
    <button
      onclick={() => (createDialogOpen = true)}
      class="rounded-lg aspect-square w-full flex-shrink-0 border hover:bg-muted/50 transition-colors grid place-items-center"
    >
      <PlusIcon
        size={48}
        absoluteStrokeWidth
        strokeWidth={2}
        class="text-muted-foreground"
      />
    </button>
    {#each allUserPlaylists as playlist}
      <PlaylistCard {playlist} size="large" />
    {/each}
  </div>
</ScrollArea>

<CreatePlaylistDialog
  bind:open={createDialogOpen}
  onOpenChange={(open) => (createDialogOpen = open)}
  onCreated={handlePlaylistCreated}
/>

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
      mask: linear-gradient(to top, transparent, black);
    }
    &::before {
      height: var(--h);
    }
    &::after {
      height: calc(var(--h) - 1rem);
    }
  }

  ._color {
    &::before,
    &::after {
      background-color: color-mix(
        in oklab,
        var(--background) 50%,
        transparent
      );
    }
  }

  ._blur {
    &::before,
    &::after {
      backdrop-filter: blur(1rem) saturate(120%) brightness(120%);
    }
  }
</style>

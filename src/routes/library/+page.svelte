<script lang="ts">
  import { CreatePlaylistDialog, PlaylistCard } from "$lib/components";
  import { PlusIcon } from "@lucide/svelte";
  import { playlistsStore } from "$lib/stores/playlists.svelte";
  import { SPECIAL_PLAYLIST_IDS } from "$lib/utils/playlist";
  import { flip } from "svelte/animate";
  import { fade } from "svelte/transition";
  import { tracksStore } from "$lib/stores/tracks.svelte";
  import { offlineDb } from "$lib/db/offline";
  import { liveQuery } from "dexie";
  import { appearanceStore } from "$lib/stores/appearance.svelte";
  import { playerStore } from "$lib/stores/player.svelte";

  let createDialogOpen = $state(false);

  let offlineCount = liveQuery(() => offlineDb.tracks.count());

  const specialPlaylists = $derived([
    {
      id: SPECIAL_PLAYLIST_IDS.ALL_SONGS,
      name: "All Songs",
      userId: "system",
      createdAt: new Date(),
      updatedAt: new Date(),
      itemCount: tracksStore.tracksCount,
    },
    {
      id: SPECIAL_PLAYLIST_IDS.DOWNLOADED,
      name: "Downloaded Songs",
      userId: "system",
      createdAt: new Date(),
      updatedAt: new Date(),
      itemCount: $offlineCount || 0,
    },
  ]);
  const userPlaylists = $derived(playlistsStore.userPlaylists);
  const youtubePlaylists = $derived(playlistsStore.youtubePlaylists);
  const tidalPlaylists = $derived(playlistsStore.tidalPlaylists);

  const allUserPlaylists = $derived([
    ...specialPlaylists,
    ...userPlaylists,
    ...youtubePlaylists,
    ...tidalPlaylists,
  ]);

  async function handlePlaylistCreated() {
    playlistsStore.invalidate();
    await playlistsStore.loadAllPlaylists(true);
  }
</script>

<svelte:head>
  <title
    >{playerStore.isPlaying && playerStore.currentTrack?.metadata?.title
      ? playerStore.currentTrack.metadata?.title
      : "Library"} | Cadence</title
  >
</svelte:head>

<div style="--h: 5rem;" class="p-2 fixed top-0 left-0 md:left-64 right-0 z-30">
  <div class="_bg _color absolute inset-0 -z-10"></div>
  <h2 class="text-2xl font-semibold p-2">Playlists</h2>
</div>

<div
  class="p-4 pt-16 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pb-72"
>
  {#each allUserPlaylists as playlist, i (playlist.id)}
    <div
      animate:flip={{ duration: appearanceStore.disableAnimations ? 0 : 150 }}
      transition:fade={{
        duration: appearanceStore.disableAnimations ? 0 : 150,
        delay: appearanceStore.disableAnimations ? 0 : i * 25 + 200,
      }}
    >
      <PlaylistCard {playlist} size="large" />
    </div>
  {/each}
  <button
    onclick={() => (createDialogOpen = true)}
    class="rounded-lg aspect-square w-full shrink-0 border hover:bg-muted/50 transition-colors grid place-items-center"
  >
    <PlusIcon
      size={48}
      absoluteStrokeWidth
      strokeWidth={2}
      class="text-muted-foreground"
    />
  </button>
</div>

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

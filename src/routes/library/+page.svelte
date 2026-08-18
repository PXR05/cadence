<script lang="ts">
  import {
    CreatePlaylistDialog,
    PlaylistCard,
    PullToRefresh,
  } from "$lib/components";
  import {
    DiamondIcon,
    Disc3Icon,
    ListMusicIcon,
    MusicIcon,
    Plus as PlusIcon,
    SquarePlayIcon,
  } from "@lucide/svelte";
  import { playlistsStore } from "$lib/stores/playlists.svelte";
  import {
    isAlbumPlaylist,
    isPlaylistPlaylist,
    SPECIAL_PLAYLIST_IDS,
  } from "$lib/utils/playlist";
  import { flip } from "svelte/animate";
  import { tracksStore } from "$lib/stores/tracks.svelte";
  import { offlineDb } from "$lib/db/offline";
  import { liveQuery } from "dexie";
  import { appearanceStore } from "$lib/stores/appearance.svelte";
  import { playerStore } from "$lib/stores/player.svelte";
  import type { Playlist } from "$lib/schemas";
  import { Button } from "$lib/components/ui/button";
  import { useDialogState } from "$lib/hooks";
  import { backendCapabilities } from "$lib/backend/config";

  const createDialog = useDialogState("create-playlist");

  let offlineCount = liveQuery(() => offlineDb.tracks.count());

  let allPlaylists: Playlist[] = $state([]);

  let currentType = $state("");
  let currentSource = $state("");
  const typeFilters = [
    {
      id: "playlists",
      label: "Playlists",
      icon: ListMusicIcon,
      onclick: () => {
        if (currentType === "playlists") {
          currentType = "";
        } else {
          currentType = "playlists";
        }
      },
    },
    {
      id: "albums",
      label: "Albums",
      icon: Disc3Icon,
      onclick: () => {
        if (currentType === "albums") {
          currentType = "";
        } else {
          currentType = "albums";
        }
      },
    },
  ];
  const sourceFilters = [
    {
      id: "local",
      enabled: backendCapabilities.playlists.enabled,
      label: "Local",
      icon: DiamondIcon,
      onclick: () => {
        if (currentSource === "local") {
          currentSource = "";
        } else {
          currentSource = "local";
        }
      },
    },
    {
      id: "youtube",
      enabled:
        backendCapabilities.remoteProviders.youtube.search ||
        backendCapabilities.remoteProviders.youtube.import,
      label: "YouTube",
      icon: SquarePlayIcon,
      onclick: () => {
        if (currentSource === "youtube") {
          currentSource = "";
        } else {
          currentSource = "youtube";
        }
      },
    },
    {
      id: "tidal",
      enabled:
        backendCapabilities.remoteProviders.tidal.search ||
        backendCapabilities.remoteProviders.tidal.import,
      label: "Tidal",
      icon: MusicIcon,
      onclick: () => {
        if (currentSource === "tidal") {
          currentSource = "";
        } else {
          currentSource = "tidal";
        }
      },
    },
  ].filter((filter) => filter.enabled);

  $effect(() => {
    let basePlaylists: Playlist[] = [];
    if (currentSource === "tidal") {
      basePlaylists = backendCapabilities.remoteProviders.tidal.import
        ? playlistsStore.tidalPlaylists
        : [];
    } else if (currentSource === "youtube") {
      basePlaylists = backendCapabilities.remoteProviders.youtube.import
        ? playlistsStore.youtubePlaylists
        : [];
    } else {
      basePlaylists = [
        ...(backendCapabilities.library.enabled ? [{
          id: SPECIAL_PLAYLIST_IDS.ALL_SONGS,
          name: "All Songs",
          userId: "system",
          createdAt: new Date(),
          updatedAt: new Date(),
          itemCount: tracksStore.tracksCount,
        }] : []),
        ...(backendCapabilities.offline ? [{
          id: SPECIAL_PLAYLIST_IDS.DOWNLOADED,
          name: "Downloaded Songs",
          userId: "system",
          createdAt: new Date(),
          updatedAt: new Date(),
          itemCount: $offlineCount || 0,
        }] : []),
        ...(backendCapabilities.playlists.enabled
          ? currentSource === "local"
            ? playlistsStore.userPlaylists
            : playlistsStore.allPlaylists.filter((playlist) =>
                (!playlist.id.startsWith("youtube_") ||
                  backendCapabilities.remoteProviders.youtube.import) &&
                (!playlist.id.startsWith("tidal_") ||
                  backendCapabilities.remoteProviders.tidal.import),
              )
          : []),
      ];
    }

    if (currentType === "playlists") {
      allPlaylists = basePlaylists.filter((p) => isPlaylistPlaylist(p.id));
    } else if (currentType === "albums") {
      allPlaylists = basePlaylists.filter((p) => isAlbumPlaylist(p.id));
    } else {
      allPlaylists = basePlaylists;
    }
  });

  async function handlePlaylistCreated() {
    await refreshPlaylists();
  }

  async function refreshPlaylists() {
    playlistsStore.invalidate();
    await playlistsStore.loadAllPlaylists(true);
    Promise.all(
      playlistsStore.allPlaylists.map((p) =>
        playlistsStore.loadPlaylistDetail(p.id, true),
      ),
    )
      .then(() => {
        console.log("Playlist details refreshed");
      })
      .catch((err) => {
        console.error("Failed to refresh playlist details", err);
      });
  }
</script>

<svelte:head>
  <title
    >{playerStore.isPlaying && playerStore.currentTrack?.metadata?.title
      ? playerStore.currentTrack.metadata?.title
      : "Library"} | Cadence</title
  >
</svelte:head>

<PullToRefresh onStageOne={refreshPlaylists}>
  <h2 class="p-4 pb-0 text-2xl font-semibold">Playlists</h2>

  <div
    class="p-4 flex gap-4 overflow-x-scroll items-center hide-scrollbar"
    style="
      -webkit-mask-image: linear-gradient(to right, transparent 0%, black 1rem, black calc(100% - 1rem), transparent 100%);
      mask-image: linear-gradient(to right, transparent 0%, black 1rem, black calc(100% - 1rem), transparent 100%);
      -webkit-mask-repeat: no-repeat;
      mask-repeat: no-repeat;
    "
  >
    <div class="flex gap-3">
      {#each typeFilters as t}
        <Button
          variant="outline"
          size="sm"
          class="flex items-center gap-1 shrink-0 
            {currentType === t.id ? 'bg-accent!' : 'text-muted-foreground'}"
          onclick={t.onclick}
        >
          <t.icon size={16} />
          {t.label}
        </Button>
      {/each}
    </div>

    <span class="rounded w-0.5 h-5 bg-border">&nbsp;</span>

    <div class="flex gap-3">
      {#each sourceFilters as s}
        <Button
          variant="outline"
          size="sm"
          class="flex items-center gap-1 shrink-0 
            {currentSource === s.id ? 'bg-accent!' : 'text-muted-foreground'}"
          onclick={s.onclick}
        >
          <s.icon size={16} />
          {s.label}
        </Button>
      {/each}
    </div>
  </div>

  <div
    class="p-4 pt-0 grid grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-4 @7xl:grid-cols-5 @9xl:grid-cols-6 gap-4 pb-72"
  >
    {#each allPlaylists as playlist (playlist.id)}
      <div
        animate:flip={{ duration: appearanceStore.disableAnimations ? 0 : 150 }}
      >
        <PlaylistCard {playlist} size="large" />
      </div>
    {/each}
    {#if backendCapabilities.playlists.create}
      <button
      onclick={createDialog.open}
      class="rounded-lg aspect-square w-full shrink-0 border hover:bg-muted/50 transition-colors grid place-items-center"
    >
      <PlusIcon
        size={48}
        absoluteStrokeWidth
        strokeWidth={2}
        class="text-muted-foreground"
      />
      </button>
    {/if}
  </div>
</PullToRefresh>

{#if backendCapabilities.playlists.create}
  <CreatePlaylistDialog
    open={createDialog.isOpen}
    onOpenChange={(open) =>
      !open && createDialog.isOpen ? createDialog.close() : null}
    onCreated={handlePlaylistCreated}
  />
{/if}

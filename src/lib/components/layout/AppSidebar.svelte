<script lang="ts">
  import { page } from "$app/state";
  import { authStore } from "$lib/stores/auth.svelte";
  import * as Sidebar from "$lib/components/ui/sidebar";
  import { ListMusicIcon, PlusIcon } from "@lucide/svelte";
  import { onMount } from "svelte";
  import { offlineDb } from "$lib/db/offline";
  import { playlistsStore } from "$lib/stores/playlists.svelte";
  import { tracksStore } from "$lib/stores/tracks.svelte";
  import { liveQuery } from "dexie";
  import { SPECIAL_PLAYLIST_IDS } from "$lib/utils/playlist";
  import { CreatePlaylistDialog } from "../playlists";
  import { playlistMenuStore } from "$lib/stores/playlistMenu.svelte";
  import type { Playlist } from "$lib/schemas";
  import { navItems } from "./navItems";

  onMount(async () => {
    try {
      if (authStore.user) {
        await authStore.getCurrentUser();
      }
    } catch (error) {
      console.error(error);
    }
  });

  function isActive(tabPath: string): boolean {
    if (tabPath === "/") return page.url.pathname === "/";
    if (tabPath.startsWith("/playlist?id=")) {
      const playlistId = tabPath.split("=")[1];
      return (
        page.url.pathname === "/playlist" &&
        page.url.searchParams.get("id") === playlistId
      );
    }
    return page.url.pathname.startsWith(tabPath);
  }

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

  const allUserPlaylists = $derived([
    ...specialPlaylists,
    ...userPlaylists,
    ...youtubePlaylists,
  ]);

  async function handlePlaylistCreated() {
    playlistsStore.invalidate();
    await playlistsStore.loadAllPlaylists(true);
  }

  function handleContextMenu(e: MouseEvent, playlist: Playlist) {
    e.preventDefault();
    playlistMenuStore.open(playlist, false, false);
  }
</script>

{#snippet navigation()}
  <Sidebar.Group>
    <Sidebar.GroupLabel>Navigation</Sidebar.GroupLabel>
    <Sidebar.GroupContent>
      <Sidebar.Menu>
        {#each navItems as item (item.path)}
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={isActive(item.path)}>
              {#snippet child({ props })}
                <a href={item.path} {...props}>
                  <item.icon />
                  <span>{item.label}</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        {/each}
      </Sidebar.Menu>
    </Sidebar.GroupContent>
  </Sidebar.Group>
{/snippet}

{#snippet list()}
  <Sidebar.Group class="pb-20">
    <Sidebar.GroupLabel class="flex items-center justify-between pr-2">
      <span>Playlists</span>
      <button
        class="size-5 grid place-items-center rounded hover:bg-sidebar-accent transition-colors group-data-[collapsible=icon]:hidden"
        onclick={() => (createDialogOpen = true)}
      >
        <PlusIcon class="size-4" />
      </button>
    </Sidebar.GroupLabel>
    <Sidebar.GroupContent>
      <Sidebar.Menu>
        {#each allUserPlaylists as playlist (playlist.id)}
          <Sidebar.MenuItem>
            <Sidebar.MenuButton
              isActive={isActive(`/playlist?id=${playlist.id}`)}
            >
              {#snippet child({ props })}
                <a
                  href="/playlist?id={playlist.id}"
                  oncontextmenu={(e) => handleContextMenu(e, playlist)}
                  {...props}
                >
                  <ListMusicIcon />
                  <span>{playlist.name}</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        {/each}
      </Sidebar.Menu>
    </Sidebar.GroupContent>
  </Sidebar.Group>
{/snippet}

<Sidebar.Root
  variant="floating"
  collapsible="icon"
  class="border-r-0 select-none"
>
  <Sidebar.Header
    class="p-4 transition-all flex-row items-center justify-between"
  >
    <a href="/" class="flex items-center gap-3">
      <div class="size-8 shrink-0">
        <img src="/favicon.svg" alt="Cadence Logo" class="size-8" />
      </div>
      <span class="text-xl font-semibold tracking-tight"> Cadence </span>
    </a>
  </Sidebar.Header>

  <Sidebar.Content class="relative">
    {@render navigation()}

    <Sidebar.Separator />

    {@render list()}
  </Sidebar.Content>
</Sidebar.Root>

<CreatePlaylistDialog
  bind:open={createDialogOpen}
  onOpenChange={(open) => (createDialogOpen = open)}
  onCreated={handlePlaylistCreated}
/>

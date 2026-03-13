<script lang="ts">
  import { page } from "$app/state";
  import * as Sidebar from "$lib/components/ui/sidebar";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import { ListMusicIcon, PlusIcon, Volume2Icon } from "@lucide/svelte";
  import { offlineDb } from "$lib/db/offline";
  import { playlistsStore } from "$lib/stores/playlists.svelte";
  import { tracksStore } from "$lib/stores/tracks.svelte";
  import { liveQuery } from "dexie";
  import { SPECIAL_PLAYLIST_IDS } from "$lib/utils/playlist";
  import { CreatePlaylistDialog } from "../playlists";
  import { playlistMenuStore } from "$lib/stores/playlistMenu.svelte";
  import { playerStore } from "$lib/stores/player.svelte";
  import type { Playlist } from "$lib/schemas";
  import { navItems } from "./navItems";

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

  function isPlaylistActive(playlistId: string): boolean {
    return (
      page.url.pathname === "/playlist" &&
      page.url.searchParams.get("id") === playlistId
    );
  }

  function isPlaylistPlaying(playlistId: string): boolean {
    return (
      playerStore.isPlaying &&
      playerStore.currentTrack !== null &&
      playerStore.currentPlaylist?.id === playlistId
    );
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
  <Sidebar.Group class="flex flex-col h-full overflow-hidden">
    <Sidebar.GroupLabel class="flex items-center justify-between pr-2 shrink-0">
      <span>Playlists</span>
      <button
        class="size-5 grid place-items-center rounded hover:bg-sidebar-accent transition-colors group-data-[collapsible=icon]:hidden"
        onclick={() => (createDialogOpen = true)}
      >
        <PlusIcon class="size-4" />
      </button>
    </Sidebar.GroupLabel>
    <Sidebar.GroupContent class="flex-1 overflow-hidden">
      <ScrollArea class="h-full">
        <Sidebar.Menu class="pb-40">
          {#each allUserPlaylists as playlist (playlist.id)}
            <Sidebar.MenuItem>
              <Sidebar.MenuButton isActive={isPlaylistActive(playlist.id)}>
                {#snippet child({ props })}
                  <a
                    href="/playlist?id={playlist.id}"
                    oncontextmenu={(e) => handleContextMenu(e, playlist)}
                    {...props}
                  >
                    <ListMusicIcon />
                    <span class="flex-1 truncate">{playlist.name}</span>
                    {#if isPlaylistPlaying(playlist.id)}
                      <Volume2Icon
                        class="ml-auto size-4 shrink-0 group-data-[collapsible=icon]:hidden {isPlaylistActive(
                          playlist.id,
                        )
                          ? 'text-background'
                          : 'text-primary'}"
                      />
                    {/if}
                  </a>
                {/snippet}
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>
          {/each}
        </Sidebar.Menu>
      </ScrollArea>
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

  <Sidebar.Content class="relative flex flex-col">
    {@render navigation()}

    <Sidebar.Separator />

    <div class="flex-1 min-h-0">
      {@render list()}
    </div>
  </Sidebar.Content>
</Sidebar.Root>

<CreatePlaylistDialog
  bind:open={createDialogOpen}
  onOpenChange={(open) => (createDialogOpen = open)}
  onCreated={handlePlaylistCreated}
/>

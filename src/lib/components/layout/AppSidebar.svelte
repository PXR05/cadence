<script lang="ts">
  import { page } from "$app/state";
  import * as Sidebar from "$lib/components/ui/sidebar";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import { PlusIcon } from "@lucide/svelte";
  import { offlineDb } from "$lib/db/offline";
  import { playlistsStore } from "$lib/stores/playlists.svelte";
  import { tracksStore } from "$lib/stores/tracks.svelte";
  import { liveQuery } from "dexie";
  import { SPECIAL_PLAYLIST_IDS } from "$lib/utils/playlist";
  import { CreatePlaylistDialog } from "../playlists";
  import SidebarPlaylistItem from "./SidebarPlaylistItem.svelte";
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

{#snippet navigation()}
  <Sidebar.Group>
    <Sidebar.GroupContent>
      <Sidebar.Menu>
        {#each navItems as item (item.path)}
          <Sidebar.MenuItem>
            <Sidebar.MenuButton class="h-10 px-3" isActive={isActive(item.path)}>
              {#snippet child({ props })}
                <a href={item.path} {...props}>
                  <item.icon strokeWidth={2} absoluteStrokeWidth />
                  <span class="font-medium">{item.label}</span>
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
  <Sidebar.Group class="flex flex-col h-full overflow-hidden gap-1">
    <Sidebar.GroupLabel class="flex items-center justify-between shrink-0">
      <span class="text-sm">Playlists</span>
      <button
        class="size-6 grid place-items-center rounded-sm hover:bg-sidebar-accent transition-colors group-data-[collapsible=icon]:hidden"
        onclick={() => (createDialogOpen = true)}
      >
        <PlusIcon class="size-4" />
      </button>
    </Sidebar.GroupLabel>
    <Sidebar.GroupContent class="flex-1 overflow-hidden">
      <ScrollArea class="h-full">
        <Sidebar.Menu class="pb-40 gap-1">
          {#each allUserPlaylists as playlist (playlist.id)}
            <SidebarPlaylistItem {playlist} />
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

<script lang="ts">
  import { page } from "$app/state";
  import * as Sidebar from "$lib/components/ui/sidebar";
  import { ArrowLeftToLineIcon, PlusIcon } from "@lucide/svelte";
  import { offlineDb } from "$lib/db/offline";
  import { playlistsStore } from "$lib/stores/playlists.svelte";
  import { tracksStore } from "$lib/stores/tracks.svelte";
  import { liveQuery } from "dexie";
  import { SPECIAL_PLAYLIST_IDS } from "$lib/utils/playlist";
  import { CreatePlaylistDialog } from "../playlists";
  import SidebarPlaylistItem from "./SidebarPlaylistItem.svelte";
  import { navItems } from "./navItems";
  import { goto } from "$app/navigation";
  import { playerStore } from "$lib/stores/player.svelte";

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

  const allPlaylists = $derived([
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
    ...playlistsStore.allPlaylists,
  ]);

  async function handlePlaylistCreated() {
    playlistsStore.invalidate();
    await playlistsStore.loadAllPlaylists(true);
  }

  const sidebar = Sidebar.useSidebar();
</script>

{#snippet navigation()}
  <Sidebar.Group class="pt-0">
    <Sidebar.GroupContent>
      <Sidebar.Menu class="gap-0.5">
        {#each navItems as item (item.path)}
          <Sidebar.MenuItem>
            <Sidebar.MenuButton
              class="h-11.5 px-4"
              isActive={isActive(item.path)}
              tooltipContent={item.label}
            >
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
  <Sidebar.Group class="flex flex-col h-full overflow-hidden gap-1 py-0">
    <Sidebar.GroupLabel class="relative flex items-center justify-between">
      <span
        class="text-sm group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:pointer-events-none transition-all duration-200"
        >Playlists</span
      >

      <button
        class="absolute right-0 group-data-[collapsible=icon]:right-2 top-0 size-8 grid place-items-center rounded-sm hover:bg-sidebar-accent transition-colors"
        onclick={() => (createDialogOpen = true)}
      >
        <PlusIcon class="size-4" />
      </button>
    </Sidebar.GroupLabel>

    <Sidebar.GroupContent class="flex-1 h-full overflow-y-scroll">
      <Sidebar.Menu class="pb-40 gap-1 transition-all duration-200">
        {#each allPlaylists as playlist (playlist.id)}
          <SidebarPlaylistItem {playlist} />
        {/each}
      </Sidebar.Menu>
    </Sidebar.GroupContent>
  </Sidebar.Group>
{/snippet}

<Sidebar.Root variant="sidebar" collapsible="icon" class="select-none">
  <Sidebar.Header
    class="relative p-4 transition-all flex-row items-center justify-between"
  >
    <button
      onclick={() => {
        if (sidebar.state === "collapsed") {
          sidebar.toggle();
        } else {
          goto("/");
        }
      }}
      class="flex items-center gap-3 overflow-hidden"
    >
      <div class="size-8 shrink-0">
        <img src="/favicon.svg" alt="Cadence Logo" class="size-8" />
      </div>
      <span
        class="text-xl font-semibold group-data-[state=collapsed]:opacity-0 transition-all duration-200"
      >
        Cadence
      </span>
    </button>
    <button
      onclick={() => sidebar.toggle()}
      class="absolute right-2 top-4 size-8 grid place-items-center rounded-sm text-muted-foreground hover:text-foreground transition-colors group-data-[collapsible=icon]:hidden"
    >
      <ArrowLeftToLineIcon class="size-4" />
    </button>
  </Sidebar.Header>

  <Sidebar.Content class="relative flex flex-col gap-0">
    {@render navigation()}

    <Sidebar.Separator class="mt-0.5 mb-2" />

    <div
      class="flex-1 min-h-0
      {playerStore.queueLength > 0 ? 'md:mb-22' : ''}"
    >
      {@render list()}
    </div>
  </Sidebar.Content>
</Sidebar.Root>

<CreatePlaylistDialog
  bind:open={createDialogOpen}
  onOpenChange={(open) => (createDialogOpen = open)}
  onCreated={handlePlaylistCreated}
/>

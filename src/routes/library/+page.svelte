<script lang="ts">
  import { MusicIcon, PlusIcon } from "@lucide/svelte";
  import { CreatePlaylistDialog } from "$lib/components";
  import { getUserPlaylists } from "$lib/api";
  import { onMount } from "svelte";
  import { LoaderIcon } from "@lucide/svelte";

  let createDialogOpen = $state(false);
  let playlists = $state<Playlist[]>([]);
  let loading = $state(true);

  onMount(async () => {
    await loadPlaylists();
  });

  async function loadPlaylists() {
    loading = true;
    try {
      const response = await getUserPlaylists();
      playlists = response.playlists;
    } catch (error) {
      console.error("Failed to load playlists:", error);
    } finally {
      loading = false;
    }
  }

  function handlePlaylistCreated() {
    loadPlaylists();
  }
</script>

<div
  class="flex flex-col max-w-4xl mx-auto w-full h-[calc(100dvh-3rem-2px)] border-x"
>
  {#if loading}
    <div class="flex items-center justify-center h-full">
      <LoaderIcon class="animate-spin text-muted-foreground" size={24} />
    </div>
  {:else}
    <div class="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <button
        onclick={() => (createDialogOpen = true)}
        class="aspect-square border hover:bg-muted/50 transition-colors flex flex-col items-center"
      >
        <PlusIcon
          size={48}
          strokeWidth={2}
          absoluteStrokeWidth
          class="text-muted-foreground m-auto"
        />
        <span class="text-sm font-medium w-full py-4 bg-muted border-t">
          Create Playlist
        </span>
      </button>

      {#each playlists as playlist (playlist.id)}
        <a
          href="/library/{playlist.id}"
          class="aspect-square border hover:bg-muted/50 transition-colors flex flex-col"
        >
          <div class="flex-1 overflow-hidden">
            {#if playlist.coverImage}
              <img
                src={playlist.coverImage}
                alt={playlist.name}
                class="w-full h-full object-cover"
              />
            {:else}
              <MusicIcon
                size={48}
                strokeWidth={2}
                absoluteStrokeWidth
                class="text-muted-foreground h-full m-auto"
              />
            {/if}
          </div>
          <div class="w-full py-2 px-2 bg-muted border-t">
            <p class="text-sm font-medium truncate">{playlist.name}</p>
            <p class="text-xs text-muted-foreground">
              {playlist.itemCount ?? 0} tracks
            </p>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>

<CreatePlaylistDialog
  bind:open={createDialogOpen}
  onOpenChange={(open) => (createDialogOpen = open)}
  onCreated={handlePlaylistCreated}
/>

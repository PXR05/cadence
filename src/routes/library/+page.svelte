<script lang="ts">
  import { onMount } from "svelte";
  import { getUserPlaylists } from "$lib/api";
  import { CreatePlaylistDialog, PlaylistCard } from "$lib/components";
  import { LoaderIcon, PlusIcon, ChevronRightIcon } from "@lucide/svelte";

  let createDialogOpen = $state(false);
  let allPlaylists = $state<Playlist[]>([]);
  let loading = $state(true);

  const userPlaylists = $derived(
    allPlaylists.filter(
      (p) => !p.id.startsWith("artist_") && !p.id.startsWith("album_")
    )
  );
  const artistPlaylists = $derived(
    allPlaylists.filter((p) => p.id.startsWith("artist_"))
  );
  const albumPlaylists = $derived(
    allPlaylists.filter((p) => p.id.startsWith("album_"))
  );

  onMount(() => loadPlaylists());

  async function loadPlaylists() {
    loading = true;
    try {
      const response = await getUserPlaylists();
      allPlaylists = response.playlists;
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

<svelte:head>
  <title>Library | Cadence</title>
</svelte:head>

{#snippet sectionHeader(
  title: string,
  showAllLink?: string,
  itemCount?: number
)}
  <div class="flex items-center justify-between mb-3">
    <h2 class="text-lg font-semibold">{title}</h2>
    {#if showAllLink && itemCount && itemCount > 5}
      <a
        href={showAllLink}
        class="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
      >
        Show all
        <ChevronRightIcon size={16} />
      </a>
    {/if}
  </div>
{/snippet}

<div
  class="flex flex-col max-w-4xl mx-auto w-full h-full border-x overflow-y-auto"
>
  {#if loading}
    <div class="flex items-center justify-center h-full">
      <LoaderIcon class="animate-spin text-muted-foreground" size={24} />
    </div>
  {:else}
    <div class="space-y-2 p-4">
      <section>
        {@render sectionHeader(
          "Your Playlists",
          "/library/type/user",
          userPlaylists.length
        )}
        <div class="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
          <button
            onclick={() => (createDialogOpen = true)}
            class="aspect-square w-40 flex-shrink-0 border hover:bg-muted/50 transition-colors grid place-items-center"
          >
            <PlusIcon size={48} absoluteStrokeWidth strokeWidth={2} class="text-muted-foreground" />
          </button>
          {#each userPlaylists.slice(0, 8) as playlist (playlist.id)}
            <PlaylistCard {playlist} />
          {/each}
        </div>
      </section>

      {#if artistPlaylists.length > 0}
        <section>
          {@render sectionHeader(
            "Artists",
            "/library/type/artist",
            artistPlaylists.length
          )}
          <div class="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
            {#each artistPlaylists.slice(0, 9) as playlist (playlist.id)}
              <PlaylistCard {playlist} />
            {/each}
          </div>
        </section>
      {/if}

      {#if albumPlaylists.length > 0}
        <section>
          {@render sectionHeader(
            "Albums",
            "/library/type/album",
            albumPlaylists.length
          )}
          <div class="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
            {#each albumPlaylists.slice(0, 9) as playlist (playlist.id)}
              <PlaylistCard {playlist} />
            {/each}
          </div>
        </section>
      {/if}
    </div>
  {/if}
</div>

<CreatePlaylistDialog
  bind:open={createDialogOpen}
  onOpenChange={(open) => (createDialogOpen = open)}
  onCreated={handlePlaylistCreated}
/>

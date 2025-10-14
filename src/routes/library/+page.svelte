<script lang="ts">
  import { onMount } from "svelte";
  import { getUserPlaylists } from "$lib/api";
  import { CreatePlaylistDialog, PlaylistCard } from "$lib/components";
  import { LoaderIcon, PlusIcon, ChevronRightIcon } from "@lucide/svelte";
  import { getSpecialPlaylists } from "$lib/utils/playlist";

  let createDialogOpen = $state(false);
  let userPlaylists = $state<Playlist[]>([]);
  let youtubePlaylists = $state<Playlist[]>([]);
  let loading = $state(true);

  onMount(() => loadPlaylists());

  async function loadPlaylists() {
    loading = true;
    try {
      const [userResponse, youtubeResponse, special] =
        await Promise.all([
          getUserPlaylists("user", 10),
          getUserPlaylists("youtube", 10),
          getSpecialPlaylists(),
        ]);

      userPlaylists = [...special, ...userResponse.playlists];
      youtubePlaylists = youtubeResponse.playlists;
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
            <PlusIcon
              size={48}
              absoluteStrokeWidth
              strokeWidth={2}
              class="text-muted-foreground"
            />
          </button>
          {#each userPlaylists as playlist (playlist.id)}
            <PlaylistCard {playlist} />
          {/each}
        </div>
      </section>

      {#if youtubePlaylists.length > 0}
        <section>
          {@render sectionHeader(
            "YouTube",
            "/library/type/youtube",
            youtubePlaylists.length
          )}
          <div class="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
            {#each youtubePlaylists as playlist (playlist.id)}
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

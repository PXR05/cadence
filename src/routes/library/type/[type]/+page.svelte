<script lang="ts">
  import { page } from "$app/state";
  import { onMount } from "svelte";
  import { getUserPlaylists } from "$lib/api";
  import { navigationStore } from "$lib/stores/navigation.svelte";
  import { PlaylistCard } from "$lib/components";
  import { LoaderIcon } from "@lucide/svelte";
  import { getSpecialPlaylists } from "$lib/utils/playlist";

  const type = $derived(page.params.type as "user" | "artist" | "album");

  let playlists = $state<Playlist[]>([]);
  let specialPlaylists = $state<Playlist[]>([]);
  let loading = $state(true);

  const displayPlaylists = $derived(
    type === "user" ? [...specialPlaylists, ...playlists] : playlists
  );

  const title = $derived.by(() => {
    switch (type) {
      case "user":
        return "Your Playlists";
      case "artist":
        return "Artists";
      case "album":
        return "Albums";
      default:
        return "Playlists";
    }
  });

  onMount(() => loadPlaylists());

  async function loadPlaylists() {
    loading = true;
    try {
      if (type === "user") {
        const [regularPlaylists, special] = await Promise.all([
          getUserPlaylists(type),
          getSpecialPlaylists(),
        ]);
        playlists = regularPlaylists.playlists;
        specialPlaylists = special;
      } else {
        const response = await getUserPlaylists(type);
        playlists = response.playlists;
      }

      navigationStore.setNavigation(
        [{ label: "Library", path: "/library" }],
        title
      );
    } catch (error) {
      console.error("Failed to load playlists:", error);
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>{title} | Cadence</title>
</svelte:head>

<div class="flex flex-col max-w-4xl mx-auto w-full h-full border-x">
  {#if loading}
    <div class="flex items-center justify-center h-full">
      <LoaderIcon class="animate-spin text-muted-foreground" size={24} />
    </div>
  {:else}
    <div class="flex-1 overflow-y-auto">
      {#if displayPlaylists.length === 0}
        <div class="flex items-center justify-center h-full">
          <p class="text-muted-foreground">No playlists found</p>
        </div>
      {:else}
        <div class="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {#each displayPlaylists as playlist (playlist.id)}
            <PlaylistCard {playlist} size="large" />
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

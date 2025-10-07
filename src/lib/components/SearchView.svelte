<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { LoaderIcon, SearchIcon } from "@lucide/svelte";
  import TrackItem from "./TrackItem.svelte";
  import { searchTracks } from "$lib/api";

  const LIMIT = 10;
  const DEBOUNCE_MS = 300;

  let searchQuery = $state("");
  let tracks = $state<AudioFile[]>([]);
  let loading = $state(false);
  let isDebouncing = $state(false);
  let searchInput: HTMLInputElement | null = $state(null);
  let hasSearched = $state(false);
  let searchDebounce: number | null = null;
  let initialized = $state(false);

  $effect(() => {
    const urlQuery = page.url.searchParams.get("q") || "";
    if (!initialized && urlQuery) {
      searchQuery = urlQuery;
      performSearch();
      initialized = true;
    }
  });

  function updateURL(query: string) {
    const url = new URL(page.url);
    if (query.trim()) {
      url.searchParams.set("q", query.trim());
    } else {
      url.searchParams.delete("q");
    }
    goto(url, { replaceState: true, noScroll: true, keepFocus: true });
  }

  async function performSearch() {
    if (!searchQuery.trim() || loading) return;

    loading = true;
    hasSearched = true;
    updateURL(searchQuery);

    try {
      const result = await searchTracks({
        q: searchQuery.trim(),
        page: 1,
        limit: LIMIT,
      });

      tracks = result.tracks;
    } catch (error) {
      console.error("Error searching tracks:", error);
    } finally {
      loading = false;
    }
  }

  function handleInput() {
    if (searchDebounce) clearTimeout(searchDebounce);

    if (!searchQuery.trim()) {
      tracks = [];
      hasSearched = false;
      isDebouncing = false;
      updateURL("");
      return;
    }

    isDebouncing = true;
    searchDebounce = window.setTimeout(() => {
      isDebouncing = false;
      performSearch();
    }, DEBOUNCE_MS);
  }

  function handleSubmit(e: Event) {
    e.preventDefault();
    if (searchDebounce) clearTimeout(searchDebounce);
    isDebouncing = false;
    performSearch();
  }

  function clearSearch() {
    searchQuery = "";
    tracks = [];
    hasSearched = false;
    isDebouncing = false;
    updateURL("");
  }

  onMount(() => {
    searchInput?.focus();
    return () => {
      if (searchDebounce) clearTimeout(searchDebounce);
    };
  });
</script>

<div class="flex flex-col max-w-4xl mx-auto w-full h-[calc(100dvh-3rem-2px)]">
  <form onsubmit={handleSubmit} class="relative border border-t-0">
    <div class="flex items-center">
      <SearchIcon size={20} class="ml-3 text-muted-foreground flex-shrink-0" />
      <input
        bind:this={searchInput}
        bind:value={searchQuery}
        oninput={handleInput}
        type="text"
        placeholder="search..."
        class="flex-1 bg-transparent p-3 outline-none font-mono placeholder:text-muted-foreground"
      />
      {#if searchQuery}
        {#if isDebouncing || loading}
          <div class="px-3">
            <LoaderIcon class="animate-spin text-muted-foreground" size={16} />
          </div>
        {:else}
          <button
            type="button"
            onclick={clearSearch}
            class="px-3 text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        {/if}
      {/if}
    </div>
  </form>

  <div
    class="flex-1 border border-t-0 h-[calc(100dvh-6rem-2px)] overflow-y-auto"
  >
    {#if loading}
      <div class="flex flex-col items-center justify-center flex-1 p-8 h-full">
        <LoaderIcon class="animate-spin text-muted-foreground" />
      </div>
    {:else if hasSearched}
      {#if tracks.length > 0}
        {#each tracks as track, i (track.id)}
          <TrackItem {track} />
        {/each}
        <div class="h-24"></div>
      {:else}
        <div class="h-full flex flex-col items-center justify-center p-8">
          <p class="text-muted-foreground mb-2">No results found</p>
          <p class="text-sm text-muted-foreground">
            Try a different search query
          </p>
        </div>
      {/if}
    {:else}
      <div class="flex flex-col items-center justify-center flex-1 p-8 h-full">
        <SearchIcon size={48} class="text-muted-foreground mb-4" />
        <p class="text-muted-foreground text-center">
          Search by track title, artist, or album
        </p>
      </div>
    {/if}
  </div>
</div>

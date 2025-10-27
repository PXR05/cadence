<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { LoaderIcon, SearchIcon, XIcon } from "@lucide/svelte";
  import TrackItem from "./TrackItem.svelte";
  import { searchTracks } from "$lib/api";
  import { Input } from "../ui/input";
  import { Button } from "../ui/button";
  import { ScrollArea } from "../ui/scroll-area";

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
    return () => {
      if (searchDebounce) clearTimeout(searchDebounce);
    };
  });

  const isEmpty = $derived(searchQuery.trim().length === 0);
</script>

<form
  onsubmit={handleSubmit}
  style="--h: 8rem;"
  class="p-2 absolute top-0 left-0 right-0 z-10"
>
  <div class="_bg _blur absolute inset-0 -z-10"></div>
  <div class="_bg _color absolute inset-0 -z-10"></div>
  <h2 class="text-2xl font-semibold p-2">Search</h2>
  <div
    class="mt-2 flex items-center relative bg-muted/50 backdrop-blur-md rounded-xl overflow-clip border border-input"
  >
    <SearchIcon
      size={16}
      class="absolute transition-all text-muted-foreground flex-shrink-0 
      {!isEmpty ? 'opacity-0' : ''}"
      style="transform: translateX({!isEmpty ? '0' : '0.75rem'})"
    />
    <Input
      bind:ref={searchInput}
      bind:value={searchQuery}
      oninput={handleInput}
      type="text"
      placeholder="search..."
      class="flex-1 text-base h-auto !bg-transparent border-0 transition-all p-3 outline-none font-mono placeholder:text-muted-foreground 
        {!isEmpty ? '' : 'pl-9'}"
    />
    <Button
      variant="ghost"
      size="icon"
      class="text-muted-foreground absolute right-1 rounded-lg
        {isEmpty ? 'opacity-0' : ''}"
      style="transform: translateX({isEmpty ? '0.5rem' : '0rem'})"
      onclick={clearSearch}
      disabled={isEmpty || isDebouncing || loading}
    >
      {#if isDebouncing || loading}
        <LoaderIcon class="animate-spin" size={16} />
      {:else if !isEmpty}
        <XIcon size={16} />
      {/if}
    </Button>
  </div>
</form>

<ScrollArea class="h-dvh">
  <div class="flex flex-col mx-auto w-full h-full border-x overflow-auto">
    <div class="flex-1 pt-32 md:pt-30">
      {#if loading}
        <div
          class="flex flex-col items-center justify-center flex-1 p-8 h-full"
        >
          <LoaderIcon class="animate-spin text-muted-foreground" />
        </div>
      {:else if hasSearched}
        {#if tracks.length > 0}
          {#each tracks as track, i (track.id)}
            <TrackItem index={i} {track} />
          {/each}
          <div class="h-[50dvh]"></div>
        {:else}
          <div class="h-full flex flex-col items-center justify-center p-8">
            <p class="text-muted-foreground mb-2">No results found</p>
            <p class="text-sm text-muted-foreground">
              Try a different search query
            </p>
          </div>
        {/if}
      {:else}
        <div
          class="flex flex-col items-center justify-center flex-1 p-8 pb-48 md:pb-36 h-full"
        >
          <SearchIcon size={48} class="text-muted-foreground mb-4" />
          <p class="text-muted-foreground text-center">
            Search by track title, artist, or album
          </p>
        </div>
      {/if}
    </div>
  </div>
</ScrollArea>

<style>
  ._bg {
    &::before,
    &::after {
      pointer-events: none;
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      z-index: -1;
      mask: linear-gradient(to top, transparent, black);
    }
    &::before {
      height: var(--h);
    }
    &::after {
      height: calc(var(--h) - 1rem);
    }
  }

  ._color {
    &::before,
    &::after {
      background-color: var(--background);
    }
  }

  ._blur {
    &::before,
    &::after {
      backdrop-filter: blur(1rem) saturate(120%) brightness(120%);
    }
  }
</style>

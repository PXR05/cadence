<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { LoaderIcon, PlusIcon, SearchIcon, XIcon } from "@lucide/svelte";
  import TrackItem from "./TrackItem.svelte";
  import YouTubeTrackItem from "./YouTubeTrackItem.svelte";
  import UploadTrackDialog from "../admin/UploadTrackDialog.svelte";
  import { searchTracks } from "$lib/api";
  import { searchCachedTracks } from "$lib/db/cache";
  import { Input } from "../ui/input";
  import { Button } from "../ui/button";
  import { ScrollArea } from "../ui/scroll-area";
  import { playerStore } from "$lib/stores/player.svelte";
  import { youtubeDownloadStore } from "$lib/stores/youtubeDownload.svelte";
  import { searchYoutube } from "$lib/api/youtube";
  import type { AudioFile, YouTubeSearchResult } from "$lib/schemas";
  import { appearanceStore } from "$lib/stores/appearance.svelte";
  import { toast } from "svelte-sonner";

  const LIMIT = 10;
  const DEBOUNCE_MS = 300;

  let searchQuery = $state("");
  let tracks = $state<AudioFile[]>([]);
  let youtubeResults = $state<YouTubeSearchResult[]>([]);
  let loading = $state(false);
  let isDebouncing = $state(false);
  let searchInput: HTMLInputElement | null = $state(null);
  let hasSearched = $state(false);
  let searchDebounce: number | null = null;
  let initialized = $state(false);
  let isOffline = $state(false);
  let uploadDialogOpen = $state(false);
  let uploadLoading = $state(false);

  function handleUploadComplete(successCount: number, totalCount: number) {
    toast.success(
      `Successfully uploaded ${successCount} of ${totalCount} track(s)`,
    );
  }

  function handleUploadError(error: string) {
    toast.error(error);
  }

  async function handleYoutubeUpload(url: string) {
    try {
      await youtubeDownloadStore.addUrlToQueue(url);
      toast.success("Added to download queue");
    } catch (error) {
      toast.error("Failed to add to download queue");
    }
  }

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
      const localResult = await searchTracks({
        q: searchQuery.trim(),
        page: 1,
        limit: LIMIT,
      });

      tracks = localResult.tracks;
      isOffline = false;
    } catch (error) {
      console.error(
        "Error performing online search, falling back to cache:",
        error,
      );

      try {
        const cachedResults = await searchCachedTracks(
          searchQuery.trim(),
          LIMIT,
        );
        tracks = cachedResults;
        isOffline = true;
      } catch (cacheError) {
        console.error("Error searching cache:", cacheError);
        tracks = [];
        isOffline = false;
      }
    }

    try {
      const youtubeResult = await searchYoutube(searchQuery.trim());

      const existingYoutubeIds = new Set(
        tracks.map((track) => track.youtubeId).filter(Boolean),
      );

      youtubeResults = youtubeResult.filter(
        (result: YouTubeSearchResult) =>
          !existingYoutubeIds.has(result.videoId),
      );
    } catch (error) {
      console.error("Error searching YouTube:", error);
      youtubeResults = [];
    }

    loading = false;
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
    youtubeResults = [];
    hasSearched = false;
    isDebouncing = false;
    isOffline = false;
    updateURL("");
  }

  async function handleYoutubeTrackDownload(videoId: string) {
    const result = youtubeResults.find((r) => r.videoId === videoId);
    if (!result) return;

    await youtubeDownloadStore.addToQueue(result);
  }

  onMount(() => {
    return () => {
      if (searchDebounce) clearTimeout(searchDebounce);
    };
  });

  const isEmpty = $derived(searchQuery.trim().length === 0);
  const currentId = $derived(playerStore.currentTrack?.id);
</script>

<form
  onsubmit={handleSubmit}
  style="--h: 8rem;"
  class="p-2 absolute top-0 left-0 right-0 z-10"
>
  {#if !appearanceStore.disableBlur}
    <div class="_bg _blur absolute inset-0 -z-10"></div>
  {/if}
  <div class="_bg _color absolute inset-0 -z-10"></div>
  <h2 class="text-2xl font-semibold p-2">Search</h2>
  <div class="flex items-center gap-2">
    <div
      class="flex-1 mt-2 flex items-center relative rounded-xl overflow-clip border border-input/15
    {appearanceStore.disableBlur
        ? 'bg-muted'
        : 'bg-muted-foreground/10 dark:bg-muted/50 backdrop-blur-md'}"
    >
      <SearchIcon
        size={16}
        class="absolute transition-all text-muted-foreground shrink-0
      {!isEmpty ? 'opacity-0' : ''}"
        style="transform: translateX({!isEmpty ? '0' : '0.75rem'})"
      />
      <Input
        bind:ref={searchInput}
        bind:value={searchQuery}
        oninput={handleInput}
        type="text"
        placeholder="search..."
        class="flex-1 text-base h-auto bg-transparent! border-0 transition-all p-3 outline-none font-mono placeholder:text-muted-foreground
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
    <Button
      variant="outline"
      size="icon"
      class="mt-2 size-11 rounded-xl shrink-0"
      onclick={() => (uploadDialogOpen = true)}
      aria-label="Add track"
    >
      <PlusIcon size={20} />
    </Button>
  </div>
</form>

<UploadTrackDialog
  bind:open={uploadDialogOpen}
  loading={uploadLoading}
  onUploadComplete={handleUploadComplete}
  onUploadError={handleUploadError}
  onYoutubeUpload={handleYoutubeUpload}
/>

<ScrollArea class="h-dvh">
  <div class="flex flex-col mx-auto w-full h-full overflow-auto">
    <div class="flex-1 pt-32 md:pt-30">
      {#if loading}
        <div
          class="flex flex-col items-center justify-center flex-1 p-8 pb-48 md:pb-36 h-full"
        >
          <LoaderIcon class="animate-spin text-muted-foreground" />
        </div>
      {:else if hasSearched}
        {#if tracks.length > 0 || youtubeResults.length > 0}
          {#if tracks.length > 0}
            <div class="px-4 py-2 text-sm font-semibold text-muted-foreground">
              Local Results
            </div>
            {#each tracks as track, i (track.id)}
              <TrackItem
                index={i}
                isCurrentTrack={track.id === currentId}
                {track}
              />
            {/each}
          {/if}

          {#if youtubeResults.length > 0}
            <div
              class="px-4 py-2 text-sm font-semibold text-muted-foreground {tracks.length >
              0
                ? 'mt-4'
                : ''}"
            >
              YouTube Results
            </div>
            {#each youtubeResults as result (result.videoId)}
              <YouTubeTrackItem
                {result}
                isInQueue={youtubeDownloadStore.isInQueue(result.videoId)}
                onDownload={handleYoutubeTrackDownload}
              />
            {/each}
          {/if}

          <div class="h-[50dvh]"></div>
        {:else}
          <div
            class="h-full flex flex-col items-center justify-center p-8 pb-48 md:pb-36"
          >
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
          <SearchIcon
            strokeWidth={1.5}
            size={48}
            class="text-muted-foreground mb-4"
          />
          <p class="text-muted-foreground text-center">
            Search by title, artist, or album
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
      background-color: color-mix(in oklab, var(--background) 50%, transparent);
    }
  }

  ._blur {
    &::before,
    &::after {
      backdrop-filter: blur(1rem) saturate(120%) brightness(120%);
    }
  }
</style>

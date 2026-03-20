<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import {
    DatabaseIcon,
    LoaderIcon,
    MusicIcon,
    PlusIcon,
    SearchIcon,
    XIcon,
    YoutubeIcon,
  } from "@lucide/svelte";
  import TrackItem from "./TrackItem.svelte";
  import RemoteTrackItem from "./RemoteTrackItem.svelte";
  import UploadTrackDialog from "../admin/UploadTrackDialog.svelte";
  import { searchTracks, searchRemote } from "$lib/api";
  import { searchCachedTracks } from "$lib/db/cache";
  import { Input } from "../ui/input";
  import {
    Select as SelectRoot,
    SelectContent,
    SelectItem,
    SelectTrigger,
  } from "../ui/select";
  import { Button } from "../ui/button";
  import { playerStore } from "$lib/stores/player.svelte";
  import { remoteDownloadStore } from "$lib/stores/remoteDownload.svelte";
  import type {
    AudioFile,
    RemoteProvider,
    RemoteSearchResult,
  } from "$lib/schemas";
  import { appearanceStore } from "$lib/stores/appearance.svelte";
  import { getRemoteProviderLabel } from "$lib/utils/remote";
  import { toast } from "svelte-sonner";
  import { browser } from "$app/environment";

  const LIMIT = 10;
  const DEBOUNCE_MS = 300;
  const REMOTE_PROVIDERS: RemoteProvider[] = ["youtube", "tidal"];
  const SEARCH_PROVIDERS = ["local", ...REMOTE_PROVIDERS] as const;

  type SearchProvider = (typeof SEARCH_PROVIDERS)[number];

  type RemoteResultsByProvider = Record<RemoteProvider, RemoteSearchResult[]>;

  function isSearchProvider(value: string | null): value is SearchProvider {
    if (!value) return false;
    return SEARCH_PROVIDERS.includes(value as SearchProvider);
  }

  function getSearchProviderLabel(provider: SearchProvider): string {
    if (provider === "local") {
      return "Local";
    }

    return getRemoteProviderLabel(provider);
  }

  function createEmptyRemoteResults(): RemoteResultsByProvider {
    return {
      youtube: [],
      tidal: [],
    };
  }

  let searchQuery = $state("");
  let searchProvider = $state<SearchProvider>("local");
  let tracks = $state<AudioFile[]>([]);
  let remoteResultsByProvider = $state<RemoteResultsByProvider>(
    createEmptyRemoteResults(),
  );
  let loading = $state(false);
  let isDebouncing = $state(false);
  let searchInput: HTMLInputElement | null = $state(null);
  let hasSearched = $state(false);
  let searchDebounce: number | null = null;
  let initialized = $state(false);
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

  async function handleRemoteUpload(provider: RemoteProvider, url: string) {
    const providerLabel = getRemoteProviderLabel(provider);

    try {
      await remoteDownloadStore.addUrlToQueue(provider, url);
      toast.success("Added to download queue");
    } catch (error) {
      toast.error(`Failed to add ${providerLabel} URL to download queue`);
    }
  }

  $effect(() => {
    const urlQuery = browser ? page.url.searchParams.get("q") || "" : "";

    const urlProvider = browser ? page.url.searchParams.get("provider") : null;

    if (!initialized) {
      if (isSearchProvider(urlProvider)) {
        searchProvider = urlProvider;
      }

      if (urlQuery) {
        searchQuery = urlQuery;
        performSearch();
      }

      initialized = true;
    }
  });

  function updateURL(query: string, provider: SearchProvider = searchProvider) {
    const url = new URL(page.url);

    if (query.trim()) {
      url.searchParams.set("q", query.trim());
    } else {
      url.searchParams.delete("q");
    }

    if (provider === "local") {
      url.searchParams.delete("provider");
    } else {
      url.searchParams.set("provider", provider);
    }

    goto(url, { replaceState: true, noScroll: true, keepFocus: true });
  }

  async function performSearch() {
    const query = searchQuery.trim();
    if (!query || loading) return;

    loading = true;
    hasSearched = true;
    tracks = [];
    remoteResultsByProvider = createEmptyRemoteResults();
    updateURL(query);

    try {
      if (searchProvider === "local") {
        try {
          const localResult = await searchTracks({
            q: query,
            page: 1,
            limit: LIMIT,
          });

          tracks = localResult.tracks;
        } catch (error) {
          console.error(
            "Error performing online search, falling back to cache:",
            error,
          );

          try {
            const cachedResults = await searchCachedTracks(query, LIMIT);
            tracks = cachedResults;
          } catch (cacheError) {
            console.error("Error searching cache:", cacheError);
            tracks = [];
          }
        }

        return;
      }

      const providerResults = await searchRemote(searchProvider, query);
      const nextRemoteResults = createEmptyRemoteResults();
      nextRemoteResults[searchProvider] = providerResults;
      remoteResultsByProvider = nextRemoteResults;
    } catch (error) {
      console.error(
        `Error searching ${getSearchProviderLabel(searchProvider)}:`,
        error,
      );
      remoteResultsByProvider = createEmptyRemoteResults();
    } finally {
      loading = false;
    }
  }

  function handleProviderChange(nextProvider: string) {
    if (!isSearchProvider(nextProvider)) {
      return;
    }

    if (nextProvider === searchProvider) {
      return;
    }

    searchProvider = nextProvider;
    tracks = [];
    remoteResultsByProvider = createEmptyRemoteResults();
    hasSearched = false;

    if (searchDebounce) {
      clearTimeout(searchDebounce);
      searchDebounce = null;
    }

    isDebouncing = false;

    if (searchQuery.trim()) {
      performSearch();
      return;
    }

    updateURL("", nextProvider);
  }

  function handleInput() {
    if (searchDebounce) clearTimeout(searchDebounce);

    if (!searchQuery.trim()) {
      tracks = [];
      hasSearched = false;
      isDebouncing = false;
      remoteResultsByProvider = createEmptyRemoteResults();
      updateURL("", searchProvider);
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
    remoteResultsByProvider = createEmptyRemoteResults();
    hasSearched = false;
    isDebouncing = false;
    updateURL("", searchProvider);
  }

  async function handleRemoteTrackDownload(result: RemoteSearchResult) {
    await remoteDownloadStore.addToQueue(result);
  }

  onMount(() => {
    return () => {
      if (searchDebounce) clearTimeout(searchDebounce);
    };
  });

  const isEmpty = $derived(searchQuery.trim().length === 0);
  const currentId = $derived(playerStore.currentTrack?.id);
  const hasRemoteResults = $derived(
    REMOTE_PROVIDERS.some(
      (provider) => remoteResultsByProvider[provider].length > 0,
    ),
  );
  const firstRemoteProvider = $derived(
    REMOTE_PROVIDERS.find(
      (provider) => remoteResultsByProvider[provider].length > 0,
    ) ?? null,
  );
</script>

<form
  onsubmit={handleSubmit}
  style="--h: 8rem;"
  class="p-2 fixed top-0 left-0 md:left-64 right-0 z-10"
>
  <div class="_bg _color absolute inset-0 -z-10"></div>
  <h2 class="text-2xl font-semibold p-2">Search</h2>
  <div class="flex items-center gap-2">
    <div
      class="flex-1 mt-2 flex items-stretch relative rounded-xl border border-input/15 min-h-11
    {appearanceStore.disableBlur
        ? 'bg-muted'
        : 'bg-muted-foreground/10 dark:bg-muted/50 backdrop-blur-md'}"
    >
      <SelectRoot
        type="single"
        value={searchProvider}
        onValueChange={handleProviderChange}
      >
        <SelectTrigger
          class="px-3 absolute left-1 top-1 bottom-1 h-10! z-10 border-input rounded-r-[6px]"
          aria-label="Search provider"
        >
          {#if searchProvider === "local"}
            <DatabaseIcon size={14} class="text-muted-foreground" />
          {:else if searchProvider === "youtube"}
            <YoutubeIcon size={14} class="text-muted-foreground" />
          {:else}
            <MusicIcon size={14} class="text-muted-foreground" />
          {/if}
        </SelectTrigger>
        <SelectContent align="start" sideOffset={0}>
          {#each SEARCH_PROVIDERS as provider}
            <SelectItem value={provider}>
              <span class="inline-flex items-center gap-2">
                {#if provider === "local"}
                  <DatabaseIcon size={14} class="text-muted-foreground" />
                {:else if provider === "youtube"}
                  <YoutubeIcon size={14} class="text-muted-foreground" />
                {:else}
                  <MusicIcon size={14} class="text-muted-foreground" />
                {/if}
                {getSearchProviderLabel(provider)}
              </span>
            </SelectItem>
          {/each}
        </SelectContent>
      </SelectRoot>

      <div class="relative flex-1 min-w-0 flex items-center">
        <Input
          bind:ref={searchInput}
          bind:value={searchQuery}
          oninput={handleInput}
          type="text"
          placeholder="search..."
          class="flex-1 text-base h-auto bg-transparent! border-0 transition-all p-3 pr-11 pl-20 outline-none font-mono placeholder:text-muted-foreground rounded-xl"
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
  onRemoteUpload={handleRemoteUpload}
/>

<div class="flex flex-col mx-auto w-full h-full overflow-auto">
  <div class="flex-1 pt-32 md:pt-30">
    {#if loading}
      <div
        class="flex flex-col items-center justify-center flex-1 p-8 pb-48 md:pb-36 h-full"
      >
        <LoaderIcon class="animate-spin text-muted-foreground" />
      </div>
    {:else if hasSearched}
      {#if tracks.length > 0 || hasRemoteResults}
        {#if tracks.length > 0}
          <div class="px-4 py-2 text-sm font-semibold text-muted-foreground">
            Local Results
          </div>
          {#each tracks as track, i (track.id)}
            <TrackItem
              index={i}
              isCurrentTrack={track.id === currentId}
              showAlbum
              {track}
            />
          {/each}
        {/if}

        {#each REMOTE_PROVIDERS as provider}
          {@const providerResults = remoteResultsByProvider[provider]}
          {#if providerResults.length > 0}
            <div
              class="px-4 py-2 text-sm font-semibold text-muted-foreground {tracks.length >
                0 || provider !== firstRemoteProvider
                ? 'mt-4'
                : ''}"
            >
              {getRemoteProviderLabel(provider)} Results
            </div>
            {#each providerResults as result (`${result.provider}:${result.providerItemId}`)}
              <RemoteTrackItem
                {result}
                isInQueue={remoteDownloadStore.isInQueue(
                  result.provider,
                  result.providerItemId,
                )}
                onDownload={handleRemoteTrackDownload}
              />
            {/each}
          {/if}
        {/each}

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
      mask: linear-gradient(to top, transparent, black 50%);
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
</style>

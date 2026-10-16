<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import {
    DiamondIcon,
    Disc3Icon,
    ListMusicIcon,
    MusicIcon,
    Search as SearchIcon,
    SquarePlayIcon,
    X as XIcon,
  } from "@lucide/svelte";
  import { fly } from "svelte/transition";
  import { backendCapabilities } from "$lib/backend/config";
  import { appearanceStore } from "$lib/stores/appearance.svelte";
  import type { LibrarySource, LibraryType } from "$lib/utils/artists";

  interface Props {
    searchQuery?: string;
    searchPlaceholder?: string;
    showSearch?: boolean;
    currentType?: LibraryType;
    currentSource?: LibrarySource;
    onTypeChange?: (type: LibraryType) => void;
    onSourceChange?: (source: LibrarySource) => void;
    showTypeFilters?: boolean;
    showSourceFilters?: boolean;
  }

  let {
    searchQuery = $bindable(""),
    searchPlaceholder = "Search...",
    showSearch = true,
    currentType = "",
    currentSource = "",
    onTypeChange = () => {},
    onSourceChange = () => {},
    showTypeFilters = true,
    showSourceFilters = true,
  }: Props = $props();

  let searchOpen = $state(false);

  const animDuration = $derived(appearanceStore.disableAnimations ? 0 : 200);
  const isEmpty = $derived(searchQuery.trim().length === 0);

  const typeFilters = [
    { id: "playlists" as const, label: "Playlists", icon: ListMusicIcon },
    { id: "albums" as const, label: "Albums", icon: Disc3Icon },
  ];

  const sourceFilters = [
    {
      id: "local" as const,
      enabled: backendCapabilities.playlists.enabled,
      label: "Local",
      icon: DiamondIcon,
    },
    {
      id: "youtube" as const,
      enabled:
        backendCapabilities.remoteProviders.youtube.search ||
        backendCapabilities.remoteProviders.youtube.import,
      label: "YouTube",
      icon: SquarePlayIcon,
    },
    {
      id: "tidal" as const,
      enabled:
        backendCapabilities.remoteProviders.tidal.search ||
        backendCapabilities.remoteProviders.tidal.import,
      label: "Tidal",
      icon: MusicIcon,
    },
  ].filter((filter) => filter.enabled);

  const showFilterRow = $derived(
    showTypeFilters || (showSourceFilters && sourceFilters.length > 0),
  );

  function openSearch() {
    searchOpen = true;
  }

  function closeSearch() {
    searchOpen = false;
    searchQuery = "";
  }
</script>

<div class="p-3">
  {#if !showFilterRow}
    {#if showSearch}
      <div
        class="flex-1 flex items-center relative rounded-3xl border border-muted-foreground/10
        {appearanceStore.disableBlur
          ? 'bg-muted'
          : 'bg-muted-foreground/10 dark:bg-muted/60 backdrop-blur-md'}"
      >
        <SearchIcon
          size={16}
          class="absolute transition-all text-muted-foreground shrink-0
          {!isEmpty ? 'opacity-0' : ''}"
          style="transform: translateX({!isEmpty ? '0' : '0.75rem'})"
        />
        <Input
          type="search"
          bind:value={searchQuery}
          placeholder={searchPlaceholder}
          class="flex-1 min-w-0 text-base h-auto bg-transparent! rounded-3xl border-0 transition-all p-3 outline-none font-mono placeholder:text-muted-foreground
            {!isEmpty ? '' : 'pl-9'}"
        />
        <Button
          variant="ghost"
          size="icon"
          class="text-muted-foreground absolute right-0
            {isEmpty ? 'opacity-0' : ''}"
          style="transform: translateX({isEmpty ? '0.5rem' : '0rem'})"
          onclick={() => (searchQuery = "")}
          aria-label="Clear search"
        >
          <XIcon />
        </Button>
      </div>
    {/if}
  {:else}
    <div class="grid">
      {#if !searchOpen}
        <div
          class="col-start-1 row-start-1 flex gap-4 overflow-x-scroll items-center hide-scrollbar border border-transparent"
          in:fly={{ x: 40, duration: animDuration }}
          out:fly={{ x: 10, duration: animDuration }}
        >
          {#if showSearch}
            <div class="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                class="flex items-center gap-1 shrink-0 h-11 rounded-2xl text-muted-foreground"
                onclick={openSearch}
              >
                <SearchIcon size={16} />
                Search
              </Button>
            </div>

            {#if showTypeFilters || (showSourceFilters && sourceFilters.length > 0)}
              <span class="rounded w-0.5 h-5 bg-border">&nbsp;</span>
            {/if}
          {/if}

          {#if showTypeFilters}
            <div class="flex gap-3">
              {#each typeFilters as t}
                <Button
                  variant="outline"
                  size="sm"
                  class="flex items-center gap-1 shrink-0 h-11 rounded-2xl
                    {currentType === t.id
                    ? 'bg-accent!'
                    : 'text-muted-foreground'}"
                  onclick={() => onTypeChange(currentType === t.id ? "" : t.id)}
                >
                  <t.icon size={16} />
                  {t.label}
                </Button>
              {/each}
            </div>

            {#if showSourceFilters && sourceFilters.length > 0}
              <span class="rounded w-0.5 h-5 bg-border">&nbsp;</span>
            {/if}
          {/if}

          {#if showSourceFilters}
            <div class="flex gap-3">
              {#each sourceFilters as s}
                <Button
                  variant="outline"
                  size="sm"
                  class="flex items-center gap-1 shrink-0 h-11 rounded-2xl
                    {currentSource === s.id
                    ? 'bg-accent!'
                    : 'text-muted-foreground'}"
                  onclick={() =>
                    onSourceChange(currentSource === s.id ? "" : s.id)}
                >
                  <s.icon size={16} />
                  {s.label}
                </Button>
              {/each}
            </div>
          {/if}
        </div>
      {:else}
        <div
          class="col-start-1 row-start-1 flex items-stretch gap-2"
          in:fly={{ x: -80, duration: animDuration }}
          out:fly={{ x: -80, duration: animDuration }}
        >
          <div
            class="flex-1 min-w-0 flex items-center relative rounded-2xl border border-muted-foreground/10
            {appearanceStore.disableBlur
              ? 'bg-muted'
              : 'bg-muted-foreground/10 dark:bg-muted/60 backdrop-blur-md'}"
          >
            <SearchIcon
              size={16}
              class="absolute transition-all text-muted-foreground shrink-0
              {!isEmpty ? 'opacity-0' : ''}"
              style="transform: translateX({!isEmpty ? '0' : '0.75rem'})"
            />
            <Input
              type="search"
              autofocus
              bind:value={searchQuery}
              placeholder={searchPlaceholder}
              onkeydown={(e) => e.key === "Escape" && closeSearch()}
              class="flex-1 min-w-0 text-base h-11 bg-transparent! rounded-2xl border-0 transition-all p-3 outline-none font-mono placeholder:text-muted-foreground
                {!isEmpty ? '' : 'pl-9'}"
            />
            <Button
              variant="ghost"
              size="icon"
              class="text-muted-foreground absolute right-0
                {isEmpty ? 'opacity-0' : ''}"
              style="transform: translateX({isEmpty ? '0.5rem' : '0rem'})"
              onclick={() => (searchQuery = "")}
              aria-label="Clear search"
              tabindex={isEmpty ? -1 : 0}
            >
              <XIcon />
            </Button>
          </div>
          <Button
            variant="outline"
            size="icon"
            class="transition-colors size-11 rounded-2xl
            {appearanceStore.disableBlur
              ? 'bg-muted hover:bg-muted-foreground/20'
              : 'bg-muted-foreground/10 dark:bg-muted/60 backdrop-blur-md hover:bg-muted-foreground/20!'}"
            onclick={closeSearch}
            aria-label="Close search"
            title="Close search"
          >
            <XIcon class="size-4 pointer-events-none shrink-0" />
          </Button>
        </div>
      {/if}
    </div>
  {/if}
</div>

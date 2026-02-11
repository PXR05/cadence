<script lang="ts">
  import SettingCard from "$lib/components/SettingCard.svelte";
  import SettingsHeader from "$lib/components/SettingsHeader.svelte";
  import { Button } from "$lib/components/ui/button";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { toast } from "svelte-sonner";
  import { appearanceStore } from "$lib/stores/appearance.svelte";
  import { cacheDb } from "$lib/db/cache";
  import { offlineDb } from "$lib/db/offline";
  import { historyDb } from "$lib/db/history";
  import { onMount, onDestroy } from "svelte";
  import {
    ArrowLeftIcon,
    DatabaseIcon,
    Trash2Icon,
    RefreshCwIcon,
    HardDriveIcon,
    AlertTriangleIcon,
    GlobeIcon,
    ImageIcon,
    PackageIcon,
  } from "@lucide/svelte";
  import { playerStore } from "$lib/stores/player.svelte";

  interface TableInfo {
    name: string;
    count: number;
    estimatedSize: string;
  }

  interface DatabaseInfo {
    name: string;
    displayName: string;
    tables: TableInfo[];
    totalSize: string;
  }

  let databases: DatabaseInfo[] = $state([]);
  let isLoadingDatabases = $state(true);
  let clearDialogOpen = $state(false);
  let clearTarget = $state<{
    type: "table" | "database" | "all" | "sw-cache";
    dbName?: string;
    tableName?: string;
    displayName: string;
    swCacheName?: string;
  } | null>(null);
  let isClearing = $state(false);

  interface SwCacheInfo {
    name: string;
    displayName: string;
    count: number;
    size: string;
    icon: typeof GlobeIcon;
  }

  let swCaches: SwCacheInfo[] = $state([]);
  let isLoadingSwCaches = $state(true);
  let swTotalSize = $state("0 B");
  let hasServiceWorker = $state(false);

  function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  async function estimateTableSize(table: any): Promise<number> {
    try {
      const items = await table.toArray();
      const jsonString = JSON.stringify(items);
      return new Blob([jsonString]).size;
    } catch {
      return 0;
    }
  }

  function handleSwMessage(event: MessageEvent) {
    if (event.data?.type === "CACHE_INFO_RESULT") {
      const cacheData = event.data.caches as Array<{
        name: string;
        count: number;
        size: number;
      }>;

      let total = 0;
      const cacheInfos: SwCacheInfo[] = [];

      for (const cache of cacheData) {
        total += cache.size;
        let displayName = cache.name;
        let icon = PackageIcon;

        if (cache.name.startsWith("cache-")) {
          displayName = "App Assets";
          icon = GlobeIcon;
        }

        cacheInfos.push({
          name: cache.name,
          displayName,
          count: cache.count,
          size: formatBytes(cache.size),
          icon,
        });
      }

      swCaches = cacheInfos;
      swTotalSize = formatBytes(total);
      isLoadingSwCaches = false;
    } else if (event.data?.type === "CACHE_CLEARED") {
      if (event.data.success) {
        loadSwCacheInfo();
      }
    }
  }

  async function loadSwCacheInfo() {
    if (!("serviceWorker" in navigator)) {
      hasServiceWorker = false;
      isLoadingSwCaches = false;
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration.active) {
        hasServiceWorker = true;
        isLoadingSwCaches = true;
        registration.active.postMessage({ type: "GET_CACHE_INFO" });
      } else {
        hasServiceWorker = false;
        isLoadingSwCaches = false;
      }
    } catch {
      hasServiceWorker = false;
      isLoadingSwCaches = false;
    }
  }

  async function clearSwCache(cacheName?: string) {
    if (!("serviceWorker" in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration.active) {
        registration.active.postMessage({
          type: "CLEAR_CACHE",
          cacheName,
        });
      }
    } catch (error) {
      console.error("Failed to clear service worker cache:", error);
      throw error;
    }
  }

  async function loadDatabaseInfo() {
    isLoadingDatabases = true;
    try {
      const dbInfos: DatabaseInfo[] = [];

      const cacheTables: TableInfo[] = [];
      const cacheTableConfigs = [
        { name: "tracks", table: cacheDb.tracks, displayName: "Tracks" },
        {
          name: "playlists",
          table: cacheDb.playlists,
          displayName: "Playlists",
        },
        {
          name: "playlistDetails",
          table: cacheDb.playlistDetails,
          displayName: "Playlist Details",
        },
        { name: "metadata", table: cacheDb.metadata, displayName: "Metadata" },
      ];

      let cacheTotalSize = 0;
      for (const config of cacheTableConfigs) {
        const count = await config.table.count();
        const size = await estimateTableSize(config.table);
        cacheTotalSize += size;
        cacheTables.push({
          name: config.name,
          count,
          estimatedSize: formatBytes(size),
        });
      }

      dbInfos.push({
        name: "CadenceCacheDB",
        displayName: "Cache",
        tables: cacheTables,
        totalSize: formatBytes(cacheTotalSize),
      });

      const offlineTables: TableInfo[] = [];
      const offlineTableConfigs = [
        {
          name: "tracks",
          table: offlineDb.tracks,
          displayName: "Offline Tracks",
        },
        {
          name: "images",
          table: offlineDb.images,
          displayName: "Cached Images",
        },
      ];

      let offlineTotalSize = 0;
      for (const config of offlineTableConfigs) {
        const count = await config.table.count();
        const size = await estimateTableSize(config.table);
        offlineTotalSize += size;
        offlineTables.push({
          name: config.name,
          count,
          estimatedSize: formatBytes(size),
        });
      }

      dbInfos.push({
        name: "CadenceOfflineDB",
        displayName: "Offline Storage",
        tables: offlineTables,
        totalSize: formatBytes(offlineTotalSize),
      });

      const historyTables: TableInfo[] = [];
      const historyCount = await historyDb.playHistory.count();
      const historySize = await estimateTableSize(historyDb.playHistory);

      historyTables.push({
        name: "playHistory",
        count: historyCount,
        estimatedSize: formatBytes(historySize),
      });

      dbInfos.push({
        name: "CadenceHistoryDB",
        displayName: "Play History",
        tables: historyTables,
        totalSize: formatBytes(historySize),
      });

      databases = dbInfos;
    } catch (error) {
      console.error("Failed to load database info:", error);
      toast.error("Failed to load database information");
    } finally {
      isLoadingDatabases = false;
    }
  }

  function openClearDialog(
    type: "table" | "database" | "sw-cache",
    dbName?: string,
    tableName?: string,
    swCacheName?: string,
  ) {
    let displayName = "";
    if (type === "database") {
      const db = databases.find((d) => d.name === dbName);
      displayName = db?.displayName || dbName || "";
    } else if (type === "sw-cache") {
      if (swCacheName) {
        const cache = swCaches.find((c) => c.name === swCacheName);
        displayName = cache?.displayName || swCacheName;
      } else {
        displayName = "all service worker caches";
      }
    } else {
      displayName = tableName || "";
    }
    clearTarget = { type, dbName, tableName, displayName, swCacheName };
    clearDialogOpen = true;
  }

  async function handleClearConfirm() {
    if (!clearTarget) return;

    isClearing = true;
    try {
      if (clearTarget.type === "all") {
        await cacheDb.tracks.clear();
        await cacheDb.playlists.clear();
        await cacheDb.playlistDetails.clear();
        await cacheDb.metadata.clear();
        await offlineDb.tracks.clear();
        await offlineDb.images.clear();
        await historyDb.playHistory.clear();
        toast.success("All cached data cleared");
      } else if (clearTarget.type === "database") {
        if (clearTarget.dbName === "CadenceCacheDB") {
          await cacheDb.tracks.clear();
          await cacheDb.playlists.clear();
          await cacheDb.playlistDetails.clear();
          await cacheDb.metadata.clear();
        } else if (clearTarget.dbName === "CadenceOfflineDB") {
          await offlineDb.tracks.clear();
          await offlineDb.images.clear();
        } else if (clearTarget.dbName === "CadenceHistoryDB") {
          await historyDb.playHistory.clear();
        }
        toast.success(`${clearTarget.displayName} cleared`);
      } else if (clearTarget.type === "table") {
        if (clearTarget.dbName === "CadenceCacheDB") {
          if (clearTarget.tableName === "tracks") await cacheDb.tracks.clear();
          else if (clearTarget.tableName === "playlists")
            await cacheDb.playlists.clear();
          else if (clearTarget.tableName === "playlistDetails")
            await cacheDb.playlistDetails.clear();
          else if (clearTarget.tableName === "metadata")
            await cacheDb.metadata.clear();
        } else if (clearTarget.dbName === "CadenceOfflineDB") {
          if (clearTarget.tableName === "tracks")
            await offlineDb.tracks.clear();
          else if (clearTarget.tableName === "images")
            await offlineDb.images.clear();
        } else if (clearTarget.dbName === "CadenceHistoryDB") {
          if (clearTarget.tableName === "playHistory")
            await historyDb.playHistory.clear();
        }
        toast.success(`${clearTarget.displayName} cleared`);
      } else if (clearTarget.type === "sw-cache") {
        await clearSwCache(clearTarget.swCacheName);
        toast.success(`${clearTarget.displayName} cleared`);
      }

      await loadDatabaseInfo();
    } catch (error) {
      console.error("Failed to clear data:", error);
      toast.error("Failed to clear data");
    } finally {
      isClearing = false;
      clearDialogOpen = false;
      clearTarget = null;
    }
  }

  onMount(() => {
    loadDatabaseInfo();
    loadSwCacheInfo();

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleSwMessage);
    }
  });

  onDestroy(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.removeEventListener("message", handleSwMessage);
    }
  });
</script>

<svelte:head>
  <title
    >{playerStore.isPlaying && playerStore.currentTrack?.metadata?.title
      ? playerStore.currentTrack.metadata?.title
      : "Local Storage"} | Cadence</title
  >
</svelte:head>

<SettingsHeader title="Local Storage" />

<div class="px-2 pb-4 pt-0.5 w-full space-y-2 mb-[50dvh]">
  <SettingCard icon={DatabaseIcon} title="Database Management">
    {#snippet headerActions()}
      <Button
        variant="ghost"
        size="icon"
        class="size-10"
        onclick={() => loadDatabaseInfo()}
        disabled={isLoadingDatabases}
        title="Refresh"
      >
        <RefreshCwIcon
          class="size-4 {isLoadingDatabases ? 'animate-spin' : ''}"
        />
      </Button>
    {/snippet}
    <div class="p-3 pt-1 space-y-4">
      <p class="text-sm text-muted-foreground">
        Manage cached data stored locally on your device
      </p>

      {#if isLoadingDatabases}
        <div class="flex items-center justify-center py-8">
          <RefreshCwIcon class="size-5 animate-spin text-muted-foreground" />
        </div>
      {:else}
        <div class="space-y-3">
          {#each databases as db}
            <div class="rounded-lg border bg-muted/30 overflow-hidden">
              <!-- Database Header -->
              <div
                class="flex items-center justify-between p-3 bg-muted/50 border-b"
              >
                <div class="flex items-center gap-2">
                  <HardDriveIcon class="size-4 text-muted-foreground" />
                  <span class="font-medium text-sm">{db.displayName}</span>
                  <span
                    class="text-xs text-muted-foreground bg-background/50 px-1.5 py-0.5 rounded"
                  >
                    {db.totalSize}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  class="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  onclick={() => openClearDialog("database", db.name)}
                >
                  <Trash2Icon class="size-3 mr-1" />
                  Clear All
                </Button>
              </div>

              <!-- Tables -->
              <div class="divide-y divide-border/50">
                {#each db.tables as table}
                  <div
                    class="flex items-center justify-between p-2.5 px-3 hover:bg-muted/30 transition-colors"
                  >
                    <div class="flex items-center gap-3">
                      <div class="flex flex-col">
                        <span class="text-sm capitalize">
                          {table.name.replace(/([A-Z])/g, " $1").trim()}
                        </span>
                        <div class="flex items-center gap-2">
                          <span class="text-xs text-muted-foreground">
                            {table.count}
                            {table.count === 1 ? "item" : "items"}
                          </span>
                          <span class="text-xs text-muted-foreground">•</span>
                          <span class="text-xs text-muted-foreground">
                            {table.estimatedSize}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      class="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onclick={() =>
                        openClearDialog("table", db.name, table.name)}
                      disabled={table.count === 0}
                    >
                      <Trash2Icon class="size-3.5" />
                    </Button>
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </SettingCard>

  <!-- Service Worker Cache Management -->
  {#if hasServiceWorker}
    <SettingCard icon={GlobeIcon} title="Service Worker Cache">
      {#snippet headerActions()}
        <Button
          variant="ghost"
          size="icon"
          class="size-10"
          onclick={() => loadSwCacheInfo()}
          disabled={isLoadingSwCaches}
          title="Refresh"
        >
          <RefreshCwIcon
            class="size-4 {isLoadingSwCaches ? 'animate-spin' : ''}"
          />
        </Button>
      {/snippet}
      <div class="p-3 pt-1 space-y-4">
        <p class="text-sm text-muted-foreground">
          Manage browser cache for app assets and images
        </p>

        {#if isLoadingSwCaches}
          <div class="flex items-center justify-center py-8">
            <RefreshCwIcon class="size-5 animate-spin text-muted-foreground" />
          </div>
        {:else}
          <div class="rounded-lg border bg-muted/30 overflow-hidden">
            <!-- Cache Header -->
            <div
              class="flex items-center justify-between p-3 bg-muted/50 border-b"
            >
              <div class="flex items-center gap-2">
                <GlobeIcon class="size-4 text-muted-foreground" />
                <span class="font-medium text-sm">Browser Cache</span>
                <span
                  class="text-xs text-muted-foreground bg-background/50 px-1.5 py-0.5 rounded"
                >
                  {swTotalSize}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                class="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                onclick={() => openClearDialog("sw-cache")}
                disabled={swCaches.length === 0}
              >
                <Trash2Icon class="size-3 mr-1" />
                Clear All
              </Button>
            </div>

            <!-- Cache Items -->
            <div class="divide-y divide-border/50">
              {#each swCaches as cache}
                {@const IconComponent = cache.icon}
                <div
                  class="flex items-center justify-between p-2.5 px-3 hover:bg-muted/30 transition-colors"
                >
                  <div class="flex items-center gap-3">
                    <IconComponent class="size-4 text-muted-foreground" />
                    <div class="flex flex-col">
                      <span class="text-sm">{cache.displayName}</span>
                      <div class="flex items-center gap-2">
                        <span class="text-xs text-muted-foreground">
                          {cache.count}
                          {cache.count === 1 ? "item" : "items"}
                        </span>
                        <span class="text-xs text-muted-foreground">•</span>
                        <span class="text-xs text-muted-foreground">
                          {cache.size}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    class="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onclick={() =>
                      openClearDialog(
                        "sw-cache",
                        undefined,
                        undefined,
                        cache.name,
                      )}
                    disabled={cache.count === 0}
                  >
                    <Trash2Icon class="size-3.5" />
                  </Button>
                </div>
              {/each}
              {#if swCaches.length === 0}
                <div class="p-4 text-center text-sm text-muted-foreground">
                  No cached data
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    </SettingCard>
  {/if}
</div>

<AlertDialog.Root bind:open={clearDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <div class="flex items-center gap-3 mb-2">
        <div
          class="size-10 rounded-full bg-destructive/10 flex items-center justify-center"
        >
          <AlertTriangleIcon class="size-5 text-destructive" />
        </div>
        <AlertDialog.Title>Clear {clearTarget?.displayName}?</AlertDialog.Title>
      </div>
      <AlertDialog.Description>
        {#if clearTarget?.type === "all"}
          This will permanently delete all cached data, including offline
          tracks, playlists, and play history. You will need to re-download
          content for offline use. This action cannot be undone.
        {:else if clearTarget?.type === "database"}
          This will permanently delete all data in {clearTarget?.displayName}.
          {#if clearTarget?.dbName === "CadenceOfflineDB"}
            You will need to re-download tracks and playlists for offline use.
          {:else if clearTarget?.dbName === "CadenceHistoryDB"}
            Your play history will be lost and cannot be recovered.
          {:else}
            Cached data will be refreshed from the server on next use.
          {/if}
          This action cannot be undone.
        {:else if clearTarget?.type === "sw-cache"}
          {#if clearTarget?.swCacheName === "image-cache"}
            This will clear all cached album artwork and images. Images will be
            re-downloaded as needed.
          {:else if clearTarget?.swCacheName?.startsWith("cache-")}
            This will clear the app's cached assets. The page may reload to
            fetch fresh assets.
          {:else if !clearTarget?.swCacheName}
            This will clear all browser caches including images and app assets.
            Content will be re-downloaded as needed.
          {:else}
            This will clear the selected cache. Content will be re-downloaded as
            needed.
          {/if}
        {:else}
          This will permanently delete all items in this table. This action
          cannot be undone.
        {/if}
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel disabled={isClearing}>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        onclick={handleClearConfirm}
        disabled={isClearing}
      >
        {#if isClearing}
          Clearing...
        {:else}
          Clear Data
        {/if}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

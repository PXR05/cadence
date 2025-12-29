<script lang="ts">
  import SettingCard from "$lib/components/SettingCard.svelte";
  import { Button } from "$lib/components/ui/button";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { toast } from "svelte-sonner";
  import { appearanceStore } from "$lib/stores/appearance.svelte";
  import { cacheDb } from "$lib/db/cache";
  import { offlineDb } from "$lib/db/offline";
  import { historyDb } from "$lib/db/history";
  import { onMount } from "svelte";
  import {
    ArrowLeftIcon,
    DatabaseIcon,
    Trash2Icon,
    RefreshCwIcon,
    HardDriveIcon,
    AlertTriangleIcon,
  } from "@lucide/svelte";

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
    type: "table" | "database" | "all";
    dbName?: string;
    tableName?: string;
    displayName: string;
  } | null>(null);
  let isClearing = $state(false);

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
          name: "playlists",
          table: offlineDb.playlists,
          displayName: "Offline Playlists",
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
    type: "table" | "database" | "all",
    dbName?: string,
    tableName?: string
  ) {
    let displayName = "";
    if (type === "all") {
      displayName = "all cached data";
    } else if (type === "database") {
      const db = databases.find((d) => d.name === dbName);
      displayName = db?.displayName || dbName || "";
    } else {
      displayName = tableName || "";
    }
    clearTarget = { type, dbName, tableName, displayName };
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
        await offlineDb.playlists.clear();
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
          await offlineDb.playlists.clear();
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
          else if (clearTarget.tableName === "playlists")
            await offlineDb.playlists.clear();
        } else if (clearTarget.dbName === "CadenceHistoryDB") {
          if (clearTarget.tableName === "playHistory")
            await historyDb.playHistory.clear();
        }
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
  });
</script>

<svelte:head>
  <title>Local Storage | Settings | Cadence</title>
</svelte:head>

<!-- Header -->
<div class="absolute top-0 w-full p-1.5 md:p-2 z-50">
  <div
    class="flex-1 flex items-center flex-row gap-1.5 md:gap-2 rounded-xl p-1.5 md:p-2 border-input/15 {appearanceStore.disableBlur
      ? 'bg-muted'
      : 'bg-muted-foreground/10 dark:bg-muted/50 backdrop-blur-md'}"
  >
    <Button
      variant="ghost"
      size="icon"
      class="size-10"
      onclick={() => history.back()}
    >
      <ArrowLeftIcon />
    </Button>
    <h1 class="flex-1 flex items-center gap-2 font-semibold truncate text-2xl">
      Local Storage
    </h1>
  </div>
</div>

<ScrollArea class="h-dvh">
  <div class="px-2 pb-4 pt-17 md:pt-18.5 h-full w-full space-y-2 mb-[50dvh]">
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

          <!-- Clear All Button -->
          <div class="pt-2 border-t">
            <Button
              variant="outline"
              class="w-full text-destructive hover:text-destructive hover:bg-destructive/10 hover:border-destructive/50"
              onclick={() => openClearDialog("all")}
            >
              <Trash2Icon class="size-4 mr-2" />
              Clear All Cached Data
            </Button>
          </div>
        {/if}
      </div>
    </SettingCard>
  </div>
</ScrollArea>

<!-- Clear Cache Confirmation Dialog -->
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

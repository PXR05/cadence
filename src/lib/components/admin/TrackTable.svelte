<script lang="ts">
  import { formatFileSize, formatDate } from "$lib/utils/format";
  import {
    Loader as LoaderIcon,
    Music2 as MusicIcon,
    Trash2 as Trash2Icon,
  } from "@lucide/svelte";
  import { TableCell, TableHead, TableRow } from "$lib/components/ui/table";
  import { Button } from "../ui/button";
  import type { AudioFile } from "$lib/schemas";

  interface Props {
    tracks: AudioFile[];
    loading: boolean;
    initialLoading: boolean;
    onDelete: (track: AudioFile) => void;
  }

  let { tracks, loading, initialLoading, onDelete }: Props = $props();

  function getDisplayName(track: AudioFile): string {
    return track.metadata?.title || track.filename;
  }

  function getDisplayArtist(track: AudioFile): string {
    return track.metadata?.artist || "-";
  }
</script>

<div
  class="relative min-h-80 overflow-hidden rounded-2xl border bg-background md:bg-card"
  aria-busy={loading}
>
  {#if loading && !initialLoading}
    <div
      class="absolute right-3 top-3 z-20 grid size-8 place-items-center rounded-full border bg-background/90 shadow-sm backdrop-blur-sm"
      aria-label="Refreshing tracks"
    >
      <LoaderIcon class="size-4 animate-spin text-muted-foreground" />
    </div>
  {/if}

  {#if initialLoading}
    <div class="divide-y" aria-label="Loading tracks">
      {#each Array(6) as _}
        <div class="flex items-center gap-3 p-4">
          <div class="size-10 shrink-0 animate-pulse rounded-xl bg-muted"></div>
          <div class="flex-1 space-y-2">
            <div class="h-3.5 w-2/5 animate-pulse rounded bg-muted"></div>
            <div class="h-3 w-1/4 animate-pulse rounded bg-muted"></div>
          </div>
        </div>
      {/each}
    </div>
  {:else if tracks.length === 0}
    <div class="flex min-h-80 flex-col items-center justify-center gap-3 p-8 text-center">
      <div class="grid size-12 place-items-center rounded-2xl bg-muted">
        <MusicIcon class="size-6 text-muted-foreground" />
      </div>
      <div>
        <p class="font-medium">No tracks found</p>
        <p class="mt-1 text-sm text-muted-foreground">
          Tracks added to the server will appear here.
        </p>
      </div>
    </div>
  {:else}
    <div
      class="hidden overflow-x-auto transition-opacity md:block {loading
        ? 'pointer-events-none opacity-50'
        : ''}"
    >
      <table class="w-full caption-bottom text-sm">
        <thead class="border-b bg-muted/35 [&_tr]:border-b-0">
          <TableRow class="hover:bg-transparent">
            <TableHead class="h-11 pl-4">Track</TableHead>
            <TableHead>Artist</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Uploaded</TableHead>
            <TableHead class="w-16 pr-4 text-right">Action</TableHead>
          </TableRow>
        </thead>
        <tbody class="[&_tr:last-child]:border-0">
          {#each tracks as track}
            <TableRow class="group">
              <TableCell class="max-w-72 pl-4">
                <div class="flex items-center gap-3">
                  <div
                    class="grid size-9 shrink-0 place-items-center rounded-lg bg-muted"
                  >
                    <MusicIcon class="size-4 text-muted-foreground" />
                  </div>
                  <span class="truncate font-medium" title={getDisplayName(track)}>
                    {getDisplayName(track)}
                  </span>
                </div>
              </TableCell>
              <TableCell class="max-w-48 truncate text-muted-foreground">
                {getDisplayArtist(track)}
              </TableCell>
              <TableCell class="whitespace-nowrap text-muted-foreground">
                {formatFileSize(track.size)}
              </TableCell>
              <TableCell class="whitespace-nowrap text-muted-foreground">
                {formatDate(track.uploadedAt)}
              </TableCell>
              <TableCell class="pr-4 text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  class="size-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onclick={() => onDelete(track)}
                  disabled={loading}
                  aria-label={`Delete ${getDisplayName(track)}`}
                  title="Delete track"
                >
                  <Trash2Icon class="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          {/each}
        </tbody>
      </table>
    </div>

    <div
      class="divide-y transition-opacity md:hidden {loading
        ? 'pointer-events-none opacity-50'
        : ''}"
    >
      {#each tracks as track}
        <article class="flex items-center gap-3 p-4">
          <div class="grid size-11 shrink-0 place-items-center rounded-xl bg-muted">
            <MusicIcon class="size-5 text-muted-foreground" />
          </div>
          <div class="min-w-0 flex-1">
            <h3 class="truncate font-medium">{getDisplayName(track)}</h3>
            <p class="truncate text-sm text-muted-foreground">
              {getDisplayArtist(track)}
            </p>
            <p class="mt-1 text-xs text-muted-foreground">
              {formatFileSize(track.size)} · {formatDate(track.uploadedAt)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            class="size-9 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onclick={() => onDelete(track)}
            disabled={loading}
            aria-label={`Delete ${getDisplayName(track)}`}
          >
            <Trash2Icon class="size-4" />
          </Button>
        </article>
      {/each}
    </div>
  {/if}
</div>

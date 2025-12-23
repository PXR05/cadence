<script lang="ts">
  import { formatFileSize, formatDate } from "$lib/utils/format";
  import { LoaderIcon, Trash2Icon } from "@lucide/svelte";
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
  class="border rounded-xl relative flex flex-col h-[530px] overflow-hidden"
>
  <div class="overflow-auto flex-1">
    <table class="w-full caption-bottom text-sm">
      <thead class="sticky top-0 bg-background z-10 border-b [&_tr]:border-b">
        <TableRow>
          <TableHead class="pl-4">Title</TableHead>
          <TableHead>Artist</TableHead>
          <TableHead>Size</TableHead>
          <TableHead>Uploaded</TableHead>
          <TableHead class="w-24 pr-4"></TableHead>
        </TableRow>
      </thead>
      <tbody
        class={loading && !initialLoading
          ? "blur-sm opacity-50 pointer-events-none [&_tr:last-child]:border-0"
          : "[&_tr:last-child]:border-0"}
      >
        {#if initialLoading}
          <TableRow>
            <TableCell colspan={5} class="text-center py-8">
              <LoaderIcon
                class="animate-spin mx-auto text-muted-foreground"
                size={24}
              />
            </TableCell>
          </TableRow>
        {:else if tracks.length === 0}
          <TableRow>
            <TableCell
              colspan={5}
              class="text-center py-8 text-muted-foreground"
            >
              No tracks found
            </TableCell>
          </TableRow>
        {:else}
          {#each tracks as track}
            <TableRow>
              <TableCell class="font-medium pl-4"
                >{getDisplayName(track)}</TableCell
              >
              <TableCell>{getDisplayArtist(track)}</TableCell>
              <TableCell>{formatFileSize(track.size)}</TableCell>
              <TableCell>{formatDate(track.uploadedAt)}</TableCell>
              <TableCell class="pr-4">
                <Button
                  variant="link"
                  size="sm"
                  class="p-0!"
                  onclick={() => onDelete(track)}
                  disabled={loading}
                >
                  <Trash2Icon size={14} />
                </Button>
              </TableCell>
            </TableRow>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
</div>

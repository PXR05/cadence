<script lang="ts">
  import { toast } from "svelte-sonner";
  import { Disc3 as Disc3Icon } from "@lucide/svelte";
  import { fetchTracks, deleteTrack } from "$lib/backend/services/audio";
  import { tracksStore } from "$lib/stores/tracks.svelte";
  import TrackTable from "./TrackTable.svelte";
  import DeleteTrackDialog from "./DeleteTrackDialog.svelte";
  import TrackPagination from "./TrackPagination.svelte";
  import type { AudioFile } from "$lib/schemas";
  import { onMount } from "svelte";

  let tracksLoading = $state(false);
  let tracksInitialLoading = $state(true);
  let tracks: AudioFile[] = $state([]);
  let tracksCurrentPage = $state(1);
  let tracksTotalPages = $state(1);
  let deleteTrackDialogOpen = $state(false);
  let selectedTrack = $state<AudioFile | null>(null);

  function setMessage(type: "error" | "success", message: string) {
    if (type === "error") {
      toast.error(message);
    } else {
      toast.success(message);
    }
  }

  async function loadTracks(page: number = 1) {
    tracksLoading = true;
    try {
      const result = await fetchTracks({ page, limit: 10 });
      tracks = result.tracks;
      tracksCurrentPage = result.currentPage;
      tracksTotalPages = result.totalPages ?? 1;
    } catch {
      setMessage("error", "Failed to load tracks");
    } finally {
      tracksLoading = false;
      tracksInitialLoading = false;
    }
  }

  onMount(() => {
    loadTracks();
  });

  function openDeleteTrackDialog(track: AudioFile) {
    selectedTrack = track;
    deleteTrackDialogOpen = true;
  }

  async function confirmDeleteTrack() {
    if (!selectedTrack) return;

    deleteTrackDialogOpen = false;
    tracksLoading = true;

    try {
      await deleteTrack(selectedTrack.id);
      await loadTracks(tracksCurrentPage);
      tracksStore.loadAllTracks(true);
      setMessage("success", "Track deleted");
    } catch {
      setMessage("error", "Failed to delete track");
    } finally {
      tracksLoading = false;
      selectedTrack = null;
    }
  }

</script>

<section class="space-y-3" aria-labelledby="track-management-title">
  <div class="flex items-center gap-3 px-1 py-2">
    <div class="grid size-10 shrink-0 place-items-center rounded-xl bg-muted">
      <Disc3Icon class="size-5 text-muted-foreground" />
    </div>
    <div class="min-w-0">
      <div class="flex items-center gap-2">
        <h2 id="track-management-title" class="font-semibold">
          Music library
        </h2>
        {#if !tracksInitialLoading}
          <span
            class="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground"
          >
            {tracks.length} shown
          </span>
        {/if}
      </div>
      <p class="truncate text-sm text-muted-foreground">
        Review and remove tracks stored on the server
      </p>
    </div>
  </div>

  <TrackTable
    {tracks}
    loading={tracksLoading}
    initialLoading={tracksInitialLoading}
    onDelete={openDeleteTrackDialog}
  />

  {#if tracksTotalPages > 1}
    <TrackPagination
      currentPage={tracksCurrentPage}
      totalPages={tracksTotalPages}
      loading={tracksLoading}
      onPageChange={loadTracks}
    />
  {/if}
</section>

<DeleteTrackDialog
  bind:open={deleteTrackDialogOpen}
  trackName={selectedTrack?.metadata?.title ||
    selectedTrack?.filename ||
    "this track"}
  onConfirm={confirmDeleteTrack}
/>

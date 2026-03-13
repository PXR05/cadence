<script lang="ts">
  import { toast } from "svelte-sonner";
  import { MusicIcon } from "@lucide/svelte";
  import { Button } from "$lib/components/ui/button";
  import { fetchTracks, deleteTrack } from "$lib/api";
  import { tracksStore } from "$lib/stores/tracks.svelte";
  import { remoteDownloadStore } from "$lib/stores/remoteDownload.svelte";
  import TrackTable from "./TrackTable.svelte";
  import DeleteTrackDialog from "./DeleteTrackDialog.svelte";
  import UploadTrackDialog from "./UploadTrackDialog.svelte";
  import TrackPagination from "./TrackPagination.svelte";
  import type { AudioFile, RemoteProvider } from "$lib/schemas";
  import { getRemoteProviderLabel } from "$lib/utils/remote";
  import { onMount } from "svelte";

  let tracksLoading = $state(false);
  let tracksInitialLoading = $state(true);
  let tracks: AudioFile[] = $state([]);
  let tracksCurrentPage = $state(1);
  let tracksTotalPages = $state(1);
  let deleteTrackDialogOpen = $state(false);
  let uploadTrackDialogOpen = $state(false);
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

  function openAddTrackDialog() {
    uploadTrackDialogOpen = true;
  }

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

  async function handleUploadComplete(
    successCount: number,
    totalCount: number,
  ) {
    setMessage("success", `Uploaded ${successCount}/${totalCount} files`);
    await loadTracks(tracksCurrentPage);
    tracksStore.loadAllTracks(true);
  }

  function handleUploadError(error: string) {
    setMessage("error", error);
  }

  async function handleRemoteUpload(provider: RemoteProvider, url: string) {
    const providerLabel = getRemoteProviderLabel(provider);

    try {
      await remoteDownloadStore.downloadFromUrl(provider, url);
      setMessage("success", `Downloaded from ${providerLabel}`);
      await loadTracks(tracksCurrentPage);
      tracksStore.loadAllTracks(true);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : `Failed to download from ${providerLabel}`;
      setMessage("error", errorMessage);
    }
  }
</script>

<div class="flex justify-between items-center gap-2 w-full">
  <h2 class="text-2xl font-semibold p-2">Tracks</h2>
  <Button onclick={openAddTrackDialog} class="gap-2">
    <MusicIcon size={18} />
    Add Track
  </Button>
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

<UploadTrackDialog
  bind:open={uploadTrackDialogOpen}
  loading={tracksLoading}
  onUploadComplete={handleUploadComplete}
  onUploadError={handleUploadError}
  onRemoteUpload={handleRemoteUpload}
/>

<DeleteTrackDialog
  bind:open={deleteTrackDialogOpen}
  trackName={selectedTrack?.metadata?.title ||
    selectedTrack?.filename ||
    "this track"}
  onConfirm={confirmDeleteTrack}
/>

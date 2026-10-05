<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import { createPlaylist } from "$lib/backend/services/playlists";
  import { Input } from "../ui/input";
  import {
    Link as LinkIcon,
    Loader as LoaderIcon,
    List as ListIcon,
    Folder as FolderIcon,
  } from "@lucide/svelte";
  import { tracksStore } from "$lib/stores/tracks.svelte";
  import { remoteDownloadStore } from "$lib/stores/remoteDownload.svelte";
  import {
    detectRemoteProviderFromUrl,
    getRemoteProviderLabel,
    isValidRemoteImportUrl,
  } from "$lib/utils/remote";
  import { backendCapabilities } from "$lib/backend/config";
  import {
    getFolderAudioFiles,
    getFolderCoverImage,
    getFolderName,
  } from "$lib/utils/folderUpload";
  import {
    uploadFolderToPlaylist,
    type FolderTrackFailure,
  } from "$lib/backend/services/folderPlaylist";
  import { toast } from "svelte-sonner";
  import { authStore } from "$lib/stores/auth.svelte";

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated?: () => void | Promise<void>;
  }

  let { open, onOpenChange, onCreated }: Props = $props();

  let playlistName = $state("");
  let remoteUrl = $state("");
  let loading = $state(false);
  let error = $state("");
  let mode = $state<"manual" | "remote" | "folder">("manual");
  let folderFiles = $state<File[]>([]);
  let folderCoverImage = $state<File | undefined>(undefined);
  let folderName = $state("");
  let skippedFiles = $state(0);
  let folderPlaylistId = $state<string | null>(null);
  let failures = $state<FolderTrackFailure[]>([]);
  let addedCount = $state(0);
  let currentFileIndex = $state(0);
  let currentFileName = $state("");
  let currentFileProgress = $state(0);
  let currentBatchSize = $state(0);
  const canImportFolder =
    backendCapabilities.uploads.file &&
    backendCapabilities.playlists.create &&
    backendCapabilities.playlists.manageItems;
  const canUploadFolder = $derived(authStore.canUploadFiles);
  const canImportRemote =
    backendCapabilities.uploads.remote &&
    (backendCapabilities.remoteProviders.youtube.import ||
      backendCapabilities.remoteProviders.tidal.import);

  const SUPPORTED_IMPORT_SOURCES =
    "Supported sources:\n- YouTube playlist links\n- Tidal playlist or album links";

  async function handleCreateManual() {
    if (loading || !playlistName.trim()) return;

    loading = true;
    error = "";

    try {
      await createPlaylist({ name: playlistName.trim() });
      void Promise.resolve()
        .then(() => onCreated?.())
        .catch(() => {
          toast.warning(
            "Playlist saved. Refresh the library to see the latest changes.",
          );
        });
      resetDialog();
      onOpenChange(false);
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to create playlist";
      console.error("Failed to create playlist:", err);
    } finally {
      loading = false;
    }
  }

  function handleFolderChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = "";
    if (!files.length) return;
    folderFiles = getFolderAudioFiles(files);
    folderCoverImage = getFolderCoverImage(files);
    folderName = getFolderName(files);
    playlistName = folderName;
    skippedFiles = files.length - folderFiles.length - (folderCoverImage ? 1 : 0);
    error = folderFiles.length
      ? ""
      : "This folder contains no supported audio files.";
    failures = [];
    addedCount = 0;
  }

  async function handleCreateFromFolder() {
    if (
      loading ||
      !canImportFolder ||
      !canUploadFolder ||
      !playlistName.trim() ||
      !folderFiles.length
    )
      return;
    loading = true;
    error = "";
    currentFileIndex = 0;
    currentFileProgress = 0;
    const tracks = folderPlaylistId
      ? failures
      : folderFiles.map((file) => ({ file }));
    currentBatchSize = tracks.length;

    try {
      if (!folderPlaylistId) {
        const result = await createPlaylist({
          name: playlistName.trim(),
          coverImage: folderCoverImage,
        });
        if (!result.success)
          throw new Error(result.message || "Failed to create playlist");
        folderPlaylistId = result.playlist.id;
      }
      const result = await uploadFolderToPlaylist(
        folderPlaylistId,
        tracks,
        (index, file, percent) => {
          currentFileIndex = index;
          currentFileName = file.webkitRelativePath || file.name;
          currentFileProgress = percent;
        },
      );
      addedCount += result.addedCount;
      failures = result.failures;

      const refreshes = await Promise.allSettled([
        tracksStore.loadAllTracks(true),
        Promise.resolve().then(() => onCreated?.()),
      ]);
      if (refreshes.some((result) => result.status === "rejected")) {
        toast.warning(
          "Playlist saved. Refresh the library to see the latest changes.",
        );
      }
      if (failures.length) {
        error = `Added ${addedCount} of ${folderFiles.length} tracks. ${failures.length} failed; retry them below.`;
      } else {
        toast.success(
          `Created "${playlistName.trim()}" with ${addedCount} tracks`,
        );
        resetDialog();
        onOpenChange(false);
      }
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to import folder";
    } finally {
      loading = false;
    }
  }

  async function handleCreateFromRemote(e: Event) {
    e.preventDefault();
    const url = remoteUrl.trim();

    if (!url) return;

    const provider = detectRemoteProviderFromUrl(url);

    if (!provider) {
      error =
        "Unsupported URL. Supported sources are YouTube playlists and Tidal playlists/albums.";
      return;
    }

    if (!backendCapabilities.remoteProviders[provider].import) {
      error = `${getRemoteProviderLabel(provider)} imports are disabled.`;
      return;
    }

    if (!isValidRemoteImportUrl(provider, url)) {
      const providerLabel = getRemoteProviderLabel(provider);
      error =
        provider === "youtube"
          ? `Please enter a valid ${providerLabel} playlist URL.`
          : `Please enter a valid ${providerLabel} playlist or album URL.`;
      return;
    }

    loading = true;
    error = "";

    try {
      resetDialog();
      onOpenChange(false);
      await remoteDownloadStore.addUrlToQueue(provider, url);
      tracksStore.loadAllTracks(true);
      onCreated?.();
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to import playlist";
      console.error("Failed to import playlist:", err);
    } finally {
      loading = false;
    }
  }

  function resetDialog() {
    playlistName = "";
    remoteUrl = "";
    error = "";
    mode = "manual";
    folderFiles = [];
    folderCoverImage = undefined;
    folderName = "";
    skippedFiles = 0;
    folderPlaylistId = null;
    failures = [];
    addedCount = 0;
    currentFileIndex = 0;
    currentFileName = "";
    currentFileProgress = 0;
    currentBatchSize = 0;
  }

  function handleOpenChange(isOpen: boolean) {
    if (loading) return;
    if (!isOpen) {
      resetDialog();
    }
    onOpenChange(isOpen);
  }

  const isManualValid = $derived(playlistName.trim() && !loading);
  const isRemoteValid = $derived(remoteUrl.trim() && !loading);
  const isFolderValid = $derived(
    canUploadFolder &&
      playlistName.trim() &&
      folderFiles.length > 0 &&
      !loading &&
      (!folderPlaylistId || failures.length > 0),
  );
  const folderProgress = $derived(
    currentBatchSize
      ? Math.max(
          0,
          Math.min(
            100,
            ((currentFileIndex - 1) * 100 + currentFileProgress) /
              currentBatchSize,
          ),
        )
      : 0,
  );
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
  <Dialog.Content
    class="sm:max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto"
    showCloseButton={!loading}
    onEscapeKeydown={(event) => {
      if (loading) event.preventDefault();
    }}
    onInteractOutside={(event) => {
      if (loading) event.preventDefault();
    }}
  >
    <Dialog.Header>
      <Dialog.Title>Create Playlist</Dialog.Title>
    </Dialog.Header>

    <div class="space-y-4">
      {#if canImportRemote || canImportFolder}
        <div class="flex gap-2">
          <Button
            variant={mode === "manual" ? "default" : "outline"}
            onclick={() => {
              mode = "manual";
              error = "";
            }}
            class="flex-1 gap-2"
            disabled={loading || !!folderPlaylistId}
          >
            <ListIcon size={16} />
            Manual
          </Button>
          {#if canImportFolder}
            <Button
              variant={mode === "folder" ? "default" : "outline"}
              onclick={() => {
                mode = "folder";
                error = "";
              }}
              class="flex-1 gap-2"
              disabled={loading || !!folderPlaylistId}
            >
              <FolderIcon size={16} />
              Folder
            </Button>
          {/if}
          {#if canImportRemote}
            <Button
              variant={mode === "remote" ? "default" : "outline"}
              onclick={() => {
                mode = "remote";
                error = "";
              }}
              class="flex-1 gap-2"
              disabled={loading || !!folderPlaylistId}
            >
              <LinkIcon size={16} />
              Remote
            </Button>
          {/if}
        </div>
      {/if}

      {#if mode === "manual"}
        <div>
          <label for="playlist-name" class="text-sm font-medium block mb-2">
            Playlist Name
          </label>
          <Input
            id="playlist-name"
            type="text"
            bind:value={playlistName}
            placeholder="My Playlist"
            class="w-full px-3 py-2 text-sm"
            disabled={loading}
            onkeydown={(e) => {
              if (e.key === "Enter" && isManualValid) {
                handleCreateManual();
              }
            }}
          />
        </div>
      {:else if mode === "folder" && canImportFolder}
        <div class="space-y-3">
          {#if !canUploadFolder}
            <p class="text-sm text-muted-foreground" role="status">
              Folder uploads require an administrator account on this server.
            </p>
          {/if}
          <div class="space-y-2">
            <label for="playlist-folder" class="text-sm font-medium block"
              >Select Audio Folder</label
            >
            <Input
              id="playlist-folder"
              type="file"
              webkitdirectory
              multiple
              onchange={handleFolderChange}
              disabled={loading || !!folderPlaylistId || !canUploadFolder}
            />
            <p class="text-sm text-muted-foreground">
              Includes audio files in subfolders, sorted by filename. Supported
              formats: MP3, Opus, WAV, FLAC, M4A, AAC, and OGG.
            </p>
            {#if folderFiles.length}
              <p class="text-sm">
                {folderName}: {folderFiles.length} audio file(s)
                {#if skippedFiles}
                  · {skippedFiles} other file(s) skipped{/if}
              </p>
              {#if folderCoverImage}
                <p class="text-sm text-muted-foreground">
                  Playlist image: {folderCoverImage.webkitRelativePath || folderCoverImage.name}
                </p>
              {/if}
            {/if}
          </div>
          <div class="space-y-2">
            <label for="folder-playlist-name" class="text-sm font-medium block"
              >Playlist Name</label
            >
            <Input
              id="folder-playlist-name"
              bind:value={playlistName}
              placeholder="Choose a folder first"
              disabled={loading || !!folderPlaylistId}
            />
          </div>
          {#if loading}
            <div class="space-y-2" role="status">
              <p class="text-sm truncate">
                {#if currentFileIndex}
                  Uploading {currentFileIndex}/{currentBatchSize}: {currentFileName}
                {:else}
                  Creating playlist...
                {/if}
              </p>
              <div
                role="progressbar"
                aria-label="Folder upload progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(folderProgress)}
                class="h-1.5 bg-secondary overflow-hidden rounded"
              >
                <div
                  class="h-full bg-primary transition-all rounded"
                  style:width={`${folderProgress}%`}
                ></div>
              </div>
            </div>
          {/if}
        </div>
      {:else if mode === "remote" && canImportRemote}
        <div>
          <div class="flex items-center gap-2 mb-2">
            <label for="remote-url" class="text-sm font-medium block">
              Remote Playlist URL
            </label>
            <span
              title={SUPPORTED_IMPORT_SOURCES}
              class="inline-flex items-center justify-center size-4 rounded-full border border-muted-foreground/40 text-[10px] font-semibold text-muted-foreground cursor-help"
              aria-label="Supported import sources"
            >
              i
            </span>
          </div>
          <Input
            id="remote-url"
            type="url"
            bind:value={remoteUrl}
            placeholder="https://youtube.com/playlist?... or https://tidal.com/..."
            class="w-full px-3 py-2 text-sm"
            disabled={loading}
            onkeydown={(e) => {
              if (e.key === "Enter" && isRemoteValid) {
                handleCreateFromRemote(e);
              }
            }}
          />
        </div>
      {/if}

      {#if error}
        <p class="text-sm text-destructive" role="alert">{error}</p>
      {/if}
      {#if mode === "folder" && failures.length && !loading}
        <ul
          class="max-h-32 overflow-y-auto space-y-1 text-sm text-muted-foreground"
        >
          {#each failures as failure}
            <li>
              {failure.file.webkitRelativePath || failure.file.name}: {failure.error}
            </li>
          {/each}
        </ul>
      {/if}
    </div>

    <Dialog.Footer>
      <Button
        variant="outline"
        onclick={() => handleOpenChange(false)}
        disabled={loading}
      >
        Cancel
      </Button>
      {#if mode === "manual"}
        <Button onclick={handleCreateManual} disabled={!isManualValid}>
          {#if loading}
            <LoaderIcon class="animate-spin mr-2" size={16} />
          {/if}
          {loading ? "Creating..." : "Create"}
        </Button>
      {:else if mode === "folder" && canImportFolder}
        <Button onclick={handleCreateFromFolder} disabled={!isFolderValid}>
          {#if loading}<LoaderIcon class="animate-spin mr-2" size={16} />{/if}
          {loading
            ? "Uploading..."
            : folderPlaylistId
              ? "Retry Failed Tracks"
              : "Upload & Create"}
        </Button>
      {:else if mode === "remote" && canImportRemote}
        <Button onclick={handleCreateFromRemote} disabled={!isRemoteValid}>
          {#if loading}
            <LoaderIcon class="animate-spin mr-2" size={16} />
          {/if}
          {loading ? "Downloading..." : "Download"}
        </Button>
      {/if}
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

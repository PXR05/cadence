<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import { createPlaylist } from "$lib/backend/services/playlists";
  import { Input } from "../ui/input";
  import {
    Link as LinkIcon,
    Loader as LoaderIcon,
    List as ListIcon,
  } from "@lucide/svelte";
  import { tracksStore } from "$lib/stores/tracks.svelte";
  import { remoteDownloadStore } from "$lib/stores/remoteDownload.svelte";
  import {
    detectRemoteProviderFromUrl,
    getRemoteProviderLabel,
    isValidRemoteImportUrl,
  } from "$lib/utils/remote";
  import { backendCapabilities } from "$lib/backend/config";

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated?: () => void;
  }

  let { open, onOpenChange, onCreated }: Props = $props();

  let playlistName = $state("");
  let remoteUrl = $state("");
  let loading = $state(false);
  let error = $state("");
  let mode = $state<"manual" | "remote">("manual");
  const canImportRemote =
    backendCapabilities.uploads.remote &&
    (backendCapabilities.remoteProviders.youtube.import ||
      backendCapabilities.remoteProviders.tidal.import);

  const SUPPORTED_IMPORT_SOURCES =
    "Supported sources:\n- YouTube playlist links\n- Tidal playlist or album links";

  async function handleCreateManual() {
    if (!playlistName.trim()) return;

    loading = true;
    error = "";

    try {
      resetDialog();
      onOpenChange(false);
      await createPlaylist({ name: playlistName.trim() });
      onCreated?.();
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to create playlist";
      console.error("Failed to create playlist:", err);
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
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      resetDialog();
    }
    onOpenChange(isOpen);
  }

  const isManualValid = $derived(playlistName.trim() && !loading);
  const isRemoteValid = $derived(remoteUrl.trim() && !loading);
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Create Playlist</Dialog.Title>
    </Dialog.Header>

    <div class="space-y-4">
      <div class="flex gap-2">
        {#if canImportRemote}
          <Button
          variant={mode === "manual" ? "default" : "outline"}
          onclick={() => {
            mode = "manual";
            error = "";
          }}
          class="flex-1 gap-2"
          disabled={loading}
        >
          <ListIcon size={16} />
          Manual
          </Button>
        {/if}
        <Button
          variant={mode === "remote" ? "default" : "outline"}
          onclick={() => {
            mode = "remote";
            error = "";
          }}
          class="flex-1 gap-2"
          disabled={loading}
        >
          <LinkIcon size={16} />
          Remote
        </Button>
      </div>

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
      {:else if canImportRemote}
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
        <p class="text-sm text-destructive">{error}</p>
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
      {:else if canImportRemote}
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

<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import { createPlaylist } from "$lib/remote";
  import { Input } from "../ui/input";
  import { LoaderIcon, ListIcon, YoutubeIcon } from "@lucide/svelte";
  import { tracksStore } from "$lib/stores/tracks.svelte";
  import { youtubeDownloadStore } from "$lib/stores/youtubeDownload.svelte";

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated?: () => void;
  }

  let { open = $bindable(), onOpenChange, onCreated }: Props = $props();

  let playlistName = $state("");
  let youtubeUrl = $state("");
  let loading = $state(false);
  let error = $state("");
  let mode = $state<"manual" | "youtube">("manual");

  async function handleCreateManual() {
    if (!playlistName.trim()) return;

    loading = true;
    error = "";

    try {
      await createPlaylist({ name: playlistName.trim() });
      resetDialog();
      onOpenChange(false);
      onCreated?.();
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to create playlist";
      console.error("Failed to create playlist:", err);
    } finally {
      loading = false;
    }
  }

  async function handleCreateFromYoutube(e: Event) {
    e.preventDefault();
    if (!youtubeUrl.trim()) return;
    if (!youtubeUrl.trim().includes("/playlist?list=")) {
      error = "Please enter a valid YouTube playlist URL.";
      return;
    }

    error = "";

    try {
      await youtubeDownloadStore.downloadFromUrl(youtubeUrl.trim());
      tracksStore.loadAllTracks(true);
      resetDialog();
      onOpenChange(false);
      onCreated?.();
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to import playlist";
      console.error("Failed to import playlist:", err);
    }
  }

  function resetDialog() {
    playlistName = "";
    youtubeUrl = "";
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
  const isYoutubeValid = $derived(youtubeUrl.trim() && !loading);
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
  <Dialog.Content class="sm:max-w-md p-4">
    <Dialog.Header class="text-left">
      <Dialog.Title>Create Playlist</Dialog.Title>
    </Dialog.Header>

    <div class="space-y-4">
      <div class="flex gap-2">
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
        <Button
          variant={mode === "youtube" ? "default" : "outline"}
          onclick={() => {
            mode = "youtube";
            error = "";
          }}
          class="flex-1 gap-2"
          disabled={loading}
        >
          <YoutubeIcon size={16} />
          YouTube
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
      {:else}
        <div>
          <label for="youtube-url" class="text-sm font-medium block mb-2">
            YouTube Playlist URL
          </label>
          <Input
            id="youtube-url"
            type="url"
            bind:value={youtubeUrl}
            placeholder="https://youtube.com/playlist?list=..."
            class="w-full px-3 py-2 text-sm"
            disabled={loading}
            onkeydown={(e) => {
              if (e.key === "Enter" && isYoutubeValid) {
                handleCreateFromYoutube(e);
              }
            }}
          />
        </div>
      {/if}

      {#if error}
        <p class="text-sm text-destructive">{error}</p>
      {/if}
    </div>

    <div class="flex gap-2 justify-end">
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
      {:else}
        <Button onclick={handleCreateFromYoutube} disabled={!isYoutubeValid}>
          {#if loading}
            <LoaderIcon class="animate-spin mr-2" size={16} />
          {/if}
          {loading ? "Downloading..." : "Download"}
        </Button>
      {/if}
    </div>
  </Dialog.Content>
</Dialog.Root>

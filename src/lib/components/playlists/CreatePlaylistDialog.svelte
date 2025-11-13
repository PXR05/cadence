<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import { createPlaylist } from "$lib/remote";

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated?: () => void;
  }

  let { open = $bindable(), onOpenChange, onCreated }: Props = $props();

  let playlistName = $state("");
  let loading = $state(false);
  let error = $state("");

  async function handleCreate() {
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

  function resetDialog() {
    playlistName = "";
    error = "";
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      resetDialog();
    }
    onOpenChange(isOpen);
  }

  const isValid = $derived(playlistName.trim() && !loading);
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
  <Dialog.Content class="sm:max-w-md p-4">
    <Dialog.Header class="text-left">
      <Dialog.Title>Create Playlist</Dialog.Title>
    </Dialog.Header>

    <div class="space-y-4">
      <div>
        <label for="playlist-name" class="text-sm font-medium block mb-2">
          Playlist Name
        </label>
        <input
          id="playlist-name"
          type="text"
          bind:value={playlistName}
          placeholder="My Playlist"
          class="w-full px-3 py-2 text-sm border bg-background"
          disabled={loading}
        />
      </div>
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
      <Button onclick={handleCreate} disabled={!isValid}>
        {loading ? "Creating..." : "Create"}
      </Button>
    </div>
  </Dialog.Content>
</Dialog.Root>

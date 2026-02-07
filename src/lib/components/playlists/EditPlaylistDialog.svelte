<script lang="ts">
  import { updatePlaylist, deletePlaylist } from "$lib/api";
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { LoaderIcon, TrashIcon, ImageIcon } from "@lucide/svelte";
  import type { PlaylistDetail } from "$lib/schemas";
  import { Input } from "../ui/input";
  import { getPlaylistImageUrl } from "$lib/constants";
  import { playlistsStore } from "$lib/stores/playlists.svelte";

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    playlist: PlaylistDetail;
    onUpdated: (playlist: { name: string; coverImage?: string }) => void;
    onDeleted: () => void;
  }

  let { open, onOpenChange, playlist, onUpdated, onDeleted }: Props = $props();

  let editName = $state("");
  let editCoverImageFile = $state<File | null>(null);
  let editCoverImagePreview = $state<string | null>(null);
  let editLoading = $state(false);
  let deleteDialogOpen = $state(false);
  let deleteLoading = $state(false);

  $effect(() => {
    if (open) {
      editName = playlist.name;
      editCoverImageFile = null;
      editCoverImagePreview = getPlaylistImageUrl(playlist.id) || null;
    }
  });

  function handleCoverImageChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    editCoverImageFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      editCoverImagePreview = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveCoverImage() {
    editCoverImageFile = null;
    editCoverImagePreview = null;
  }

  async function handleSave() {
    if (!editName.trim()) return;

    editLoading = true;
    try {
      const response = await updatePlaylist({
        id: playlist.id,
        name: editName.trim(),
        coverImage: editCoverImageFile || undefined,
      });

      onUpdated({
        name: response.playlist.name,
        coverImage: response.playlist.coverImage,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update playlist:", error);
    } finally {
      editLoading = false;
    }
  }

  async function handleDelete() {
    deleteLoading = true;
    try {
      await playlistsStore.invalidatePlaylist(playlist.id);
      await deletePlaylist(playlist.id);
      deleteDialogOpen = false;
      onOpenChange(false);
      onDeleted();
    } catch (error) {
      console.error("Failed to delete playlist:", error);
    } finally {
      deleteLoading = false;
    }
  }
</script>

<Dialog.Root {open} {onOpenChange}>
  <Dialog.Content class="max-w-md">
    <Dialog.Header class="text-left">
      <Dialog.Title>Edit Playlist</Dialog.Title>
    </Dialog.Header>

    <div class="space-y-4 py-4">
      <div class="space-y-2">
        <label for="playlist-name" class="text-sm font-medium">
          Playlist Name
        </label>
        <Input
          id="playlist-name"
          type="text"
          bind:value={editName}
          placeholder="Enter playlist name"
          class="w-full p-2 border bg-background outline-none focus:ring-1 focus:ring-ring"
          disabled={editLoading}
        />
      </div>

      <div class="space-y-2">
        <div class="text-sm font-medium">Cover Image</div>
        {#if editCoverImagePreview}
          <div
            class="relative w-full aspect-square border rounded-lg overflow-hidden"
          >
            <img
              crossorigin="use-credentials"
              src={editCoverImagePreview}
              alt="Cover preview"
              class="w-full h-full object-cover"
            />
            <Button
              variant="destructive"
              size="icon"
              onclick={handleRemoveCoverImage}
              class="absolute top-2 right-2 "
              disabled={editLoading}
            >
              <TrashIcon size={16} />
            </Button>
          </div>
        {:else}
          <label
            class="w-full aspect-square border border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <ImageIcon size={32} class="text-muted-foreground mb-2" />
            <span class="text-sm text-muted-foreground">
              Click to upload cover image
            </span>
            <input
              type="file"
              accept="image/*"
              onchange={handleCoverImageChange}
              class="hidden"
              disabled={editLoading}
            />
          </label>
        {/if}
      </div>
    </div>

    <Dialog.Footer class="flex-col sm:flex-row gap-2">
      <Button
        variant="destructive"
        onclick={() => (deleteDialogOpen = true)}
        disabled={editLoading}
        class="w-full sm:w-auto sm:mr-auto"
      >
        <TrashIcon size={16} class="mr-2" />
        Delete
      </Button>
      <div class="flex gap-2 w-full sm:w-auto">
        <Button
          variant="outline"
          onclick={() => onOpenChange(false)}
          disabled={editLoading}
          class="flex-1 sm:flex-none"
        >
          Cancel
        </Button>
        <Button
          onclick={handleSave}
          disabled={editLoading || !editName.trim()}
          class="flex-1 sm:flex-none"
        >
          {#if editLoading}
            <LoaderIcon class="animate-spin mr-2" size={16} />
          {/if}
          Save
        </Button>
      </div>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<AlertDialog.Root
  open={deleteDialogOpen}
  onOpenChange={(open) => (deleteDialogOpen = open)}
>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete Playlist</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to delete "{playlist.name}"? This action cannot be
        undone.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel disabled={deleteLoading}>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={handleDelete}
        disabled={deleteLoading}
        class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        {#if deleteLoading}
          <LoaderIcon class="animate-spin mr-2" size={16} />
        {/if}
        Delete
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

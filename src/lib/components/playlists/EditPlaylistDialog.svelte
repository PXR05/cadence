<script lang="ts">
  import { updatePlaylist } from "$lib/api";
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import {
    Loader as LoaderIcon,
    Image as ImageIcon,
    UploadIcon,
  } from "@lucide/svelte";
  import type { PlaylistDetail } from "$lib/schemas";
  import { Input } from "../ui/input";
  import { getPlaylistImageUrl } from "$lib/constants";
  import { Image } from "../ui/image";

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    playlist: PlaylistDetail;
    onUpdated: (playlist: { name: string; coverImage?: string | null }) => void;
  }

  let { open, onOpenChange, playlist, onUpdated }: Props = $props();

  let editName = $state("");
  let editCoverImageFile = $state<File | null>(null);
  let editCoverImagePreview = $state<string | null>(null);
  let editLoading = $state(false);

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
</script>

<Dialog.Root {open} {onOpenChange}>
  <Dialog.Content class="sm:max-w-md gap-0">
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
        <label
          class="relative group w-full aspect-square rounded-lg overflow-hidden border border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
        >
          {#if editCoverImagePreview}
            <Image
              crossorigin="use-credentials"
              src={editCoverImagePreview}
              alt="Cover preview"
              class="w-full h-full object-cover"
            />
            <div
              class="absolute md:opacity-0 group-hover:opacity-100 inset-0 bg-black/50 transition-opacity grid place-items-center"
            >
              <UploadIcon strokeWidth={1.5} class="size-16" />
            </div>
          {:else}
            <ImageIcon size={32} class="text-muted-foreground mb-2" />
            <span class="text-sm text-muted-foreground">
              Click to upload cover image
            </span>
          {/if}
          <input
            type="file"
            accept="image/*"
            onchange={handleCoverImageChange}
            class="hidden"
            disabled={editLoading}
          />
        </label>
      </div>
    </div>

    <Dialog.Footer>
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
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
<script lang="ts">
  import { BASE_URL } from "$lib/api";
  import { playerStore } from "$lib/stores/player.svelte";
  import * as Dialog from "$lib/components/ui/dialog";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { ChevronDown, EllipsisIcon } from "@lucide/svelte";
  import { DownloadIcon } from "./icons";
  import PlayerDetails from "./PlayerDetails.svelte";

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onQueueOpen: () => void;
  }

  let { open = $bindable(), onOpenChange, onQueueOpen }: Props = $props();

  const track = $derived(playerStore.currentTrack);

  function handleDownload() {
    if (track) {
      const downloadUrl = `${BASE_URL}/${track.id}/stream`;
      const link = document.createElement("a");
      link.href = downloadUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
</script>

<Dialog.Root bind:open {onOpenChange}>
  <Dialog.Content
    showCloseButton={false}
    class="md:max-w-2xl h-dvh md:max-h-[90vh] max-w-dvw flex flex-col p-0"
  >
    <div class="flex justify-between items-center p-6">
      <Dialog.Close class="opacity-70 transition-opacity hover:opacity-100">
        <ChevronDown />
      </Dialog.Close>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <button class="opacity-70 transition-opacity hover:opacity-100">
            <EllipsisIcon />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onclick={handleDownload}>
            <DownloadIcon size={16} class="mr-2" />
            Download
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>

    {#if track}
      <PlayerDetails {track} {onQueueOpen} />
    {/if}
  </Dialog.Content>
</Dialog.Root>

<script lang="ts">
  import { downloadStore } from "$lib/stores/download.svelte";
  import { XIcon } from "@lucide/svelte";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { Button } from "../ui/button";
  import { appearanceStore } from "$lib/stores/appearance.svelte";
  import DownloadProgressBar from "./DownloadProgressBar.svelte";

  const progress = $derived(downloadStore.progress);
  const percentage = $derived(
    progress ? Math.round((progress.current / progress.total) * 100) : 0,
  );

  let showCancelDialog = $state(false);

  function handleCancelClick() {
    showCancelDialog = true;
  }

  async function handleConfirmCancel() {
    await downloadStore.cancelDownload();
    showCancelDialog = false;
  }
</script>

{#if progress}
  <div
    class="border rounded-xl overflow-clip border-input/15 mx-1.5
    {appearanceStore.disableBlur
      ? 'bg-muted'
      : 'bg-muted-foreground/10 dark:bg-muted/70 backdrop-blur-md'}"
  >
    <div class="flex items-center justify-between p-3 gap-2">
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between mb-1">
          <p class="text-sm font-medium truncate">
            {progress.type === "offline" ? "Saving offline" : "Downloading"}: {progress.playlistName}
          </p>
          <p class="text-sm text-muted-foreground tabular-nums ml-2">
            {progress.current} / {progress.total}
          </p>
        </div>
        <DownloadProgressBar {percentage} />
      </div>
      <Button
        variant="ghost"
        size="icon"
        onclick={handleCancelClick}
        class="size-7 transition-colors shrink-0"
        title="Cancel download"
      >
        <XIcon size={16} class="text-muted-foreground" />
      </Button>
    </div>
  </div>
{/if}

<AlertDialog.Root bind:open={showCancelDialog}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Cancel Download?</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to cancel the download? Progress will be lost.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Continue Download</AlertDialog.Cancel>
      <AlertDialog.Action onclick={handleConfirmCancel}>
        Cancel Download
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

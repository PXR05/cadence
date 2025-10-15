<script lang="ts">
  import { downloadStore } from "$lib/stores/download.svelte";
  import { XIcon } from "@lucide/svelte";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { Button } from "$lib/components/ui/button";

  const progress = $derived(downloadStore.progress);
  const percentage = $derived(
    progress ? Math.round((progress.current / progress.total) * 100) : 0,
  );

  let showCancelDialog = $state(false);

  function handleCancelClick() {
    showCancelDialog = true;
  }

  function handleConfirmCancel() {
    downloadStore.cancelDownload();
    showCancelDialog = false;
  }
</script>

{#if progress}
  <div class="border-b bg-muted/50 relative">
    <div class="flex items-center justify-between p-3 gap-4">
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between mb-1.5">
          <p class="text-sm font-medium truncate">
            {progress.type === "offline" ? "Saving offline" : "Downloading"}: {progress.playlistName}
          </p>
          <p class="text-sm text-muted-foreground tabular-nums ml-2">
            {progress.current} / {progress.total}
          </p>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex-1 bg-muted border overflow-hidden h-2 rounded-sm">
            <div
              class="h-full bg-primary transition-all duration-300"
              style="width: {percentage}%"
            ></div>
          </div>
          <span class="text-xs text-muted-foreground tabular-nums min-w-[3ch]">
            {percentage}%
          </span>
        </div>
      </div>
      <button
        onclick={handleCancelClick}
        class="p-1.5 hover:bg-muted rounded transition-colors shrink-0"
        title="Cancel download"
      >
        <XIcon size={16} class="text-muted-foreground" />
      </button>
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

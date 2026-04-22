<script lang="ts">
  import { TriangleAlert as AlertTriangleIcon } from "@lucide/svelte";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";

  let {
    open = $bindable(false),
    isApplying = false,
    resetContent = true,
    onConfirm,
  }: {
    open?: boolean;
    isApplying?: boolean;
    resetContent?: boolean;
    onConfirm: () => void | Promise<void>;
  } = $props();
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <div class="flex items-center gap-3 mb-2">
        <div
          class="size-10 rounded-full bg-destructive/10 flex items-center justify-center"
        >
          <AlertTriangleIcon class="size-5 text-destructive" />
        </div>
        <AlertDialog.Title>Apply New Backend URL?</AlertDialog.Title>
      </div>
      <AlertDialog.Description>
        {#if resetContent}
          This will sign you out and clear cached content (tracks, playlists,
          offline data, history, and download queues). Theme and visual
          preferences are kept.
        {:else}
          This will sign you out and switch to the new backend without clearing
          local content. Only do this if you are sure the new backend is
          compatible with the current local cache.
        {/if}
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel disabled={isApplying}>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        onclick={() => onConfirm()}
        disabled={isApplying}
      >
        {#if isApplying}
          Applying...
        {:else if resetContent}
          Apply & Reset
        {:else}
          Apply
        {/if}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

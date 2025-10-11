<script lang="ts">
  import * as AlertDialog from "$lib/components/ui/alert-dialog";

  let {
    open = $bindable(false),
    tokenName = "",
    onConfirm,
  }: {
    open: boolean;
    tokenName: string;
    onConfirm: () => void;
  } = $props();
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete token?</AlertDialog.Title>
      <AlertDialog.Description>
        This will permanently delete "{tokenName}". This action cannot be
        undone.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action onclick={onConfirm}>Delete</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

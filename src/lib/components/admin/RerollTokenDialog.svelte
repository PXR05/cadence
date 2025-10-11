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
      <AlertDialog.Title>Reroll token?</AlertDialog.Title>
      <AlertDialog.Description>
        This will create a new token for "{tokenName}" and invalidate the old
        one. Make sure to save the new token.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action onclick={onConfirm}>Reroll</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

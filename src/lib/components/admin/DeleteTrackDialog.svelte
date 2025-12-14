<script lang="ts">
  import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from "$lib/components/ui/alert-dialog";

  interface Props {
    open: boolean;
    onOpenChange?: (open: boolean) => void;
    trackName: string;
    onConfirm: () => void;
  }

  let {
    open = $bindable(),
    onOpenChange,
    trackName,
    onConfirm,
  }: Props = $props();

  function handleOpenChange(isOpen: boolean) {
    open = isOpen;
    onOpenChange?.(isOpen);
  }
</script>

<AlertDialog bind:open onOpenChange={handleOpenChange}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete Track</AlertDialogTitle>
      <AlertDialogDescription>
        Are you sure you want to delete "{trackName}"? This action cannot be
        undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onclick={onConfirm}>Delete</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

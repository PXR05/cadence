<script lang="ts">
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
  } from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";

  let {
    open = $bindable(),
    username,
    onConfirm,
  } = $props<{
    open: boolean;
    username: string;
    onConfirm: () => void;
  }>();
</script>

<Dialog bind:open>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Delete User</DialogTitle>
      <DialogDescription>
        Are you sure you want to delete user <strong>{username}</strong>? This
        action cannot be undone.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
      <Button variant="destructive" onclick={onConfirm}>Delete</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

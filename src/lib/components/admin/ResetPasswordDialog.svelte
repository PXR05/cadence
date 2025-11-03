<script lang="ts">
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
  } from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";

  let {
    open = $bindable(),
    username,
    userId,
    onConfirm,
  } = $props<{
    open: boolean;
    username: string;
    userId: string;
    onConfirm: (userId: string, newPassword: string) => Promise<void>;
  }>();

  let newPassword = $state("");
  let confirmPassword = $state("");
  let error = $state("");
  let loading = $state(false);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    error = "";

    if (!newPassword) {
      error = "Password is required";
      return;
    }

    if (newPassword.length < 6) {
      error = "Password must be at least 6 characters";
      return;
    }

    if (newPassword !== confirmPassword) {
      error = "Passwords do not match";
      return;
    }

    loading = true;
    try {
      await onConfirm(userId, newPassword);
      newPassword = "";
      confirmPassword = "";
      error = "";
      open = false;
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to reset password";
    } finally {
      loading = false;
    }
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      newPassword = "";
      confirmPassword = "";
      error = "";
    }
  }

  $effect(() => {
    if (open) {
      handleOpenChange(open);
    }
  });
</script>

<Dialog bind:open>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Reset Password</DialogTitle>
      <DialogDescription>
        Set a new password for user <strong>{username}</strong>
      </DialogDescription>
    </DialogHeader>

    <form onsubmit={handleSubmit} class="space-y-4">
      <div class="space-y-2">
        <label for="resetPassword" class="text-sm font-medium">
          New Password
        </label>
        <Input
          id="resetPassword"
          type="password"
          bind:value={newPassword}
          disabled={loading}
          placeholder="Enter new password"
          autocomplete="new-password"
          required
        />
        <p class="text-xs text-muted-foreground">Minimum 6 characters</p>
      </div>

      <div class="space-y-2">
        <label for="confirmResetPassword" class="text-sm font-medium">
          Confirm New Password
        </label>
        <Input
          id="confirmResetPassword"
          type="password"
          bind:value={confirmPassword}
          disabled={loading}
          placeholder="Confirm new password"
          autocomplete="new-password"
          required
        />
      </div>

      {#if error}
        <p class="text-sm text-red-500">{error}</p>
      {/if}

      <div class="flex gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          onclick={() => (open = false)}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Resetting..." : "Reset Password"}
        </Button>
      </div>
    </form>
  </DialogContent>
</Dialog>

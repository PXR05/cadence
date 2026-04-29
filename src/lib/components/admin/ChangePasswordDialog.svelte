<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
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
    onConfirm: (
      userId: string,
      currentPassword: string,
      newPassword: string,
    ) => Promise<void>;
  }>();

  let currentPassword = $state("");
  let newPassword = $state("");
  let confirmPassword = $state("");
  let error = $state("");
  let loading = $state(false);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    error = "";

    if (!currentPassword) {
      error = "Current password is required";
      return;
    }

    if (!newPassword) {
      error = "New password is required";
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
      await onConfirm(userId, currentPassword, newPassword);
      currentPassword = "";
      newPassword = "";
      confirmPassword = "";
      error = "";
      open = false;
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to change password";
    } finally {
      loading = false;
    }
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      currentPassword = "";
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

<Dialog.Root bind:open>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Change Password</Dialog.Title>
      <Dialog.Description>
        Change password for user <strong>{username}</strong>
      </Dialog.Description>
    </Dialog.Header>

    <form onsubmit={handleSubmit} class="space-y-4">
      <div class="space-y-2">
        <label for="currentPassword" class="text-sm font-medium">
          Current Password
        </label>
        <Input
          id="currentPassword"
          type="password"
          bind:value={currentPassword}
          disabled={loading}
          placeholder="Enter current password"
          autocomplete="current-password"
          required
        />
      </div>

      <div class="space-y-2">
        <label for="changeNewPassword" class="text-sm font-medium">
          New Password
        </label>
        <Input
          id="changeNewPassword"
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
        <label for="confirmChangePassword" class="text-sm font-medium">
          Confirm New Password
        </label>
        <Input
          id="confirmChangePassword"
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
          {loading ? "Changing..." : "Change Password"}
        </Button>
      </div>
    </form>
  </Dialog.Content>
</Dialog.Root>

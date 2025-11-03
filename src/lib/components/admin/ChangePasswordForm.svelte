<script lang="ts">
  import { authStore } from "$lib/stores/auth.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";

  let { onSuccess, onError } = $props<{
    onSuccess: () => void;
    onError: (error: string) => void;
  }>();

  let currentPassword = $state("");
  let newPassword = $state("");
  let confirmPassword = $state("");
  let loading = $state(false);

  async function handleSubmit(e: Event) {
    e.preventDefault();

    if (newPassword.length < 6) {
      onError("New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      onError("Passwords do not match");
      return;
    }

    loading = true;

    try {
      await authStore.changePassword(currentPassword, newPassword);
      currentPassword = "";
      newPassword = "";
      confirmPassword = "";
      onSuccess();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      loading = false;
    }
  }
</script>

<div class="border rounded-md">
  <div class="bg-muted/50 px-4 py-2 border-b">
    <h3 class="font-medium">Change Password</h3>
  </div>

  <div class="p-4">
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
        <label for="newPassword" class="text-sm font-medium">
          New Password
        </label>
        <Input
          id="newPassword"
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
        <label for="confirmPassword" class="text-sm font-medium">
          Confirm New Password
        </label>
        <Input
          id="confirmPassword"
          type="password"
          bind:value={confirmPassword}
          disabled={loading}
          placeholder="Confirm new password"
          autocomplete="new-password"
          required
        />
      </div>

      <Button type="submit" disabled={loading} class="w-full">
        {loading ? "Changing..." : "Change Password"}
      </Button>
    </form>
  </div>
</div>

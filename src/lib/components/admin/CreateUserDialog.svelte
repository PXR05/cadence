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
    onCreateUser,
    loading,
  } = $props<{
    open: boolean;
    onCreateUser: (username: string, password: string) => Promise<void>;
    loading: boolean;
  }>();

  let username = $state("");
  let password = $state("");
  let confirmPassword = $state("");
  let error = $state("");

  async function handleSubmit(e: Event) {
    e.preventDefault();
    error = "";

    if (!username.trim()) {
      error = "Username is required";
      return;
    }

    if (username.length < 3 || username.length > 50) {
      error = "Username must be 3-50 characters";
      return;
    }

    if (!password) {
      error = "Password is required";
      return;
    }

    if (password.length < 6) {
      error = "Password must be at least 6 characters";
      return;
    }

    if (password !== confirmPassword) {
      error = "Passwords do not match";
      return;
    }

    try {
      await onCreateUser(username, password);
      username = "";
      password = "";
      confirmPassword = "";
      error = "";
      open = false;
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to create user";
    }
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      username = "";
      password = "";
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
      <DialogTitle>Create New User</DialogTitle>
      <DialogDescription>
        Add a new user account with username and password
      </DialogDescription>
    </DialogHeader>

    <form onsubmit={handleSubmit} class="space-y-4">
      <div class="space-y-2">
        <label for="newUsername" class="text-sm font-medium">Username</label>
        <Input
          id="newUsername"
          type="text"
          bind:value={username}
          disabled={loading}
          placeholder="Enter username"
          autocomplete="off"
          required
        />
        <p class="text-xs text-muted-foreground">3-50 characters</p>
      </div>

      <div class="space-y-2">
        <label for="newPassword" class="text-sm font-medium">Password</label>
        <Input
          id="newPassword"
          type="password"
          bind:value={password}
          disabled={loading}
          placeholder="Enter password"
          autocomplete="new-password"
          required
        />
        <p class="text-xs text-muted-foreground">Minimum 6 characters</p>
      </div>

      <div class="space-y-2">
        <label for="confirmNewPassword" class="text-sm font-medium">
          Confirm Password
        </label>
        <Input
          id="confirmNewPassword"
          type="password"
          bind:value={confirmPassword}
          disabled={loading}
          placeholder="Confirm password"
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
          {loading ? "Creating..." : "Create User"}
        </Button>
      </div>
    </form>
  </DialogContent>
</Dialog>

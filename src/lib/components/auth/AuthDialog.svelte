<script lang="ts">
  import { authStore } from "$lib/stores/auth.svelte";
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
  } from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "../ui/input";

  let { onAuthenticated } = $props<{
    onAuthenticated: () => void;
  }>();

  let username = $state("");
  let password = $state("");
  let isProcessing = $state(false);
  let error = $state("");

  async function handleSubmit(e: Event) {
    e.preventDefault();

    if (!username.trim()) {
      error = "Username is required";
      return;
    }

    if (!password.trim()) {
      error = "Password is required";
      return;
    }

    isProcessing = true;
    error = "";

    try {
      await authStore.login(username, password);
      onAuthenticated();
    } catch (err) {
      error =
        err instanceof Error ? err.message : "Invalid username or password";
      console.error(err);
    } finally {
      isProcessing = false;
    }
  }
</script>

<Dialog open={true}>
  <DialogContent
    showCloseButton={false}
    onInteractOutside={(e) => e.preventDefault()}
    onEscapeKeydown={(e) => e.preventDefault()}
  >
    <DialogHeader>
      <DialogTitle>Sign In</DialogTitle>
      <DialogDescription>Enter your credentials to continue</DialogDescription>
    </DialogHeader>

    <form onsubmit={handleSubmit} class="space-y-4">
      <div class="space-y-2">
        <label for="username" class="text-sm font-medium">Username</label>
        <Input
          id="username"
          type="text"
          bind:value={username}
          disabled={isProcessing}
          class="w-full px-3 py-2"
          placeholder="Enter your username"
          autocomplete="username"
        />
      </div>

      <div class="space-y-2">
        <label for="password" class="text-sm font-medium">Password</label>
        <Input
          id="password"
          type="password"
          bind:value={password}
          disabled={isProcessing}
          class="w-full px-3 py-2"
          placeholder="Enter your password"
          autocomplete="current-password"
        />
      </div>

      {#if error}
        <p class="text-sm text-red-500">{error}</p>
      {/if}

      <Button type="submit" disabled={isProcessing} class="w-full">
        {isProcessing ? "Processing..." : "Sign In"}
      </Button>
    </form>
  </DialogContent>
</Dialog>

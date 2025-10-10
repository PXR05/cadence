<script lang="ts">
  import { authStore } from "$lib/stores/auth.svelte";
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
  } from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";

  let { onAuthenticated } = $props<{
    onAuthenticated: () => void;
  }>();

  let password = $state("");
  let isProcessing = $state(false);
  let error = $state("");

  async function handleSubmit(e: Event) {
    e.preventDefault();

    if (!password.trim()) {
      error = "Password is required";
      return;
    }

    isProcessing = true;
    error = "";

    try {
      await authStore.setPassword(password);
      onAuthenticated();
    } catch (err) {
      error = "Failed to set password. Please try again.";
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
  >
    <DialogHeader>
      <DialogTitle>Authentication Required</DialogTitle>
    </DialogHeader>

    <form onsubmit={handleSubmit} class="space-y-4">
      <div class="space-y-2">
        <label for="password" class="text-sm font-medium">Password</label>
        <input
          id="password"
          type="password"
          bind:value={password}
          disabled={isProcessing}
          class="w-full px-3 py-2 border rounded-md bg-background"
          placeholder="Enter your password"
          autocomplete="current-password"
        />
        {#if error}
          <p class="text-sm text-red-500">{error}</p>
        {/if}
      </div>

      <Button type="submit" disabled={isProcessing} class="w-full">
        {isProcessing ? "Processing..." : "Continue"}
      </Button>
    </form>
  </DialogContent>
</Dialog>

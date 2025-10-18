<script lang="ts">
  import { authStore } from "$lib/stores/auth.svelte";
  import { checkToken } from "$lib/api";
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
  } from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "../ui/input";

  let { onAuthenticated } = $props<{
    onAuthenticated: () => void;
  }>();

  let token = $state("");
  let isProcessing = $state(false);
  let error = $state("");

  async function handleSubmit(e: Event) {
    e.preventDefault();

    if (!token.trim()) {
      error = "Token is required";
      return;
    }

    isProcessing = true;
    error = "";

    try {
      if (typeof document !== "undefined") {
        document.cookie = `cadence.token=${token}; path=/; max-age=31536000; SameSite=Strict`;
      }

      await checkToken();
      await authStore.setToken(token);
      onAuthenticated();
    } catch (err) {
      if (typeof document !== "undefined") {
        document.cookie = "cadence.token=; path=/; max-age=0";
      }
      error = "Invalid token. Please check and try again.";
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
      <DialogTitle>Authentication Required</DialogTitle>
    </DialogHeader>

    <form onsubmit={handleSubmit} class="space-y-4">
      <div class="space-y-2">
        <label for="password" class="text-sm font-medium">Token</label>
        <Input
          id="token"
          type="password"
          bind:value={token}
          disabled={isProcessing}
          class="w-full px-3 py-2"
          placeholder="Enter your token"
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

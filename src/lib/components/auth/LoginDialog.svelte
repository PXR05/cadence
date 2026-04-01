<script lang="ts">
  import { authStore } from "$lib/stores/auth.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { EyeIcon, EyeOffIcon } from "@lucide/svelte";

  let {
    onAuthenticated,
    onSwitchToRegister,
    disabled = false,
  } = $props<{
    onAuthenticated: () => void;
    onSwitchToRegister: () => void;
    disabled?: boolean;
  }>();

  let username = $state("");
  let password = $state("");
  let isProcessing = $state(false);
  let error = $state("");
  let showPassword = $state(false);

  async function handleSubmit(e: Event) {
    e.preventDefault();

    if (disabled) {
      return;
    }

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

<form onsubmit={handleSubmit} class="space-y-4">
  <div class="space-y-2">
    <label for="username" class="text-sm font-medium">Username</label>
    <Input
      id="username"
      type="text"
      bind:value={username}
      disabled={isProcessing || disabled}
      class="w-full px-3 py-2"
      placeholder="Enter your username"
      autocomplete="username"
    />
  </div>

  <div class="space-y-2">
    <label for="password" class="text-sm font-medium">Password</label>
    <div class="relative">
      <Input
        id="password"
        type={showPassword ? "text" : "password"}
        bind:value={password}
        disabled={isProcessing || disabled}
        class="w-full px-3 py-2"
        placeholder="Enter your password"
        autocomplete="current-password"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        class="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground"
        onclick={() => (showPassword = !showPassword)}
      >
        {#if showPassword}
          <EyeIcon size={16} />
        {:else}
          <EyeOffIcon size={16} />
        {/if}
      </Button>
    </div>
  </div>

  {#if error}
    <p class="text-sm text-red-500">{error}</p>
  {/if}

  <Button type="submit" disabled={isProcessing || disabled} class="w-full">
    {isProcessing ? "Processing..." : "Sign In"}
  </Button>

  <p class="text-center text-sm text-muted-foreground">
    Don&apos;t have an account?
    <Button
      type="button"
      variant="link"
      class="h-auto p-0"
      disabled={isProcessing || disabled}
      onclick={onSwitchToRegister}
    >
      Register
    </Button>
  </p>
</form>

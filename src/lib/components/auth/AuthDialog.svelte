<script lang="ts">
  import { browser } from "$app/environment";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import { Server as ServerIcon } from "@lucide/svelte";
  import { untrack } from "svelte";
  import BackendUrlUpdateField from "$lib/components/BackendUrlUpdateField.svelte";
  import { apiUrlStore, getBackendUrl } from "$lib/stores/apiUrl.svelte";
  import { applyApiUrlChange } from "$lib/utils/apiUrlChange";
  import LoginDialog from "./LoginDialog.svelte";
  import MonochromeAudioFlowField from "./MonochromeAudioFlowField.svelte";
  import RegisterDialog from "./RegisterDialog.svelte";

  let { onAuthenticated } = $props<{
    onAuthenticated: () => void;
  }>();

  function getInitialBackendUrl(): string {
    try {
      return getBackendUrl();
    } catch {
      return apiUrlStore.defaultUrl;
    }
  }

  type AuthMode = "login" | "register";

  function getModeFromUrl(): AuthMode {
    return page.url.searchParams.get("auth") === "register"
      ? "register"
      : "login";
  }

  let mode = $state<AuthMode>(getModeFromUrl());
  let backendUrlInput = $state(getInitialBackendUrl());
  let backendUrlError = $state("");
  let isApplyingBackendUrl = $state(false);
  let backendUrlDialogOpen = $state(false);

  $effect(() => {
    const modeFromUrl = getModeFromUrl();

    if (untrack(() => mode) !== modeFromUrl) {
      mode = modeFromUrl;
    }
  });

  function setMode(nextMode: AuthMode): void {
    if (mode === nextMode && page.url.searchParams.get("auth") === nextMode) {
      return;
    }

    mode = nextMode;

    if (!browser) {
      return;
    }

    const url = new URL(page.url);
    url.searchParams.set("auth", nextMode);

    goto(url.toString(), {
      replaceState: true,
      noScroll: true,
      keepFocus: true,
    });
  }

  function openBackendUrlDialog(): void {
    backendUrlInput = getInitialBackendUrl();
    backendUrlError = "";
    backendUrlDialogOpen = true;
  }

  function resetBackendUrlInput(): void {
    if (apiUrlStore.defaultUrl) {
      backendUrlInput = apiUrlStore.defaultUrl;
      backendUrlError = "";
    }
  }

  async function handleApplyBackendUrl(): Promise<void> {
    isApplyingBackendUrl = true;
    backendUrlError = "";

    try {
      const result = await applyApiUrlChange(backendUrlInput);
      backendUrlInput = result.activeUrl;
      backendUrlDialogOpen = false;
    } catch (error) {
      backendUrlError =
        error instanceof Error ? error.message : "Failed to update backend URL";
    } finally {
      isApplyingBackendUrl = false;
    }
  }
</script>

<div class="relative grid h-dvh overflow-hidden">
  <div class="relative hidden overflow-hidden bg-muted/40 p-6 md:flex">
    <MonochromeAudioFlowField />

    <div class="relative z-10 space-y-4">
      <img
        src="/favicon.svg"
        alt="Cadence logo"
        class="size-12 p-1 dark:invert-0 invert"
      />
    </div>
  </div>

  <div
    class="absolute bg-background top-0 bottom-0 right-0 w-full grid md:grid-cols-2"
    style="
      background: linear-gradient(
        to left,
        color-mix(in oklab, var(--background) 100%, transparent) 0%,
        color-mix(in oklab, var(--background) 100%, transparent) 40%,
        color-mix(in oklab, var(--background) 0%, transparent) 100%
      );
    "
  >
    <div class="hidden md:block"></div>
    <div class="p-6 m-auto w-full max-w-md flex flex-col gap-6">
      <img
        src="/favicon.svg"
        alt="Cadence logo"
        class="absolute md:hidden size-20 top-[calc((100dvh-356px)/4-80px/2)] left-0 right-0 mx-auto"
        draggable="false"
      />
      <!-- (window height - dialog height) / 4 - logo height / 2 -->

      <div class="flex items-center justify-between gap-2">
        <h2 class="text-2xl font-semibold">
          {mode === "login" ? "Sign In" : "Create Account"}
        </h2>
        <Button
          type="button"
          variant="outline"
          size="icon"
          class="text-muted-foreground"
          onclick={openBackendUrlDialog}
          disabled={isApplyingBackendUrl}
          title="Configure backend URL"
          aria-label="Configure backend URL"
        >
          <ServerIcon class="size-4" />
        </Button>
      </div>

      {#if mode === "login"}
        <LoginDialog
          {onAuthenticated}
          disabled={isApplyingBackendUrl}
          onSwitchToRegister={() => setMode("register")}
        />
      {:else}
        <RegisterDialog
          {onAuthenticated}
          disabled={isApplyingBackendUrl}
          onSwitchToLogin={() => setMode("login")}
        />
      {/if}
    </div>
  </div>
</div>

<Dialog.Root bind:open={backendUrlDialogOpen}>
  <Dialog.Content class="md:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Backend URL</Dialog.Title>
      <Dialog.Description>
        Update the server URL. Applying a change clears cached content and signs
        out active sessions.
      </Dialog.Description>
    </Dialog.Header>

    <BackendUrlUpdateField
      bind:value={backendUrlInput}
      defaultValue={apiUrlStore.defaultUrl}
      isApplying={isApplyingBackendUrl}
      error={backendUrlError}
      onReset={resetBackendUrlInput}
      onApply={handleApplyBackendUrl}
    />
  </Dialog.Content>
</Dialog.Root>

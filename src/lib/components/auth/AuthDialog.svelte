<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import { ServerIcon } from "@lucide/svelte";
  import BackendUrlUpdateField from "$lib/components/BackendUrlUpdateField.svelte";
  import { apiUrlStore, getBackendUrl } from "$lib/stores/apiUrl.svelte";
  import { applyApiUrlChange } from "$lib/utils/apiUrlChange";
  import LoginDialog from "./LoginDialog.svelte";
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

  let mode = $state<"login" | "register">("login");
  let backendUrlInput = $state(getInitialBackendUrl());
  let backendUrlError = $state("");
  let isApplyingBackendUrl = $state(false);
  let backendUrlDialogOpen = $state(false);

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

<Dialog.Root open={true}>
  <Dialog.Content
    showCloseButton={false}
    onInteractOutside={(e) => e.preventDefault()}
    onEscapeKeydown={(e) => e.preventDefault()}
  >
    <Button
      type="button"
      variant="outline"
      size="icon"
      class="absolute right-4 top-4 text-muted-foreground"
      onclick={openBackendUrlDialog}
      disabled={isApplyingBackendUrl}
      title="Configure backend URL"
      aria-label="Configure backend URL"
    >
      <ServerIcon class="size-4" />
    </Button>

    <Dialog.Header>
      <Dialog.Title>{mode === "login" ? "Sign In" : "Register"}</Dialog.Title>
      <Dialog.Description>
        {mode === "login"
          ? "Enter your credentials to continue"
          : "Create an account to continue"}
      </Dialog.Description>
    </Dialog.Header>

    {#if mode === "login"}
      <LoginDialog
        {onAuthenticated}
        disabled={isApplyingBackendUrl}
        onSwitchToRegister={() => (mode = "register")}
      />
    {:else}
      <RegisterDialog
        {onAuthenticated}
        disabled={isApplyingBackendUrl}
        onSwitchToLogin={() => (mode = "login")}
      />
    {/if}
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={backendUrlDialogOpen}>
  <Dialog.Content class="sm:max-w-md">
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

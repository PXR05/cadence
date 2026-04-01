<script lang="ts">
  import { goto } from "$app/navigation";
  import { authStore } from "$lib/stores/auth.svelte";
  import { Button } from "$lib/components/ui/button";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import SettingCard from "$lib/components/SettingCard.svelte";
  import { onMount } from "svelte";
  import { mode, setMode, resetMode } from "mode-watcher";
  import {
    AudioWaveformIcon,
    ChevronRightIcon,
    DownloadIcon,
    EllipsisVerticalIcon,
    LogOutIcon,
    MoonIcon,
    PaletteIcon,
    ShieldIcon,
    SunIcon,
    UserIcon,
    KeyRoundIcon,
    MonitorIcon,
    DatabaseIcon,
    ServerIcon,
    AlertTriangleIcon,
  } from "@lucide/svelte";
  import { Input } from "$lib/components/ui/input";
  import BackendUrlUpdateField from "$lib/components/BackendUrlUpdateField.svelte";
  import { toast } from "svelte-sonner";
  import * as Dialog from "$lib/components/ui/dialog";
  import { slide } from "svelte/transition";
  import MenuDialog from "$lib/components/ui/menu-dialog/MenuDialog.svelte";
  import { playerStore } from "$lib/stores/player.svelte";
  import { appearanceStore } from "$lib/stores/appearance.svelte";
  import { useSidebar } from "$lib/components/ui/sidebar";
  import {
    apiUrlStore,
    getBackendUrl,
    normalizeApiUrl,
  } from "$lib/stores/apiUrl.svelte";
  import { applyApiUrlChange } from "$lib/utils/apiUrlChange";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";

  const isAdmin = $derived(authStore.isAdmin);
  let accountMenuOpen = $state(false);
  let passwordDialogOpen = $state(false);

  let currentPassword = $state("");
  let newPassword = $state("");
  let confirmPassword = $state("");
  let isChangingPassword = $state(false);

  let deferredPrompt: BeforeInstallPromptEvent | null = $state(null);
  let canInstall = $state(false);
  let isInstalled = $state(false);
  let backendUrlInput = $state("");
  let pendingBackendUrl = $state("");
  let backendUrlError = $state("");
  let isApplyingBackendUrl = $state(false);
  let backendChangeDialogOpen = $state(false);

  interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  }

  onMount(() => {
    try {
      backendUrlInput = getBackendUrl();
    } catch {
      backendUrlInput = apiUrlStore.defaultUrl;
    }

    if (window.matchMedia("(display-mode: standalone)").matches) {
      isInstalled = true;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      canInstall = true;
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      canInstall = false;
      isInstalled = true;
      deferredPrompt = null;
    };
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  });

  async function handleLogout() {
    accountMenuOpen = false;
    await authStore.logout();
    goto("/");
  }

  async function handleChangePassword() {
    if (!currentPassword.trim()) {
      toast.error("Current password is required");
      return;
    }
    if (!newPassword.trim()) {
      toast.error("New password is required");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    isChangingPassword = true;
    try {
      await authStore.changePassword(currentPassword, newPassword);
      toast.success("Password changed successfully");
      currentPassword = "";
      newPassword = "";
      confirmPassword = "";
      passwordDialogOpen = false;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to change password",
      );
    } finally {
      isChangingPassword = false;
    }
  }

  function resetPasswordForm() {
    currentPassword = "";
    newPassword = "";
    confirmPassword = "";
  }

  function openChangePasswordDialog() {
    accountMenuOpen = false;
    passwordDialogOpen = true;
  }

  async function handleInstallPWA() {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        toast.success("App installed successfully!");
        canInstall = false;
        isInstalled = true;
      }
    } catch (error) {
      toast.error("Failed to install app");
    } finally {
      deferredPrompt = null;
    }
  }

  function resetBackendUrlInput(): void {
    if (apiUrlStore.defaultUrl) {
      backendUrlInput = apiUrlStore.defaultUrl;
      backendUrlError = "";
    }
  }

  function requestApplyBackendUrl(): void {
    backendUrlError = "";

    let normalized: string;
    try {
      normalized = normalizeApiUrl(backendUrlInput);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid backend URL";
      backendUrlError = message;
      toast.error(message);
      return;
    }

    let currentUrl = "";
    try {
      currentUrl = getBackendUrl();
    } catch {
      currentUrl = "";
    }

    if (currentUrl && normalized === currentUrl) {
      toast.info("Backend URL is unchanged");
      return;
    }

    pendingBackendUrl = normalized;
    backendChangeDialogOpen = true;
  }

  async function handleConfirmBackendUrlChange(): Promise<void> {
    isApplyingBackendUrl = true;
    backendUrlError = "";

    try {
      const result = await applyApiUrlChange(pendingBackendUrl);
      backendUrlInput = result.activeUrl;

      if (result.changed) {
        toast.success("Backend URL updated. Local content cache was reset.");
        goto("/");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update backend URL";
      backendUrlError = message;
      toast.error(message);
    } finally {
      isApplyingBackendUrl = false;
      backendChangeDialogOpen = false;
      pendingBackendUrl = "";
    }
  }

  const themeOptions = [
    { value: "light", label: "Light", icon: SunIcon },
    { value: "dark", label: "Dark", icon: MoonIcon },
    { value: "system", label: "System", icon: MonitorIcon },
  ] as const;

  const isSidebarCollapsed = $derived(useSidebar().state === "collapsed");
</script>

<svelte:head>
  <title
    >{playerStore.isPlaying && playerStore.currentTrack?.metadata?.title
      ? playerStore.currentTrack.metadata?.title
      : "Settings"} | Cadence</title
  >
</svelte:head>

{#snippet toggleSwitch(label: string, checked: boolean, onclick: () => void)}
  <button
    class="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
    {onclick}
  >
    <span class="text-sm font-medium">{label}</span>
    <div
      class="relative w-11 h-6 rounded-full transition-colors {checked
        ? 'bg-primary'
        : 'bg-muted-foreground/30'}"
    >
      <div
        class="absolute top-1 size-4 rounded-full bg-white transition-transform {checked
          ? 'translate-x-6'
          : 'translate-x-1'}"
      ></div>
    </div>
  </button>
{/snippet}

<div
  style="--h: 5.5rem;"
  class="p-2 fixed top-0 left-0 right-0 z-30 flex items-end justify-between transition-[left] duration-200
  {isSidebarCollapsed ? 'md:left-16' : 'md:left-64'}
  "
>
  <div class="_bg _color absolute inset-0 -z-10"></div>
  <h2 class="text-2xl font-semibold p-2">Settings</h2>
</div>

<div class="h-dvh">
  <div class="p-4 pt-16 h-full w-full space-y-4 mb-[50dvh]">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div
          class="size-14 rounded-xl bg-primary/10 flex items-center justify-center"
        >
          <UserIcon class="size-5 text-primary" />
        </div>
        <div>
          <p class="font-medium">
            {authStore.user?.username ?? "Unknown"}
          </p>
          <p class="text-sm text-muted-foreground capitalize">
            {authStore.user?.role ?? "User"}
          </p>
        </div>
      </div>
      <div>
        {#if isAdmin}
          <Button
            variant="ghost"
            size="icon"
            class="size-11"
            href="/settings/admin"
          >
            <ShieldIcon class="size-5" />
          </Button>
        {/if}
        <Button
          variant="ghost"
          size="icon"
          class="size-11"
          onclick={() => (accountMenuOpen = true)}
          title="Account options"
        >
          <EllipsisVerticalIcon class="size-5" />
        </Button>
      </div>
    </div>

    {#if canInstall && !isInstalled}
      <button
        transition:slide={{
          axis: "y",
          duration: appearanceStore.disableAnimations ? 0 : 200,
        }}
        class="flex items-center justify-between w-full p-4 rounded-xl border bg-background md:bg-card hover:bg-muted/50 transition-colors text-left"
        onclick={handleInstallPWA}
      >
        <div class="flex items-center gap-3">
          <DownloadIcon class="size-5 text-muted-foreground" />
          <div>
            <p class="font-medium">Install App</p>
            <p class="text-sm text-muted-foreground">
              Install Cadence as an app on your device
            </p>
          </div>
        </div>
        <ChevronRightIcon class="size-5 text-muted-foreground" />
      </button>
    {/if}

    <!-- Audio Settings -->
    <button
      class="flex items-center justify-between w-full p-4 rounded-xl border bg-background md:bg-card hover:bg-muted/50 transition-colors text-left"
      onclick={() => goto("/settings/audio")}
    >
      <div class="flex items-center gap-3">
        <AudioWaveformIcon class="size-5 text-muted-foreground" />
        <div>
          <p class="font-medium">Audio Settings</p>
          <p class="text-sm text-muted-foreground">
            Equalizer, pre-amp, and audio processing
          </p>
        </div>
      </div>
      <ChevronRightIcon class="size-5 text-muted-foreground" />
    </button>

    <!-- Local Storage Settings -->
    <button
      class="flex items-center justify-between w-full p-4 rounded-xl border bg-background md:bg-card hover:bg-muted/50 transition-colors text-left"
      onclick={() => goto("/settings/storage")}
    >
      <div class="flex items-center gap-3">
        <DatabaseIcon class="size-5 text-muted-foreground" />
        <div>
          <p class="font-medium">Local Storage</p>
          <p class="text-sm text-muted-foreground">
            Manage cached data and offline content
          </p>
        </div>
      </div>
      <ChevronRightIcon class="size-5 text-muted-foreground" />
    </button>

    <SettingCard icon={ServerIcon} title="Backend URL">
      <div class="p-3 pt-1 space-y-3">
        <p class="text-sm text-muted-foreground">
          Change the backend server URL.
        </p>
        <BackendUrlUpdateField
          bind:value={backendUrlInput}
          defaultValue={apiUrlStore.defaultUrl}
          isApplying={isApplyingBackendUrl}
          error={backendUrlError}
          onReset={resetBackendUrlInput}
          onApply={requestApplyBackendUrl}
        />
      </div>
    </SettingCard>

    <!-- Theme Settings -->
    <SettingCard icon={PaletteIcon} title="Appearance">
      <div class="p-3 pt-1 space-y-4">
        <div class="space-y-3">
          <p class="text-sm text-muted-foreground">
            Choose your preferred theme
          </p>
          <div class="grid grid-cols-3 gap-2">
            {#each themeOptions as option}
              {@const Icon = option.icon}
              <Button
                variant={mode.current === option.value ||
                (mode.current === undefined && option.value === "system")
                  ? "default"
                  : "outline"}
                class="flex flex-col gap-1 h-auto py-3"
                onclick={() =>
                  option.value === "system"
                    ? resetMode()
                    : setMode(option.value as "light" | "dark")}
              >
                <Icon class="size-5" />
                <span class="text-xs">{option.label}</span>
              </Button>
            {/each}
          </div>
        </div>

        <div class="border-t pt-4 space-y-3">
          <p class="text-sm text-muted-foreground">Visual effects</p>
          <div class="space-y-2">
            {@render toggleSwitch(
              "Disable Blur",
              appearanceStore.disableBlur,
              () => appearanceStore.toggleBlur(),
            )}
            {@render toggleSwitch(
              "Disable Animations",
              appearanceStore.disableAnimations,
              () => appearanceStore.toggleAnimations(),
            )}
          </div>
        </div>
      </div>
    </SettingCard>

    <p
      class="w-fit text-xs text-muted-foreground bg-muted rounded-md px-2 py-1"
    >
      {import.meta.env.COMMIT_HASH} - {import.meta.env.BUILD_DATE}
    </p>

    <div class="h-64"></div>
  </div>
</div>

<!-- Account Menu Dialog -->
<MenuDialog
  open={accountMenuOpen}
  onOpenChange={(open) => (accountMenuOpen = open)}
  title={authStore.user?.username ?? "Account"}
  subtitle={authStore.user?.role ?? "User"}
>
  {#snippet imageFallback()}
    <UserIcon class="size-8 text-muted-foreground" />
  {/snippet}
  {#snippet menuItems()}
    <Button
      variant="ghost"
      class="w-full justify-start gap-3 h-12"
      onclick={openChangePasswordDialog}
    >
      <KeyRoundIcon class="size-5" />
      Change Password
    </Button>
    <Button
      variant="ghost"
      class="w-full justify-start gap-3 h-12 text-destructive hover:text-destructive"
      onclick={handleLogout}
    >
      <LogOutIcon class="size-5" />
      Sign Out
    </Button>
  {/snippet}
</MenuDialog>

<!-- Change Password Dialog -->
<Dialog.Root
  bind:open={passwordDialogOpen}
  onOpenChange={(open) => {
    if (!open) resetPasswordForm();
  }}
>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Change Password</Dialog.Title>
      <Dialog.Description>
        Enter your current password and a new password.
      </Dialog.Description>
    </Dialog.Header>
    <form
      class="space-y-4"
      onsubmit={(e) => {
        e.preventDefault();
        handleChangePassword();
      }}
    >
      <div class="space-y-2">
        <label for="current-password" class="text-sm font-medium">
          Current Password
        </label>
        <Input
          id="current-password"
          type="password"
          bind:value={currentPassword}
          placeholder="Enter current password"
          disabled={isChangingPassword}
        />
      </div>
      <div class="space-y-2">
        <label for="new-password" class="text-sm font-medium">
          New Password
        </label>
        <Input
          id="new-password"
          type="password"
          bind:value={newPassword}
          placeholder="Enter new password"
          disabled={isChangingPassword}
        />
      </div>
      <div class="space-y-2">
        <label for="confirm-password" class="text-sm font-medium">
          Confirm Password
        </label>
        <Input
          id="confirm-password"
          type="password"
          bind:value={confirmPassword}
          placeholder="Confirm new password"
          disabled={isChangingPassword}
        />
      </div>
      <Dialog.Footer>
        <Button
          type="button"
          variant="outline"
          onclick={() => (passwordDialogOpen = false)}
          disabled={isChangingPassword}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isChangingPassword ||
            !currentPassword ||
            !newPassword ||
            !confirmPassword}
        >
          {isChangingPassword ? "Changing..." : "Change Password"}
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

<AlertDialog.Root bind:open={backendChangeDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <div class="flex items-center gap-3 mb-2">
        <div
          class="size-10 rounded-full bg-destructive/10 flex items-center justify-center"
        >
          <AlertTriangleIcon class="size-5 text-destructive" />
        </div>
        <AlertDialog.Title>Apply New Backend URL?</AlertDialog.Title>
      </div>
      <AlertDialog.Description>
        This will sign you out and clear cached content (tracks, playlists,
        offline data, history, and download queues). Theme and visual
        preferences are kept.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel disabled={isApplyingBackendUrl}>
        Cancel
      </AlertDialog.Cancel>
      <AlertDialog.Action
        class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        onclick={handleConfirmBackendUrlChange}
        disabled={isApplyingBackendUrl}
      >
        {isApplyingBackendUrl ? "Applying..." : "Apply & Reset"}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<style>
  ._bg {
    &::before,
    &::after {
      pointer-events: none;
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      z-index: -1;
      mask: linear-gradient(to top, transparent, black 90%);
    }
    &::before {
      height: var(--h);
    }
    &::after {
      height: calc(var(--h) - 1rem);
    }
  }

  ._color {
    &::before,
    &::after {
      background-color: var(--background);
    }
  }
</style>

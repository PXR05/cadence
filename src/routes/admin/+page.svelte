<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import {
    LoaderIcon,
    LogOutIcon,
    UserPlusIcon,
    MusicIcon,
  } from "@lucide/svelte";
  import {
    UserTable,
    DeleteUserDialog,
    CreateUserDialog,
    ChangePasswordDialog,
    ResetPasswordDialog,
    AddTrackDialog,
    TrackTable,
    DeleteTrackDialog,
    TrackPagination,
  } from "$lib/components/admin";
  import { tracksStore } from "$lib/stores/tracks.svelte";
  import { authStore } from "$lib/stores/auth.svelte";
  import { youtubeDownloadStore } from "$lib/stores/youtubeDownload.svelte";
  import {
    getCurrentUser,
    listUsers,
    deleteUser,
    createUser,
    resetUserPassword,
    fetchTracks,
    deleteTrack,
    type User,
  } from "$lib/api";
  import { toast } from "svelte-sonner";
  import { Button } from "$lib/components/ui/button";

  let isAdmin = $state(false);
  let loading = $state(true);
  let usersLoading = $state(false);
  let usersInitialLoading = $state(true);

  let users: User[] = $state([]);
  let usersCurrentPage = $state(1);
  let usersTotalPages = $state(1);

  let deleteDialogOpen = $state(false);
  let createUserDialogOpen = $state(false);
  let changePasswordDialogOpen = $state(false);
  let resetPasswordDialogOpen = $state(false);
  let addTrackDialogOpen = $state(false);
  let selectedUser = $state<User | null>(null);

  let activeTab = $state<"users" | "tracks">("tracks");

  let tracksLoading = $state(false);
  let tracksInitialLoading = $state(true);
  let tracks: AudioFile[] = $state([]);
  let tracksCurrentPage = $state(1);
  let tracksTotalPages = $state(1);
  let deleteTrackDialogOpen = $state(false);
  let selectedTrack = $state<AudioFile | null>(null);

  onMount(async () => {
    try {
      const result = await getCurrentUser();
      isAdmin = result.data.role === "admin";
      if (!isAdmin) {
        goto("/");
        return;
      }
      await loadUsers();
      await loadTracks();
    } catch {
      goto("/");
    } finally {
      loading = false;
    }
  });

  function setMessage(type: "error" | "success", message: string) {
    if (type === "error") {
      toast.error(message);
    } else {
      toast.success(message);
    }
  }

  async function loadUsers(page: number = 1) {
    usersLoading = true;
    try {
      const result = await listUsers({ page, limit: 10 });
      users = result.data;
      usersCurrentPage = result.currentPage ?? 1;
      usersTotalPages = result.totalPages ?? 1;
    } catch {
      setMessage("error", "Failed to load users");
    } finally {
      usersLoading = false;
      usersInitialLoading = false;
    }
  }

  function openDeleteDialog(user: User) {
    selectedUser = user;
    deleteDialogOpen = true;
  }

  function openChangePasswordDialog(user: User) {
    selectedUser = user;
    changePasswordDialogOpen = true;
  }

  function openResetPasswordDialog(user: User) {
    selectedUser = user;
    resetPasswordDialogOpen = true;
  }

  async function confirmDelete() {
    if (!selectedUser) return;

    deleteDialogOpen = false;
    usersLoading = true;

    try {
      await deleteUser(selectedUser.id);
      await loadUsers(usersCurrentPage);
      setMessage("success", "User deleted");
    } catch {
      setMessage("error", "Failed to delete user");
    } finally {
      usersLoading = false;
      selectedUser = null;
    }
  }

  async function handleCreateUser(username: string, password: string) {
    usersLoading = true;
    try {
      await createUser(username, password);
      await loadUsers(usersCurrentPage);
      setMessage("success", "User created successfully");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create user";
      setMessage("error", errorMessage);
      throw err;
    } finally {
      usersLoading = false;
    }
  }

  async function handleChangePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ) {
    usersLoading = true;
    try {
      await authStore.changePassword(currentPassword, newPassword);
      setMessage("success", "Password changed successfully");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to change password";
      setMessage("error", errorMessage);
      throw err;
    } finally {
      usersLoading = false;
    }
  }

  async function handleResetPassword(userId: string, newPassword: string) {
    usersLoading = true;
    try {
      await resetUserPassword(userId, newPassword);
      setMessage("success", "Password reset successfully");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to reset password";
      setMessage("error", errorMessage);
      throw err;
    } finally {
      usersLoading = false;
    }
  }

  function openCreateUserDialog() {
    createUserDialogOpen = true;
  }

  function openAddTrackDialog() {
    addTrackDialogOpen = true;
  }

  async function loadTracks(page: number = 1) {
    tracksLoading = true;
    try {
      const result = await fetchTracks({ page, limit: 10 });
      tracks = result.tracks;
      tracksCurrentPage = result.currentPage;
      tracksTotalPages = result.totalPages ?? 1;
    } catch {
      setMessage("error", "Failed to load tracks");
    } finally {
      tracksLoading = false;
      tracksInitialLoading = false;
    }
  }

  async function handleUploadComplete(
    successCount: number,
    totalCount: number
  ) {
    setMessage("success", `Uploaded ${successCount}/${totalCount} files`);
    await loadTracks(tracksCurrentPage);
    tracksStore.loadAllTracks(true);
  }

  function handleUploadError(error: string) {
    setMessage("error", error);
  }

  async function handleYoutubeUpload(url: string) {
    try {
      await youtubeDownloadStore.downloadFromUrl(url);
      setMessage("success", "Downloaded from YouTube");
      await loadTracks(tracksCurrentPage);
      tracksStore.loadAllTracks(true);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to download from YouTube";
      setMessage("error", errorMessage);
    }
  }

  function openDeleteTrackDialog(track: AudioFile) {
    selectedTrack = track;
    deleteTrackDialogOpen = true;
  }

  async function confirmDeleteTrack() {
    if (!selectedTrack) return;

    deleteTrackDialogOpen = false;
    tracksLoading = true;

    try {
      await deleteTrack(selectedTrack.id);
      await loadTracks(tracksCurrentPage);
      tracksStore.loadAllTracks(true);
      setMessage("success", "Track deleted");
    } catch {
      setMessage("error", "Failed to delete track");
    } finally {
      tracksLoading = false;
      selectedTrack = null;
    }
  }

  function switchTab(tab: "users" | "tracks") {
    activeTab = tab;
  }

  function handleLogout() {
    authStore.logout();
    goto("/");
  }
</script>

<svelte:head>
  <title>Admin | Cadence</title>
</svelte:head>

{#if loading}
  <div class="flex items-center justify-center h-full">
    <LoaderIcon class="animate-spin text-muted-foreground" size={24} />
  </div>
{:else}
  <div
    class="relative flex flex-col mx-auto w-full h-full border-x overflow-y-auto"
  >
    <div class="flex border-b sticky top-0 p-2 z-50 gap-2 bg-background">
      <Button
        variant={activeTab === "tracks" ? "default" : "outline"}
        onclick={() => switchTab("tracks")}
        class="flex-1"
      >
        Tracks
      </Button>
      <Button
        variant={activeTab === "users" ? "default" : "outline"}
        onclick={() => switchTab("users")}
        class="flex-1"
      >
        Users
      </Button>
      <Button
        variant="outline"
        size="icon"
        onclick={handleLogout}
        title="Logout"
      >
        <LogOutIcon size={18} />
      </Button>
    </div>

    <div class="relative p-2 space-y-2">
      {#if activeTab === "users"}
        <div class="flex justify-between items-center gap-2 w-full">
          <h2 class="text-2xl font-semibold p-2">Users</h2>
          <Button onclick={openCreateUserDialog} class="gap-2">
            <UserPlusIcon size={18} />
            Create User
          </Button>
        </div>

        <UserTable
          {users}
          loading={usersLoading}
          initialLoading={usersInitialLoading}
          onDelete={openDeleteDialog}
          onResetPassword={openResetPasswordDialog}
          onChangePassword={openChangePasswordDialog}
        />

        {#if usersTotalPages > 1}
          <TrackPagination
            currentPage={usersCurrentPage}
            totalPages={usersTotalPages}
            loading={usersLoading}
            onPageChange={loadUsers}
          />
        {/if}
      {:else}
        <div class="flex justify-between items-center gap-2 w-full">
          <h2 class="text-2xl font-semibold p-2">Tracks</h2>
          <Button onclick={openAddTrackDialog} class="gap-2">
            <MusicIcon size={18} />
            Add Track
          </Button>
        </div>

        <TrackTable
          {tracks}
          loading={tracksLoading}
          initialLoading={tracksInitialLoading}
          onDelete={openDeleteTrackDialog}
        />

        {#if tracksTotalPages > 1}
          <TrackPagination
            currentPage={tracksCurrentPage}
            totalPages={tracksTotalPages}
            loading={tracksLoading}
            onPageChange={loadTracks}
          />
        {/if}
      {/if}
    </div>
  </div>
{/if}

<DeleteUserDialog
  bind:open={deleteDialogOpen}
  username={selectedUser?.username ?? ""}
  onConfirm={confirmDelete}
/>

<CreateUserDialog
  bind:open={createUserDialogOpen}
  onCreateUser={handleCreateUser}
  loading={usersLoading}
/>

<ChangePasswordDialog
  bind:open={changePasswordDialogOpen}
  username={selectedUser?.username ?? ""}
  userId={selectedUser?.id ?? ""}
  onConfirm={handleChangePassword}
/>

<ResetPasswordDialog
  bind:open={resetPasswordDialogOpen}
  username={selectedUser?.username ?? ""}
  userId={selectedUser?.id ?? ""}
  onConfirm={handleResetPassword}
/>

<AddTrackDialog
  bind:open={addTrackDialogOpen}
  loading={tracksLoading}
  onUploadComplete={handleUploadComplete}
  onUploadError={handleUploadError}
  onYoutubeUpload={handleYoutubeUpload}
/>

<DeleteTrackDialog
  bind:open={deleteTrackDialogOpen}
  trackName={selectedTrack?.metadata?.title ||
    selectedTrack?.filename ||
    "this track"}
  onConfirm={confirmDeleteTrack}
/>

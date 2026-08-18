<script lang="ts">
  import { toast } from "svelte-sonner";
  import {
    UserPlus as UserPlusIcon,
    Users as UsersIcon,
  } from "@lucide/svelte";
  import { Button } from "$lib/components/ui/button";
  import {
    listUsers,
    deleteUser,
    createUser,
    resetUserPassword,
  } from "$lib/backend/services/auth";
  import { authStore } from "$lib/stores/auth.svelte";
  import UserTable from "./UserTable.svelte";
  import DeleteUserDialog from "./DeleteUserDialog.svelte";
  import CreateUserDialog from "./CreateUserDialog.svelte";
  import ChangePasswordDialog from "./ChangePasswordDialog.svelte";
  import ResetPasswordDialog from "./ResetPasswordDialog.svelte";
  import TrackPagination from "./TrackPagination.svelte";
  import type { User } from "$lib/schemas";
  import { onMount } from "svelte";

  let usersLoading = $state(false);
  let usersInitialLoading = $state(true);

  let users: User[] = $state([]);
  let usersCurrentPage = $state(1);
  let usersTotalPages = $state(1);

  let deleteDialogOpen = $state(false);
  let createUserDialogOpen = $state(false);
  let changePasswordDialogOpen = $state(false);
  let resetPasswordDialogOpen = $state(false);
  let selectedUser = $state<User | null>(null);

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

  onMount(() => {
    loadUsers();
  });

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
      await createUser({ username, password });
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
    newPassword: string,
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
      await resetUserPassword({ userId, newPassword });
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
</script>

<section class="space-y-3" aria-labelledby="user-management-title">
  <div class="flex items-center justify-between gap-3 px-1 py-2">
    <div class="flex min-w-0 items-center gap-3">
      <div class="grid size-10 shrink-0 place-items-center rounded-xl bg-muted">
        <UsersIcon class="size-5 text-muted-foreground" />
      </div>
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <h2 id="user-management-title" class="font-semibold">People</h2>
          {#if !usersInitialLoading}
            <span
              class="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground"
            >
              {users.length} shown
            </span>
          {/if}
        </div>
        <p class="truncate text-sm text-muted-foreground">
          Accounts with access to this server
        </p>
      </div>
    </div>
    <Button onclick={openCreateUserDialog} class="shrink-0 gap-2">
      <UserPlusIcon class="size-4" />
      <span class="hidden sm:inline">Create user</span>
      <span class="sm:hidden">Add</span>
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
</section>

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

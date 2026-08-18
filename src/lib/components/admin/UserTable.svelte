<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { TableCell, TableHead, TableRow } from "$lib/components/ui/table";
  import type { User } from "$lib/schemas";
  import { authStore } from "$lib/stores/auth.svelte";
  import {
    Trash2 as Trash2Icon,
    Loader as LoaderIcon,
    KeyRound as KeyRoundIcon,
    LockKeyhole as LockKeyholeIcon,
    UserRound as UserIcon,
  } from "@lucide/svelte";

  let {
    users,
    loading,
    initialLoading,
    onDelete,
    onResetPassword,
    onChangePassword,
  } = $props<{
    users: User[];
    loading: boolean;
    initialLoading: boolean;
    onDelete: (user: User) => void;
    onResetPassword: (user: User) => void;
    onChangePassword: (user: User) => void;
  }>();

  function formatDate(dateString?: string) {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString();
  }

  function getInitial(username: string) {
    return username.trim().charAt(0).toUpperCase() || "?";
  }
</script>

<div
  class="relative min-h-80 overflow-hidden rounded-2xl border bg-background md:bg-card"
  aria-busy={loading}
>
  {#if loading && !initialLoading}
    <div
      class="absolute right-3 top-3 z-20 grid size-8 place-items-center rounded-full border bg-background/90 shadow-sm backdrop-blur-sm"
      aria-label="Refreshing users"
    >
      <LoaderIcon class="size-4 animate-spin text-muted-foreground" />
    </div>
  {/if}

  {#if initialLoading}
    <div class="divide-y" aria-label="Loading users">
      {#each Array(6) as _}
        <div class="flex items-center gap-3 p-4">
          <div class="size-10 shrink-0 animate-pulse rounded-full bg-muted"></div>
          <div class="flex-1 space-y-2">
            <div class="h-3.5 w-1/3 animate-pulse rounded bg-muted"></div>
            <div class="h-3 w-1/5 animate-pulse rounded bg-muted"></div>
          </div>
        </div>
      {/each}
    </div>
  {:else if users.length === 0}
    <div class="flex min-h-80 flex-col items-center justify-center gap-3 p-8 text-center">
      <div class="grid size-12 place-items-center rounded-2xl bg-muted">
        <UserIcon class="size-6 text-muted-foreground" />
      </div>
      <div>
        <p class="font-medium">No users found</p>
        <p class="mt-1 text-sm text-muted-foreground">
          Create an account to give someone access.
        </p>
      </div>
    </div>
  {:else}
    <div
      class="hidden overflow-x-auto transition-opacity md:block {loading
        ? 'pointer-events-none opacity-50'
        : ''}"
    >
      <table class="w-full caption-bottom text-sm">
        <thead class="border-b bg-muted/35 [&_tr]:border-b-0">
          <TableRow class="hover:bg-transparent">
            <TableHead class="h-11 pl-4">User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Last login</TableHead>
            <TableHead class="w-36 pr-4 text-right">Actions</TableHead>
          </TableRow>
        </thead>
        <tbody class="[&_tr:last-child]:border-0">
          {#each users as user}
            <TableRow class="group">
              <TableCell class="pl-4">
                <div class="flex items-center gap-3">
                  <div
                    class="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-sm font-semibold text-muted-foreground"
                  >
                    {getInitial(user.username)}
                  </div>
                  <span class="font-medium">{user.username}</span>
                </div>
              </TableCell>
              <TableCell>
                <span
                  class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium capitalize {user.role ===
                  'admin'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'}"
                >
                  {user.role}
                </span>
              </TableCell>
              <TableCell class="text-muted-foreground">
                {formatDate(user.createdAt)}
              </TableCell>
              <TableCell class="text-muted-foreground">
                {formatDate(user.lastLoginAt)}
              </TableCell>
              <TableCell class="pr-4">
                <div class="flex justify-end gap-1">
                  {#if user.id === authStore.user?.id}
                    <Button
                      variant="ghost"
                      size="icon"
                      class="size-9 text-muted-foreground"
                      onclick={() => onChangePassword(user)}
                      disabled={loading}
                      title="Change your password"
                      aria-label="Change your password"
                    >
                      <LockKeyholeIcon class="size-4" />
                    </Button>
                  {/if}
                  <Button
                    variant="ghost"
                    size="icon"
                    class="size-9 text-muted-foreground"
                    onclick={() => onResetPassword(user)}
                    disabled={loading}
                    title="Reset password (admin)"
                    aria-label={`Reset password for ${user.username}`}
                  >
                    <KeyRoundIcon class="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    class="size-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onclick={() => onDelete(user)}
                    disabled={user.role === "admin" || loading}
                    title="Delete user"
                    aria-label={`Delete ${user.username}`}
                  >
                    <Trash2Icon class="size-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          {/each}
        </tbody>
      </table>
    </div>

    <div
      class="divide-y transition-opacity md:hidden {loading
        ? 'pointer-events-none opacity-50'
        : ''}"
    >
      {#each users as user}
        <article class="space-y-3 p-4">
          <div class="flex items-center gap-3">
            <div
              class="grid size-11 shrink-0 place-items-center rounded-full bg-muted font-semibold text-muted-foreground"
            >
              {getInitial(user.username)}
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <h3 class="truncate font-medium">{user.username}</h3>
                <span
                  class="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize {user.role ===
                  'admin'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'}"
                >
                  {user.role}
                </span>
              </div>
              <p class="text-xs text-muted-foreground">
                Last login: {formatDate(user.lastLoginAt)}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-1 border-t pt-2">
            {#if user.id === authStore.user?.id}
              <Button
                variant="ghost"
                size="sm"
                class="flex-1 gap-2 text-muted-foreground"
                onclick={() => onChangePassword(user)}
                disabled={loading}
              >
                <LockKeyholeIcon class="size-4" />
                Change mine
              </Button>
            {/if}
            <Button
              variant="ghost"
              size="sm"
              class="flex-1 gap-2 text-muted-foreground"
              onclick={() => onResetPassword(user)}
              disabled={loading}
            >
              <KeyRoundIcon class="size-4" />
              Reset
            </Button>
            <Button
              variant="ghost"
              size="icon"
              class="size-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onclick={() => onDelete(user)}
              disabled={user.role === "admin" || loading}
              aria-label={`Delete ${user.username}`}
            >
              <Trash2Icon class="size-4" />
            </Button>
          </div>
        </article>
      {/each}
    </div>
  {/if}
</div>

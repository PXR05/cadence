<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { TableCell, TableHead, TableRow } from "$lib/components/ui/table";
  import type { User } from "$lib/schemas";
  import {
    Trash2 as Trash2Icon,
    Loader as LoaderIcon,
    KeyRound as KeyRoundIcon,
    LockKeyhole as LockKeyholeIcon,
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
</script>

<div
  class="border rounded-xl relative flex flex-col h-[530px] overflow-hidden"
>
  <div class="overflow-auto flex-1">
    <table class="w-full caption-bottom text-sm">
      <thead class="sticky top-0 bg-background z-10 border-b [&_tr]:border-b">
        <TableRow>
          <TableHead class="pl-4">Username</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Last Login</TableHead>
          <TableHead class="w-32 pr-4">Actions</TableHead>
        </TableRow>
      </thead>
      <tbody
        class={loading && !initialLoading
          ? "blur-sm opacity-50 pointer-events-none [&_tr:last-child]:border-0"
          : "[&_tr:last-child]:border-0"}
      >
        {#if initialLoading}
          <TableRow>
            <TableCell colspan={5} class="text-center py-8">
              <LoaderIcon
                class="animate-spin mx-auto text-muted-foreground"
                size={24}
              />
            </TableCell>
          </TableRow>
        {:else if users.length === 0}
          <TableRow>
            <TableCell
              colspan={5}
              class="text-center py-8 text-muted-foreground"
            >
              No users found
            </TableCell>
          </TableRow>
        {:else}
          {#each users as user}
            <TableRow>
              <TableCell class="font-medium pl-4">{user.username}</TableCell>
              <TableCell>
                <span
                  class="inline-flex items-center py-1 rounded-full text-xs font-medium"
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
                <div class="flex gap-4">
                  <Button
                    variant="link"
                    size="sm"
                    class="p-0!"
                    onclick={() => onChangePassword(user)}
                    disabled={loading}
                    title="Change password"
                  >
                    <LockKeyholeIcon size={14} />
                  </Button>
                  <Button
                    variant="link"
                    size="sm"
                    class="p-0!"
                    onclick={() => onResetPassword(user)}
                    disabled={loading}
                    title="Reset password (admin)"
                  >
                    <KeyRoundIcon size={14} />
                  </Button>
                  <Button
                    variant="link"
                    size="sm"
                    class="p-0!"
                    onclick={() => onDelete(user)}
                    disabled={user.role === "admin" || loading}
                    title="Delete user"
                  >
                    <Trash2Icon size={14} />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
</div>

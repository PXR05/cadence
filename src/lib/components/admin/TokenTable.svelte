<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Table from "$lib/components/ui/table";
  import { LoaderIcon, Trash2Icon, RefreshCwIcon } from "@lucide/svelte";
  import type { TokenInfo } from "$lib/api";

  let {
    tokens,
    loading = false,
    filterUserId = "",
    onReroll,
    onDelete,
  }: {
    tokens: TokenInfo[];
    loading: boolean;
    filterUserId: string;
    onReroll: (token: TokenInfo) => void;
    onDelete: (token: TokenInfo) => void;
  } = $props();

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
</script>

<div class="border">
  {#if loading && tokens.length === 0}
    <div class="flex items-center justify-center p-8">
      <LoaderIcon class="animate-spin text-muted-foreground" size={20} />
    </div>
  {:else if tokens.length === 0}
    <p class="text-muted-foreground text-center p-8 text-sm">
      {filterUserId ? `No tokens for "${filterUserId}"` : "No tokens yet"}
    </p>
  {:else}
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head>Name</Table.Head>
          <Table.Head>User</Table.Head>
          <Table.Head>Created</Table.Head>
          <Table.Head>Last Used</Table.Head>
          <Table.Head class="text-right">Actions</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each tokens as token (token.id)}
          <Table.Row>
            <Table.Cell class="font-medium">{token.name}</Table.Cell>
            <Table.Cell class="font-mono text-xs">{token.userId}</Table.Cell>
            <Table.Cell class="text-muted-foreground text-xs">
              {formatDate(token.createdAt)}
            </Table.Cell>
            <Table.Cell class="text-muted-foreground text-xs">
              {token.lastUsedAt ? formatDate(token.lastUsedAt) : "Never"}
            </Table.Cell>
            <Table.Cell class="text-right">
              <div class="flex items-center justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onclick={() => onReroll(token)}
                  disabled={loading}
                >
                  <RefreshCwIcon size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onclick={() => onDelete(token)}
                  disabled={loading}
                >
                  <Trash2Icon size={14} />
                </Button>
              </div>
            </Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  {/if}
</div>

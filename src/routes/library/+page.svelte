<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { CreatePlaylistDialog, PlaylistCard } from "$lib/components";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import { PlusIcon, ChevronRightIcon } from "@lucide/svelte";
  import { playlistsStore } from "$lib/stores/playlists.svelte";

  let { data } = $props();

  let createDialogOpen = $state(false);
  const userPlaylists = $derived(data.userPlaylists);
  const specialPlaylists = $derived(data.specialPlaylists);
  const youtubePlaylists = $derived(data.youtubePlaylists);
  const allUserPlaylists = $derived([...specialPlaylists, ...userPlaylists]);

  async function handlePlaylistCreated() {
    playlistsStore.invalidate();
    await invalidateAll();
  }
</script>

<svelte:head>
  <title>Library | Cadence</title>
</svelte:head>

{#snippet sectionHeader(title: string, showAllLink?: string)}
  <div class="flex items-center justify-between mb-3">
    <h2 class="text-lg font-semibold">{title}</h2>
    {#if showAllLink}
      <a
        href={showAllLink}
        class="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
      >
        Show all
        <ChevronRightIcon size={16} />
      </a>
    {/if}
  </div>
{/snippet}

<div class="flex flex-col mx-auto w-full h-full border-x overflow-y-auto">
  <div class="space-y-2 p-4">
    <div>
      {@render sectionHeader("Your Playlists", "/library/type/user")}
      <ScrollArea orientation="horizontal">
        <div class="flex flex-row gap-4 pb-2 -mx-4 px-4">
          <button
            onclick={() => (createDialogOpen = true)}
            class="rounded-lg aspect-square w-40 flex-shrink-0 border hover:bg-muted/50 transition-colors grid place-items-center"
          >
            <PlusIcon
              size={48}
              absoluteStrokeWidth
              strokeWidth={2}
              class="text-muted-foreground"
            />
          </button>
          {#each allUserPlaylists as playlist (playlist.id)}
            <PlaylistCard {playlist} />
          {/each}
        </div>
      </ScrollArea>
    </div>

    {#if youtubePlaylists.length > 0}
      {@render sectionHeader("YouTube", "/library/type/youtube")}
      <ScrollArea orientation="horizontal">
        <div class="flex flex-row gap-4 pb-2 -mx-4 px-4">
          {#each youtubePlaylists as playlist (playlist.id)}
            <PlaylistCard {playlist} />
          {/each}
        </div>
      </ScrollArea>
    {/if}
  </div>
</div>

<CreatePlaylistDialog
  bind:open={createDialogOpen}
  onOpenChange={(open) => (createDialogOpen = open)}
  onCreated={handlePlaylistCreated}
/>

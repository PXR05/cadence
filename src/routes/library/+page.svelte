<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { CreatePlaylistDialog, PlaylistCard } from "$lib/components";
  import { LoaderIcon, PlusIcon, ChevronRightIcon } from "@lucide/svelte";

  let { data } = $props();

  let createDialogOpen = $state(false);
  const userPlaylists = $derived(data.userPlaylists);
  const specialPlaylists = $derived(data.specialPlaylists);
  const youtubePlaylists = $derived(data.youtubePlaylists);

  async function handlePlaylistCreated() {
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
    <section>
      {@render sectionHeader("Your Playlists", "/library/type/user")}
      <div class="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
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
        {#await Promise.all( [specialPlaylists, userPlaylists] ) then [specials, users]}
          {@const playlists = specials.concat(users)}
          {#each playlists as playlist (playlist.id)}
            <PlaylistCard {playlist} />
          {/each}
        {:catch error}
          <div class="flex items-center justify-center h-full">
            {error.message}
          </div>
        {/await}
      </div>
    </section>

    {#await youtubePlaylists then playlists}
      {#if playlists.length > 0}
        <section>
          {@render sectionHeader("YouTube", "/library/type/youtube")}
          <div class="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
            {#each playlists as playlist (playlist.id)}
              <PlaylistCard {playlist} />
            {/each}
          </div>
        </section>
      {/if}
    {:catch error}
      <div class="flex items-center justify-center h-full">
        {error.message}
      </div>
    {/await}
  </div>
</div>

<CreatePlaylistDialog
  bind:open={createDialogOpen}
  onOpenChange={(open) => (createDialogOpen = open)}
  onCreated={handlePlaylistCreated}
/>

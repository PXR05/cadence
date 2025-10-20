<script lang="ts">
  import { onMount } from "svelte";
  import { navigationStore } from "$lib/stores/navigation.svelte";
  import { PlaylistCard } from "$lib/components";
  import { Button } from "$lib/components/ui/button/index.js";
  import { ArrowLeftIcon } from "@lucide/svelte";
  import { ScrollArea } from "$lib/components/ui/scroll-area";

  let { data } = $props();

  let playlists = $state(data.playlists);
  const type = $derived(data.type);
  const specialPlaylists = $derived(data.specialPlaylists);
  const displayPlaylists = $derived(
    type === "user" ? [...specialPlaylists, ...playlists] : playlists
  );

  $effect(() => {
    if (data.streaming?.playlists) {
      data.streaming.playlists.then((freshPlaylists) => {
        playlists = freshPlaylists;
      });
    }
  });

  onMount(() => {
    navigationStore.setNavigation(
      [{ label: "Library", path: "/library" }],
      type
    );
  });
</script>

<svelte:head>
  <title>{type.charAt(0).toUpperCase() + type.slice(1)} | Cadence</title>
</svelte:head>

<div class="absolute top-0 w-full p-1.5 md:p-2 z-50">
  <div
    class="flex-1 flex items-center flex-row gap-1.5 md:gap-2 bg-muted/50 rounded-xl p-1.5 md:p-2 backdrop-blur-md border border-input"
  >
    <Button
      variant="ghost"
      size="icon"
      class="size-10"
      onclick={() => history.back()}
    >
      <ArrowLeftIcon />
    </Button>

    <h1 class="flex items-center gap-2 font-semibold truncate text-2xl">
      {type.charAt(0).toUpperCase() + type.slice(1)}
    </h1>
  </div>
</div>

<ScrollArea class="h-dvh">
  <div class="flex flex-col mx-auto w-full h-full border-x pt-15 md:pt-16.5">
    {#if displayPlaylists.length === 0}
      <div class="flex items-center justify-center h-full">
        <p class="text-muted-foreground">No playlists found</p>
      </div>
    {:else}
      <div class="p-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {#each displayPlaylists as playlist (playlist.id)}
          <PlaylistCard {playlist} size="large" />
        {/each}
      </div>
      <div class="h-[50dvh]"></div>
    {/if}
  </div>
</ScrollArea>

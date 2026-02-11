<script lang="ts">
  import { SearchView } from "$lib/components";
  import { playerStore } from "$lib/stores/player.svelte";
</script>

<svelte:head>
  <title>{playerStore.isPlaying && playerStore.currentTrack?.metadata?.title
      ? playerStore.currentTrack.metadata?.title
      : "Search"} | Cadence</title>
</svelte:head>

<div class="px-2">
  <SearchView />
</div>

<script lang="ts">
  import type { CarouselAPI } from "$lib/components/ui/carousel/context";
  import { playerStore } from "$lib/stores/player.svelte";
  import { onDestroy } from "svelte";
  import { innerWidth } from "svelte/reactivity/window";
  import PlayerBarDesktop from "./PlayerBarDesktop.svelte";
  import PlayerBarMobile from "./PlayerBarMobile.svelte";
  import QueueDialog from "../tracks/QueueDialog.svelte";
  import { useMenuDialogState } from "$lib/hooks";
  import { downloadStore } from "$lib/stores/download.svelte";
  import { trackMenuStore } from "$lib/stores/trackMenu.svelte";
  import type { AudioFile } from "$lib/schemas";

  const isMobile = $derived((innerWidth.current ?? 0) <= 768);
  let audioEl: HTMLAudioElement | null = $state(null);

  $effect(() => {
    if (audioEl && !playerStore.isLoaded) {
      playerStore.initialize(audioEl);
    }
  });

  onDestroy(() => {
    playerStore.cleanup();
  });

  function setCarouselApi(api: CarouselAPI | null) {
    if (api) {
      playerStore.initializeCarousel("main", api);
    }
  }

  const queueDialog = useMenuDialogState({
    paramName: "queue-dialog",
  });

  async function openTrackMenu(track?: AudioFile) {
    if (!track) {
      return;
    }
    const isOffline = await downloadStore.checkTrackOfflineStatus(track.id);
    const refreshOfflineStatus = async () => {
      await downloadStore.checkTrackOfflineStatus(track.id);
    };
    trackMenuStore.open(track, isOffline, refreshOfflineStatus);
  }

  function openCurrentTrackMenu() {
    void openTrackMenu(playerStore.currentTrack ?? undefined);
  }
</script>

{#if isMobile}
  <PlayerBarMobile
    {setCarouselApi}
    onQueueOpen={() => queueDialog.open("")}
  />
{:else}
  <PlayerBarDesktop
    {setCarouselApi}
    onQueueOpen={() => queueDialog.open("")}
    onMenuOpen={openCurrentTrackMenu}
  />
{/if}

<audio bind:this={audioEl} crossorigin="use-credentials"></audio>

<QueueDialog />

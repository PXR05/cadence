<script lang="ts">
  import { goto } from "$app/navigation";
  import { getImageUrl } from "$lib/constants";
  import { playerStore } from "$lib/stores/player.svelte";
  import { downloadStore } from "$lib/stores/download.svelte";
  import { trackMenuStore } from "$lib/stores/trackMenu.svelte";
  import * as Carousel from "$lib/components/ui/carousel";
  import type { CarouselAPI } from "$lib/components/ui/carousel/context";
  import { shouldLoadItem } from "$lib/utils/queue";
  import type { AudioFile } from "$lib/schemas";

  interface Props {
    onTrackClick?: () => void;
    setApi: (api: CarouselAPI | null) => void;
    isDisabled?: boolean;
  }

  let { onTrackClick, setApi, isDisabled = false }: Props = $props();

  async function openTrackMenu(track: AudioFile) {
    const isOffline = await downloadStore.checkTrackOfflineStatus(track.id);
    const refreshOfflineStatus = async () => {
      await downloadStore.checkTrackOfflineStatus(track.id);
    };
    trackMenuStore.open(track, isOffline, refreshOfflineStatus);
  }

  function handleContextMenu(e: MouseEvent, track: AudioFile) {
    e.preventDefault();
    e.stopPropagation();
    openTrackMenu(track);
  }
</script>

<div
  class="w-[calc(100dvw-5rem)] md:w-full self-center"
  class:pointer-events-none={isDisabled}
>
  <Carousel.Root
    class="w-full"
    opts={{ loop: true }}
    setApi={(emblaApi) => setApi(emblaApi ?? null)}
  >
    {#if playerStore.trackQueue.length === 0}
      <div class="pl-3 -mb-3">No track is playing</div>
    {:else}
      <Carousel.Content>
        {#each playerStore.trackQueue as track, i}
          {@const trackTitle = track.metadata?.title ?? track.filename ?? ""}
          {@const trackArtist = track.metadata?.artist ?? "Unknown Artist"}
          <Carousel.Item
            onclick={onTrackClick}
            oncontextmenu={(e) => handleContextMenu(e, track)}
            onlongpress={() => openTrackMenu(track)}
          >
            {#if shouldLoadItem(i)}
              <div
                class="flex items-center flex-1 min-w-0 gap-2 text-left w-full pl-2"
              >
                <img
                  loading="lazy"
                  crossorigin="use-credentials"
                  src={getImageUrl(track.id)}
                  alt={track.id}
                  class="rounded-md size-12 shrink-0 object-cover text-transparent"
                />
                <div class="text-left flex-1 min-w-0">
                  <p
                    class="font-medium truncate"
                    style="color: color-mix(in oklab, {playerStore.trackColor} 30%, var(--foreground));"
                  >
                    {trackTitle}
                  </p>
                  <p
                    class="text-sm truncate font-light"
                    style="color: color-mix(in oklab, {playerStore.trackColor} 30%, var(--muted-foreground));"
                  >
                    <span
                      role="link"
                      tabindex="0"
                      class="hover:underline cursor-pointer"
                      onclick={(e) => {
                        e.stopPropagation();
                        goto(`/playlist?id=artist_${trackArtist}`);
                      }}
                      onkeydown={(e) =>
                        e.key === "Enter" &&
                        goto(`/playlist?id=artist_${trackArtist}`)}
                      >{trackArtist}</span
                    >
                  </p>
                </div>
              </div>
            {/if}
          </Carousel.Item>
        {/each}
      </Carousel.Content>
    {/if}
  </Carousel.Root>
</div>

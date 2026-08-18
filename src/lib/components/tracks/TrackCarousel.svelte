<script lang="ts">
  import { getTrackImageUrl as getImageUrl } from "$lib/backend/services/media";
  import { playerStore } from "$lib/stores/player.svelte";
  import { downloadStore } from "$lib/stores/download.svelte";
  import { trackMenuStore } from "$lib/stores/trackMenu.svelte";
  import * as Carousel from "$lib/components/ui/carousel";
  import type { CarouselAPI } from "$lib/components/ui/carousel/context";
  import { shouldLoadItem } from "$lib/utils/queue";
  import type { AudioFile } from "$lib/schemas";
  import TrackInfo from "./TrackInfo.svelte";
  import { Image } from "../ui/image";

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
  class="w-[calc(100dvw-5.7rem)] md:w-full self-center"
  class:pointer-events-none={isDisabled}
>
  <Carousel.Root
    class="relative w-full"
    opts={{ loop: true }}
    setApi={(emblaApi) => setApi(emblaApi ?? null)}
  >
    {#if playerStore.trackQueue.length === 0}
      <div class="pl-3">No track is playing</div>
    {:else}
      <Carousel.Content>
        {#each playerStore.trackQueue as track, i}
          {@const trackTitle = track.metadata?.title ?? track.filename ?? ""}
          {@const trackArtists = (track.metadata?.artist ?? "Unknown").split(
            track.metadata?.artist?.includes(",") ? ", " : "、",
          )}
          <Carousel.Item
            onclick={onTrackClick}
            oncontextmenu={(e) => handleContextMenu(e, track)}
            onlongpress={() => openTrackMenu(track)}
          >
            {#if shouldLoadItem(i)}
              <div
                class="flex items-center flex-1 min-w-0 gap-2 md:gap-3.5 text-left w-full pl-2"
              >
                <Image
                  loading="lazy"
                  crossorigin="use-credentials"
                  src={getImageUrl(track.id)}
                  alt={track.id}
                  class="rounded-lg md:rounded-md size-12 md:size-16 shrink-0 object-cover text-transparent"
                />
                <TrackInfo
                  trackId={track.id}
                  title={trackTitle}
                  artists={trackArtists}
                  compact
                  openDialogOnClick={false}
                />
              </div>
            {/if}
          </Carousel.Item>
        {/each}
      </Carousel.Content>
    {/if}
  </Carousel.Root>
</div>

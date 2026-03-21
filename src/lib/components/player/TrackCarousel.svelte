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
    class="relative w-full"
    opts={{ loop: true }}
    setApi={(emblaApi) => setApi(emblaApi ?? null)}
  >
    {#if playerStore.trackQueue.length === 0}
      <div class="pl-3 -mb-3">No track is playing</div>
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
                <img
                  loading="lazy"
                  crossorigin="use-credentials"
                  src={getImageUrl(track.id)}
                  alt={track.id}
                  class="rounded-md size-12 md:size-16 shrink-0 object-cover text-transparent"
                />
                <div class="text-left flex-1 min-w-0 md:self-end md:pb-1">
                  <p
                    class="font-medium truncate"
                    style="color: {playerStore.lightTrackColor};"
                  >
                    {trackTitle}
                  </p>
                  <p
                    class="text-sm truncate opacity-70"
                    style="color: {playerStore.lightTrackColor};"
                  >
                    {#each trackArtists as a, artistIndex}
                      <span
                        role="link"
                        tabindex="0"
                        class="hover:underline cursor-pointer max-md:pointer-events-none"
                        onclick={(e) => {
                          e.stopPropagation();
                          goto(`/playlist?id=artist_${a}`);
                        }}
                        onkeydown={(e) =>
                          e.key === "Enter" && goto(`/playlist?id=artist_${a}`)}
                        >{a}</span
                      >{#if artistIndex < trackArtists.length - 1},&nbsp;{/if}
                    {/each}
                  </p>
                </div>
              </div>
            {/if}
          </Carousel.Item>
        {/each}
      </Carousel.Content>
      <span
        class="max-md:hidden absolute bg-[linear-gradient(to_right,transparent,var(--muted))] select-none right-0 top-0 bottom-0 h-16 w-8 z-50"
      >
      </span>
    {/if}
  </Carousel.Root>
</div>

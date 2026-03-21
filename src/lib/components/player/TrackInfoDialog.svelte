<script lang="ts">
  import { goto } from "$app/navigation";
  import { getImageUrl } from "$lib/constants";
  import { MenuDialog } from "$lib/components/ui/menu-dialog";
  import { useMenuDialogState } from "$lib/hooks";
  import { trackInfoDialogStore } from "$lib/stores/trackInfoDialog.svelte";
  import { tracksStore } from "$lib/stores/tracks.svelte";
  import { formatFileSize, formatTime } from "$lib/utils/format";

  const dialogState = useMenuDialogState({
    paramName: "track-info",
    onOpen: restoreTrackFromId,
    onClose: () => trackInfoDialogStore.clear(),
  });

  trackInfoDialogStore.registerDialogHandlers(
    dialogState.open,
    dialogState.close,
  );

  const track = $derived(trackInfoDialogStore.track);
  const title = $derived(
    track?.metadata?.title ?? track?.filename ?? "Unknown",
  );
  const artists = $derived(
    (track?.metadata?.artist ?? "Unknown Artist").split(
      track?.metadata?.artist?.includes(",") ? ", " : "、",
    ),
  );
  const albumName = $derived(track?.metadata?.album?.trim() || "Unknown Album");
  const subtitle = $derived(albumName);
  const imageUrl = $derived(track ? getImageUrl(track.id) : "");
  const duration = $derived(
    track?.metadata?.duration ? formatTime(track.metadata.duration) : "Unknown",
  );
  const year = $derived(
    track?.metadata?.year ? String(track.metadata.year) : "Unknown",
  );
  const format = $derived(track?.metadata?.format?.toUpperCase() || "Unknown");
  const bitrate = $derived(
    track?.metadata?.bitrate
      ? `${Math.round(track.metadata.bitrate / 1000)} kbps`
      : "Unknown",
  );
  const sampleRate = $derived(
    track?.metadata?.sampleRate
      ? `${(track.metadata.sampleRate / 1000).toFixed(1)} kHz`
      : "Unknown",
  );
  const channels = $derived.by(() => {
    const count = track?.metadata?.channels;
    if (!count) return "Unknown";
    if (count === 1) return "Mono";
    if (count === 2) return "Stereo";
    return `${count} channels`;
  });
  const genres = $derived(track?.metadata?.genre?.join(", ") || "Unknown");

  async function restoreTrackFromId(trackId: string) {
    if (trackInfoDialogStore.track?.id === trackId) return;

    let foundTrack = tracksStore.tracks.find((t) => t.id === trackId);
    if (!foundTrack) {
      await tracksStore.loadAllTracks();
      foundTrack = tracksStore.tracks.find((t) => t.id === trackId);
    }

    if (foundTrack) {
      trackInfoDialogStore.setTrack(foundTrack);
    }
  }

  function closeAndGoToPlaylist(playlistId: string) {
    goto(`/playlist?id=${playlistId}`);
  }
</script>

{#snippet menuItems()}
  <div class="flex flex-col p-2 gap-4">
    <div class="grid gap-1">
      <p class="text-xs uppercase tracking-wide text-muted-foreground">
        Artists
      </p>
      <p class="text-sm leading-6">
        {#each artists as a, i}
          <span
            role="link"
            tabindex="0"
            class="hover:underline cursor-pointer"
            onclick={() => closeAndGoToPlaylist(`artist_${a}`)}
            onkeydown={(e) =>
              e.key === "Enter" && closeAndGoToPlaylist(`artist_${a}`)}
            >{a}</span
          >{#if i < artists.length - 1},&nbsp;{/if}
        {/each}
      </p>
    </div>

    <div class="grid gap-1">
      <p class="text-xs uppercase tracking-wide text-muted-foreground">Album</p>
      <button
        type="button"
        class="text-sm leading-6 hover:underline cursor-pointer text-left"
        onclick={() => closeAndGoToPlaylist(`album_${albumName}`)}
      >
        {albumName}
      </button>
    </div>

    <div class="h-px bg-border"></div>

    <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
      <p class="text-muted-foreground">Duration</p>
      <p class="text-right">{duration}</p>

      <p class="text-muted-foreground">Year</p>
      <p class="text-right">{year}</p>

      <p class="text-muted-foreground">Genres</p>
      <p class="text-right">{genres}</p>

      <p class="text-muted-foreground">Format</p>
      <p class="text-right">{format}</p>

      <p class="text-muted-foreground">Bitrate</p>
      <p class="text-right">{bitrate}</p>

      <p class="text-muted-foreground">Sample Rate</p>
      <p class="text-right">{sampleRate}</p>

      <p class="text-muted-foreground">Channels</p>
      <p class="text-right">{channels}</p>
    </div>
  </div>
{/snippet}

{#if track}
  <MenuDialog
    open={dialogState.isOpen}
    onOpenChange={dialogState.handleOpenChange}
    {imageUrl}
    {title}
    {subtitle}
    {menuItems}
  />
{/if}

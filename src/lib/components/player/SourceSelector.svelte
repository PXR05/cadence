<script lang="ts">
  import { playerStore } from "$lib/stores/player.svelte";
  import { tracksStore } from "$lib/stores/tracks.svelte";
  import { getSourceInfoList, type TrackSourceInfo } from "$lib/utils/trackSources";
  import DiscIcon from "@lucide/svelte/icons/disc";
  import { Button } from "../ui/button";
  import * as DropdownMenu from "../ui/dropdown-menu";
  import type { AudioFile } from "$lib/schemas";

  interface Props {
    track: AudioFile;
    side?: "top" | "bottom" | "left" | "right";
    align?: "start" | "center" | "end";
    class?: string;
  }

  let { track, side = "top", align = "center", class: className = "" }: Props = $props();

  const sources = $derived(tracksStore.getSourcesForTrack(track));
  const sourceInfoList = $derived<TrackSourceInfo[]>(getSourceInfoList(sources));
  const hasMutipleSources = $derived(sourceInfoList.length > 1);

  const preferenceKey = $derived(track.isrc ?? track.id);
  const selectedId = $derived(
    playerStore.getSourcePreference(preferenceKey) ?? sourceInfoList[0]?.track.id,
  );

  function providerLabel(info: TrackSourceInfo): string {
    const name = info.provider === "tidal" ? "Tidal" : info.provider === "youtube" ? "YouTube" : "Local";
    return `${name} · ${info.format}`;
  }

  function handleSelect(trackId: string) {
    playerStore.setSourcePreference(preferenceKey, trackId);
  }
</script>

{#if hasMutipleSources}
  <DropdownMenu.Root>
    <DropdownMenu.Trigger>
      {#snippet child({ props })}
        <Button
          {...props}
          variant="ghost"
          size="icon"
          class="size-8 grid place-items-center {className}"
          aria-label="Select audio source"
        >
          <DiscIcon size={18} />
        </Button>
      {/snippet}
    </DropdownMenu.Trigger>

    <DropdownMenu.Content {side} {align} class="min-w-40">
      <DropdownMenu.Label>Audio Source</DropdownMenu.Label>
      <DropdownMenu.Separator />
      <DropdownMenu.RadioGroup
        value={selectedId}
        onValueChange={(v) => v && handleSelect(v)}
      >
        {#each sourceInfoList as info (info.track.id)}
          <DropdownMenu.RadioItem value={info.track.id}>
            {providerLabel(info)}
          </DropdownMenu.RadioItem>
        {/each}
      </DropdownMenu.RadioGroup>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
{/if}

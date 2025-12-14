<script lang="ts">
  import * as ContextMenu from "$lib/components/ui/context-menu";
  import TrackMenuItems from "./TrackMenuItems.svelte";
  import type { AudioFile } from "$lib/schemas";
  import type { Snippet } from "svelte";

  interface Props {
    track: AudioFile;
    isOffline: boolean;
    onOfflineStatusChange?: () => void;
    children: Snippet;
  }

  let { track, isOffline, onOfflineStatusChange, children }: Props = $props();
</script>

<ContextMenu.Root>
  <ContextMenu.Trigger>
    {@render children()}
  </ContextMenu.Trigger>
  <ContextMenu.Content>
    <TrackMenuItems
      {track}
      {isOffline}
      {onOfflineStatusChange}
      MenuItem={ContextMenu.Item}
      MenuSeparator={ContextMenu.Separator}
    />
  </ContextMenu.Content>
</ContextMenu.Root>

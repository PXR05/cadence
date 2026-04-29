<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
  import { Button } from "../ui/button";

  type SortBy = "custom" | "title" | "addedAt" | "artist";
  type SortDirection = "asc" | "desc";

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sortBy: SortBy;
    sortDirection: SortDirection;
    onSortByChange: (value: SortBy) => void;
    onSortDirectionChange: (value: SortDirection) => void;
  }

  let {
    open,
    onOpenChange,
    sortBy,
    sortDirection,
    onSortByChange,
    onSortDirectionChange,
  }: Props = $props();

  const activeClass =
    "bg-foreground dark:bg-foreground hover:bg-foreground/80 dark:hover:bg-foreground/80 text-background hover:text-background";
</script>

<Dialog.Root {open} {onOpenChange}>
  <Dialog.Content class="max-w-[90dvw]">
    <Dialog.Header class="text-left">
      <Dialog.Title>Sort Playlist</Dialog.Title>
    </Dialog.Header>

    <div class="space-y-2 text-muted-foreground">
      <div class="space-y-2">
        <p class="text-sm text-muted-foreground">Sort by</p>
        <div class="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onclick={() => onSortByChange("custom")}
            class="rounded-xl {sortBy === 'custom' ? activeClass : ''}"
          >
            Default
          </Button>
          <Button
            variant="outline"
            class="rounded-xl {sortBy === 'title' ? activeClass : ''}"
            onclick={() => onSortByChange("title")}
          >
            Alphabetical
          </Button>
          <Button
            variant="outline"
            class="rounded-xl {sortBy === 'addedAt' ? activeClass : ''}"
            onclick={() => onSortByChange("addedAt")}
          >
            Date Added
          </Button>
          <Button
            variant="outline"
            class="rounded-xl {sortBy === 'artist' ? activeClass : ''}"
            onclick={() => onSortByChange("artist")}
          >
            Artist
          </Button>
        </div>
      </div>

      <div class="space-y-2">
        <p class="text-sm text-muted-foreground">Order</p>
        <div class="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            class="rounded-xl {sortDirection === 'asc' ? activeClass : ''}"
            onclick={() => onSortDirectionChange("asc")}
          >
            Ascending
          </Button>
          <Button
            variant="outline"
            class="rounded-xl {sortDirection === 'desc' ? activeClass : ''}"
            onclick={() => onSortDirectionChange("desc")}
          >
            Descending
          </Button>
        </div>
      </div>
    </div>
  </Dialog.Content>
</Dialog.Root>

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
</script>

<Dialog.Root {open} {onOpenChange}>
  <Dialog.Content class="max-w-[90dvw] p-5">
    <Dialog.Header class="text-left">
      <Dialog.Title>Sort Playlist</Dialog.Title>
    </Dialog.Header>

    <div class="space-y-2">
      <div class="space-y-2">
        <p class="text-sm text-muted-foreground">Sort by</p>
        <div class="grid grid-cols-2 gap-2">
          <Button
            variant={sortBy === "custom" ? "default" : "outline"}
            class="rounded-xl"
            onclick={() => onSortByChange("custom")}
          >
            Default
          </Button>
          <Button
            variant={sortBy === "title" ? "default" : "outline"}
            class="rounded-xl"
            onclick={() => onSortByChange("title")}
          >
            Alphabetical
          </Button>
          <Button
            variant={sortBy === "addedAt" ? "default" : "outline"}
            class="rounded-xl"
            onclick={() => onSortByChange("addedAt")}
          >
            Date Added
          </Button>
          <Button
            variant={sortBy === "artist" ? "default" : "outline"}
            class="rounded-xl"
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
            variant={sortDirection === "asc" ? "default" : "outline"}
            class="rounded-xl"
            onclick={() => onSortDirectionChange("asc")}
          >
            Ascending
          </Button>
          <Button
            variant={sortDirection === "desc" ? "default" : "outline"}
            class="rounded-xl"
            onclick={() => onSortDirectionChange("desc")}
          >
            Descending
          </Button>
        </div>
      </div>
    </div>
  </Dialog.Content>
</Dialog.Root>

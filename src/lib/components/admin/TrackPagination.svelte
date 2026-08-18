<script lang="ts">
  import { Button } from "../ui/button";
  import {
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
  } from "@lucide/svelte";

  interface Props {
    currentPage: number;
    totalPages: number;
    loading: boolean;
    onPageChange: (page: number) => void;
  }

  let { currentPage, totalPages, loading, onPageChange }: Props = $props();

  function goToPrevPage() {
    if (currentPage > 1) onPageChange(currentPage - 1);
  }

  function goToNextPage() {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  }
</script>

<nav
  class="flex items-center justify-between rounded-xl border bg-background p-2 md:bg-card"
  aria-label="Pagination"
>
  <p class="pl-2 text-sm text-muted-foreground">
    Page <span class="font-medium text-foreground">{currentPage}</span>
    <span aria-hidden="true"> / </span>
    <span class="sr-only">of</span>{totalPages}
  </p>
  <div class="flex gap-1">
    <Button
      variant="ghost"
      size="sm"
      class="gap-1.5"
      onclick={goToPrevPage}
      disabled={loading || currentPage <= 1}
    >
      <ChevronLeftIcon class="size-4" />
      <span class="hidden sm:inline">Previous</span>
    </Button>
    <Button
      variant="ghost"
      size="sm"
      class="gap-1.5"
      onclick={goToNextPage}
      disabled={loading || currentPage >= totalPages}
    >
      <span class="hidden sm:inline">Next</span>
      <ChevronRightIcon class="size-4" />
    </Button>
  </div>
</nav>

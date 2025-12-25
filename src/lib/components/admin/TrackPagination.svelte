<script lang="ts">
  import { Button } from "../ui/button";

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

<div class="flex items-center justify-between border p-3 rounded-xl">
  <div class="text-sm text-muted-foreground">
    Page {currentPage} of {totalPages}
  </div>
  <div class="flex gap-2">
    <Button
      variant="outline"
      onclick={goToPrevPage}
      disabled={loading || currentPage <= 1}
    >
      Previous
    </Button>
    <Button
      variant="outline"
      onclick={goToNextPage}
      disabled={loading || currentPage >= totalPages}
    >
      Next
    </Button>
  </div>
</div>

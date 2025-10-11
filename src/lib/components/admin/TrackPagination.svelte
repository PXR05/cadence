<script lang="ts">
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

<div class="flex items-center justify-between border p-3">
  <div class="text-sm text-muted-foreground">
    Page {currentPage} of {totalPages}
  </div>
  <div class="flex gap-2">
    <button
      onclick={goToPrevPage}
      disabled={loading || currentPage <= 1}
      class="px-3 py-1 text-sm border hover:bg-accent disabled:opacity-50"
    >
      Previous
    </button>
    <button
      onclick={goToNextPage}
      disabled={loading || currentPage >= totalPages}
      class="px-3 py-1 text-sm border hover:bg-accent disabled:opacity-50"
    >
      Next
    </button>
  </div>
</div>

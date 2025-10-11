<script lang="ts">
  import { PlusIcon } from "@lucide/svelte";
</script>

<div
  class="flex flex-col max-w-4xl mx-auto w-full h-[calc(100dvh-3rem-2px)] border-x"
>
  <div class="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
    <button
      disabled
      class="aspect-square border hover:bg-muted/50 transition-colors cursor-not-allowed flex flex-col items-center"
    >
      <PlusIcon
        size={48}
        strokeWidth={2}
        absoluteStrokeWidth
        class="text-muted-foreground h-full"
      />
      <span class="text-sm font-medium w-full py-2 bg-muted"
        >Create Playlist</span
      >
    </button>
  </div>
</div>

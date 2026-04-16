<script lang="ts">
  import {  ListFilter as ListFilterIcon, Search as SearchIcon, X as XIcon } from "@lucide/svelte";
  import { Input } from "../ui/input";
  import { Button } from "../ui/button";
  import { appearanceStore } from "$lib/stores/appearance.svelte";

  let { searchQuery = $bindable(""), onOpenSort = (() => {}) as () => void } =
    $props();

  const isEmpty = $derived(searchQuery.trim().length === 0);
</script>

<div class="flex gap-2 md:gap-1.5">
  <div
    class="flex-1 flex items-center relative rounded-3xl border border-muted-foreground/10
    {appearanceStore.disableBlur
      ? 'bg-muted'
      : 'bg-muted-foreground/10 dark:bg-muted/60 backdrop-blur-md'}"
  >
    <SearchIcon
      size={16}
      class="absolute transition-all text-muted-foreground shrink-0 
      {!isEmpty ? 'opacity-0' : ''}"
      style="transform: translateX({!isEmpty ? '0' : '0.75rem'})"
    />
    <Input
      type="text"
      bind:value={searchQuery}
      placeholder="Search in playlist..."
      class="flex-1 text-base h-auto bg-transparent! rounded-3xl border-0 transition-all p-3 outline-none font-mono placeholder:text-muted-foreground 
        {!isEmpty ? '' : 'pl-9'}"
    />
    <Button
      variant="ghost"
      size="icon"
      class="text-muted-foreground absolute right-0
        {isEmpty ? 'opacity-0' : ''}"
      style="transform: translateX({isEmpty ? '0.5rem' : '0rem'})"
      onclick={() => (searchQuery = "")}
      aria-label="Clear search"
    >
      <XIcon />
    </Button>
  </div>

  <button
    type="button"
    class="flex items-center justify-center size-13 rounded-3xl transition-colors border border-muted-foreground/10
    {appearanceStore.disableBlur
      ? 'bg-muted hover:bg-muted-foreground/20'
      : 'bg-muted-foreground/10 dark:bg-muted/60 backdrop-blur-md hover:bg-muted-foreground/20!'}"
    onclick={() => onOpenSort()}
    aria-label="Open sort options"
    title="Sort options"
  >
    <ListFilterIcon class="size-4 pointer-events-none shrink-0" />
  </button>
</div>

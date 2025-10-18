<script lang="ts">
  import { SearchIcon, XIcon } from "@lucide/svelte";
  import { Input } from "../ui/input";
  import { Button } from "../ui/button";

  interface Props {
    searchQuery?: string;
  }

  let { searchQuery = $bindable("") }: Props = $props();

  const isEmpty = $derived(searchQuery.trim().length === 0);
</script>

<div
  class="flex items-center relative bg-muted/50 backdrop-blur-md rounded-xl overflow-clip border border-input"
>
  <SearchIcon
    size={16}
    class="absolute transition-all text-muted-foreground flex-shrink-0 
      {!isEmpty ? 'left-0 opacity-0' : 'left-3'}"
  />
  <Input
    type="text"
    bind:value={searchQuery}
    placeholder="Search in playlist..."
    class="flex-1 text-base h-auto !bg-transparent border-0 transition-all p-3 outline-none font-mono placeholder:text-muted-foreground 
      {!isEmpty ? '' : 'pl-9'}"
  />
  <Button
    variant="ghost"
    size="icon"
    class="text-muted-foreground absolute 
      {isEmpty ? '-right-2 opacity-0 pointer-events-none' : 'right-0'}"
    onclick={() => (searchQuery = "")}
    aria-label="Clear search"
  >
    <XIcon />
  </Button>
</div>
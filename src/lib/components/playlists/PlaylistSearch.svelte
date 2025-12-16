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
  class="flex items-center relative bg-muted-foreground/10 dark:bg-muted/50 backdrop-blur-md rounded-xl overflow-clip border border-input/15"
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
    class="flex-1 text-base h-auto !bg-transparent border-0 transition-all p-3 outline-none font-mono placeholder:text-muted-foreground 
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

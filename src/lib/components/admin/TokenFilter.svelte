<script lang="ts">
  import { FilterIcon, XIcon } from "@lucide/svelte";
  import { Input } from "../ui/input";

  let {
    value = $bindable(""),
    loading = false,
    onChange,
    onClear,
  }: {
    value: string;
    loading: boolean;
    onChange: () => void;
    onClear: () => void;
  } = $props();
</script>

<div class="relative">
  <FilterIcon
    size={14}
    class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
  />
  <Input
    type="text"
    bind:value
    onchange={onChange}
    placeholder="filter by user"
    class="w-full pl-9 pr-9 py-2 text-sm"
    disabled={loading}
  />
  {#if value}
    <button
      onclick={onClear}
      class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
    >
      <XIcon size={14} />
    </button>
  {/if}
</div>

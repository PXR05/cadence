<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { LoaderIcon } from "@lucide/svelte";

  let {
    name = $bindable(""),
    userId = $bindable(""),
    loading = false,
    onSubmit,
  }: {
    name: string;
    userId: string;
    loading: boolean;
    onSubmit: () => void;
  } = $props();

  const isValid = $derived(name.trim() && userId.trim() && !loading);
</script>

<div class="flex max-md:flex-col gap-2">
  <input
    type="text"
    bind:value={name}
    placeholder="name"
    class="flex-1 px-3 py-2 text-sm border bg-background"
    disabled={loading}
  />
  <input
    type="text"
    bind:value={userId}
    placeholder="user id"
    class="flex-1 px-3 py-2 text-sm border bg-background"
    disabled={loading}
  />
  <Button onclick={onSubmit} disabled={!isValid}>
    {#if loading}
      <LoaderIcon class="animate-spin" size={14} />
    {:else}
      Create
    {/if}
  </Button>
</div>

<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { LoaderIcon } from "@lucide/svelte";
  import { Input } from "../ui/input";

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
  <Input
    type="text"
    bind:value={name}
    placeholder="name"
    class="flex-1 px-3 py-3 text-sm"
    disabled={loading}
  />
  <Input
    type="text"
    bind:value={userId}
    placeholder="user id"
    class="flex-1 px-3 py-3 text-sm"
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

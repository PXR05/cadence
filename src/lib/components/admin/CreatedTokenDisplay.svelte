<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { CopyIcon } from "@lucide/svelte";

  let {
    token,
    onCopy,
  }: {
    token: string;
    onCopy: () => void;
  } = $props();
</script>

<div class="border p-3 space-y-2">
  <div class="flex gap-2">
    <code class="flex-1 px-2 py-1 bg-muted text-xs break-all font-mono">
      {token}
    </code>
    <Button variant="outline" size="icon-sm" onclick={onCopy}>
      <CopyIcon size={14} />
    </Button>
  </div>
  <p class="text-xs text-muted-foreground">
    Save this token now. It won't be shown again.
  </p>
</div>

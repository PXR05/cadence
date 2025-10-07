<script lang="ts">
  interface Props {
    title: string;
    message?: string;
  }

  let { title, message = "Coming soon..." }: Props = $props();
</script>

<div class="flex flex-col items-center justify-center flex-1 p-4">
  <div class="border p-8 text-center">
    <p class="text-muted-foreground mb-2">
      <span class="text-destructive">!</span>
      {title}
    </p>
    <p class="text-sm text-muted-foreground">{message}</p>
  </div>
</div>

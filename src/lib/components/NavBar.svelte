<script lang="ts">
  import { page } from "$app/stores";

  const tabs = [
    { path: "/", label: "list" },
    { path: "/search", label: "search" },
    { path: "/personal", label: "personal" },
  ];
</script>

<nav class="sticky top-0 z-10 bg-background border-y">
  <div class="max-w-4xl mx-auto flex">
    {#each tabs as tab, i}
      <a
        href={tab.path}
        class="flex-1 p-3 hover:bg-muted/30 transition-colors border-r text-center
          {$page.url.pathname === tab.path
          ? 'bg-muted text-foreground'
          : 'text-muted-foreground'}
          {i === 0 ? 'border-l' : ''}"
      >
        {tab.label}
      </a>
    {/each}
  </div>
</nav>

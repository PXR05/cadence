<script lang="ts">
  interface Props {
    title: string;
    href: string;
    linkLabel?: string;
  }

  let { title, href, linkLabel = "View all" }: Props = $props();
</script>

<div class="px-4 pt-4 flex items-center justify-between">
  <h3 class="text-xl font-semibold">{title}</h3>
  <a {href} class="text-sm text-muted-foreground hover:text-foreground transition-colors">
    {linkLabel} →
  </a>
</div>

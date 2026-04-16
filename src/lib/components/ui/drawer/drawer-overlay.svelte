<script lang="ts">
	import { Drawer as DrawerPrimitive } from "vaul-svelte";
	import { cn } from "$lib/utils.js";
  import { appearanceStore } from "$lib/stores/appearance.svelte";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: DrawerPrimitive.OverlayProps = $props();
</script>

<DrawerPrimitive.Overlay
	bind:ref
	data-slot="drawer-overlay"
	class={cn("data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 bg-black/30 fixed inset-0 z-50", appearanceStore.disableBlur ? "bg-black/50" : "supports-backdrop-filter:backdrop-blur-sm",
	appearanceStore.disableAnimations ? "duration-0 animate-none!" : "",
	 className)}
	{...restProps}
/>

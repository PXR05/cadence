<script lang="ts">
  import { browser } from "$app/environment";
  import {
    BrightnessContrast,
    Dither,
    FlowingGradient,
    Shader,
  } from "shaders/svelte";
  import { onMount } from "svelte";

  type GradientColors = {
    colorA: string;
    colorB: string;
    colorC: string;
    colorD: string;
  };

  const fallbackColors: GradientColors = {
    colorA: "#181818",
    colorB: "#f1f1f1",
    colorC: "#cfcfcf",
    colorD: "#2e2e2e",
  };

  let prefersReducedMotion = $state(
    browser
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );
  let gradientColors = $state<GradientColors>(fallbackColors);
  let visible = $state(false);

  onMount(() => {
    setTimeout(() => {
      visible = true;
    }, 0);
  });

  let colorProbe: HTMLSpanElement | null = null;

  function getColorProbe(): HTMLSpanElement | null {
    if (!browser || !document.body) {
      return null;
    }

    if (!colorProbe) {
      colorProbe = document.createElement("span");
      colorProbe.style.position = "absolute";
      colorProbe.style.opacity = "0";
      colorProbe.style.pointerEvents = "none";
      colorProbe.style.width = "0";
      colorProbe.style.height = "0";
      document.body.appendChild(colorProbe);
    }

    return colorProbe;
  }

  function resolveCssColor(value: string, fallback: string): string {
    if (!browser || !value) {
      return fallback;
    }

    const probe = getColorProbe();
    if (!probe) {
      return fallback;
    }

    probe.style.color = value;
    if (!probe.style.color) {
      return fallback;
    }

    const resolved = getComputedStyle(probe).color;
    return resolved || fallback;
  }

  function syncGradientColorsFromTheme(): void {
    if (!browser) {
      return;
    }

    const styles = getComputedStyle(document.documentElement);
    gradientColors = {
      colorA: resolveCssColor(
        styles.getPropertyValue("--background").trim(),
        fallbackColors.colorA,
      ),
      colorB: resolveCssColor(
        styles.getPropertyValue("--foreground").trim(),
        fallbackColors.colorB,
      ),
      colorC: resolveCssColor(
        styles.getPropertyValue("--muted-foreground").trim(),
        fallbackColors.colorC,
      ),
      colorD: resolveCssColor(
        styles.getPropertyValue("--muted").trim(),
        fallbackColors.colorD,
      ),
    };
  }

  $effect(() => {
    if (!browser) {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const updatePreference = () => {
      prefersReducedMotion = mediaQuery.matches;
    };

    const syncTheme = () => {
      syncGradientColorsFromTheme();
    };

    const mutationObserver = new MutationObserver(syncTheme);

    updatePreference();
    syncTheme();

    mutationObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    mediaQuery.addEventListener("change", updatePreference);
    darkModeQuery.addEventListener("change", syncTheme);

    return () => {
      mutationObserver.disconnect();
      mediaQuery.removeEventListener("change", updatePreference);
      darkModeQuery.removeEventListener("change", syncTheme);
      if (colorProbe) {
        colorProbe.remove();
        colorProbe = null;
      }
    };
  });
</script>

<div class="fixed inset-0 right-1/4 overflow-hidden" aria-hidden="true">
  {#if browser && !prefersReducedMotion && visible}
    <Shader
      class="h-full w-full fade-in animate-in"
      colorSpace="srgb"
      disableTelemetry={true}
    >
      <FlowingGradient
        colorA={gradientColors.colorA}
        colorB={gradientColors.colorB}
        colorC={gradientColors.colorC}
        colorD={gradientColors.colorD}
        distortion={0.5}
        speed={1}
        seed={8}
      />
      <Dither
        pattern="bayer8"
        pixelSize={3}
        threshold={0.54}
        spread={0.7}
        colorMode="source"
      />
      <BrightnessContrast brightness={0.04} contrast={0.14} />
    </Shader>
  {:else}
    <div class="h-full w-full bg-muted/40"></div>
  {/if}

  <div class="pointer-events-none absolute inset-0 bg-background/35"></div>
</div>

<script lang="ts">
  import EqPresetControls from "$lib/components/settings/audio/EqPresetControls.svelte";
  import EqVisualizerCanvas from "$lib/components/settings/audio/EqVisualizerCanvas.svelte";
  import SettingCard from "$lib/components/SettingCard.svelte";
  import SettingsHeader from "$lib/components/SettingsHeader.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import {
    SelectContent,
    SelectItem,
    Select as SelectRoot,
    SelectTrigger,
  } from "$lib/components/ui/select";
  import type { FilterType } from "$lib/stores/player.svelte";
  import { playerStore } from "$lib/stores/player.svelte";
  import {
    AudioWaveform as AudioWaveformIcon,
    Cable as CableIcon,
    Plus as PlusIcon,
    Power as PowerIcon,
    PowerOff as PowerOffIcon,
    X as XIcon,
  } from "@lucide/svelte";

  const filterTypes: FilterType[] = [
    "lowshelf",
    "peaking",
    "highshelf",
    "lowpass",
    "highpass",
    "notch",
    "bandpass",
    "allpass",
  ];

  const filterTypeLabels: Record<FilterType, string> = {
    lowshelf: "LS",
    peaking: "PK",
    highshelf: "HS",
    lowpass: "LP",
    highpass: "HP",
    notch: "NT",
    bandpass: "BP",
    allpass: "AP",
  };

  const controls = [
    { key: "frequency", label: "Freq", min: 20, max: 20000, step: 10 },
    { key: "gain", label: "Gain", min: -20, max: 20, step: 0.5 },
    { key: "Q", label: "Q", min: 0.1, max: 10, step: 0.1 },
  ];

  function formatDb(value: number): string {
    return `${value > 0 ? "+" : ""}${value.toFixed(1)} dB`;
  }
</script>

<SettingsHeader title="Audio Settings" />

<div class="px-2 pb-4 pt-0.5 w-full space-y-2 mb-[50dvh]">
  <SettingCard
    icon={CableIcon}
    title="Bypass"
    enabled={playerStore.pureBypassEnabled}
    onToggle={() => playerStore.togglePureBypass()}
  >
    <p class="text-sm text-muted-foreground px-2 pb-1">
      Bypasses EQ, pre-amp, and analyzer processing while keeping master volume
      control active.
    </p>
  </SettingCard>

  <div
    class:opacity-50={playerStore.pureBypassEnabled}
    class:pointer-events-none={playerStore.pureBypassEnabled}
    aria-disabled={playerStore.pureBypassEnabled}
  >
    <SettingCard
      icon={AudioWaveformIcon}
      title="Equalizer"
      enabled={playerStore.equalizerEnabled}
      onToggle={playerStore.pureBypassEnabled
        ? undefined
        : () => playerStore.toggleEqualizer()}
    >
      <div class="space-y-4">
        <EqPresetControls />

        <div class="w-full border rounded-lg p-3 bg-background/70 md:bg-card">
          <div class="flex items-center justify-between gap-3">
            <label for="preamp-db" class="text-sm font-medium">Pre-Amp</label>
            <span class="text-xs text-muted-foreground">
              {formatDb(playerStore.preAmpDb)}
            </span>
          </div>
          <div class="mt-2 flex flex-col gap-2">
            <input
              id="preamp-db"
              type="range"
              min="-30"
              max="30"
              step="0.5"
              value={playerStore.preAmpDb}
              oninput={(e) =>
                playerStore.setPreAmpDb(
                  parseFloat((e.target as HTMLInputElement).value),
                )}
              class="w-full accent-primary"
              aria-label="Pre-amp in dB"
            />
            <div class="flex items-center gap-2">
              <span class="text-xs text-muted-foreground w-14">-30 dB</span>
              <Input
                type="number"
                min={-30}
                max={30}
                step={0.5}
                value={playerStore.preAmpDb}
                oninput={(e) => {
                  const val = parseFloat((e.target as HTMLInputElement).value);
                  if (!isNaN(val)) {
                    playerStore.setPreAmpDb(val);
                  }
                }}
                class="text-xs w-full"
              />
              <span class="text-xs text-muted-foreground w-14 text-right">
                +30 dB
              </span>
            </div>
          </div>
        </div>

        <EqVisualizerCanvas />

        <div class="w-full">
          <div
            class="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2 w-full"
          >
            {#each playerStore.equalizerBands as band (band.id)}
              <div
                class="border rounded-lg p-2 flex flex-col gap-2 bg-background md:bg-card text-xs h-full"
              >
                <div class="flex flex-row items-center gap-2 w-full">
                  <Button
                    onclick={() => {
                      if (band.enabled) {
                        playerStore.updateEqualizerBand(band.id, {
                          enabled: false,
                          prevGain: band.gain,
                          gain: 0,
                        });
                      } else {
                        playerStore.updateEqualizerBand(band.id, {
                          enabled: true,
                          gain: band.prevGain ?? 0,
                          prevGain: undefined,
                        });
                      }
                    }}
                    variant={band.enabled ? "default" : "outline"}
                    size="sm"
                    class="size-8 p-0 shrink-0"
                    aria-pressed={band.enabled}
                    title={band.enabled ? "Disable band" : "Enable band"}
                  >
                    {#if band.enabled}
                      <PowerIcon class="size-4" />
                    {:else}
                      <PowerOffIcon class="size-4" />
                    {/if}
                  </Button>
                  <span
                    class="flex-1 font-medium text-sm flex items-center gap-1.5"
                  >
                    Band {band.id + 1}
                    {#if playerStore.equalizerBands.length > 1}
                      <button
                        onclick={() => playerStore.removeEqualizerBand(band.id)}
                        class="ml-auto opacity-50 hover:opacity-100 transition-opacity p-1"
                        title="Remove band"
                      >
                        <XIcon class="size-4" />
                      </button>
                    {/if}
                  </span>
                </div>

                <SelectRoot
                  type="single"
                  value={band.type}
                  onValueChange={(e) =>
                    playerStore.updateEqualizerBand(band.id, {
                      type: e as FilterType,
                    })}
                >
                  <SelectTrigger class="w-full capitalize">
                    {filterTypeLabels[band.type]} - {band.type}
                  </SelectTrigger>
                  <SelectContent>
                    {#each filterTypes as type}
                      <SelectItem value={type} class="capitalize">
                        {type}
                      </SelectItem>
                    {/each}
                  </SelectContent>
                </SelectRoot>

                {#each controls as control}
                  <div class="flex flex-row items-center gap-2 w-full">
                    <span class="w-10">{control.label}</span>
                    <Input
                      type="number"
                      value={band[control.key as keyof typeof band]}
                      oninput={(e) => {
                        const val = parseFloat(
                          (e.target as HTMLInputElement).value,
                        );
                        if (!isNaN(val)) {
                          playerStore.updateEqualizerBand(band.id, {
                            [control.key as keyof typeof band]: val,
                          });
                        }
                      }}
                      min={control.min}
                      max={control.max}
                      step={control.step}
                      class="text-xs w-full"
                    />
                  </div>
                {/each}
              </div>
            {/each}

            {#if playerStore.equalizerBands.length < playerStore.maxBands}
              <button
                onclick={() => {
                  const result = playerStore.addEqualizerBand();
                  if (!result) {
                    console.warn("Could not add band: max bands reached");
                  }
                }}
                class="border rounded-lg p-2 flex flex-col items-center justify-center gap-2 bg-background md:bg-card text-xs h-full min-h-35 border-dashed border-muted-foreground/50 hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer group"
              >
                <div
                  class="size-10 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/20 transition-colors"
                >
                  <PlusIcon
                    class="size-5 text-muted-foreground group-hover:text-primary transition-colors"
                  />
                </div>
                <span
                  class="text-muted-foreground group-hover:text-primary transition-colors font-medium"
                >
                  Add Band
                </span>
                <span class="text-muted-foreground/70 text-[10px]">
                  {playerStore.equalizerBands.length}/{playerStore.maxBands} bands
                </span>
              </button>
            {:else}
              <div
                class="border rounded-lg p-2 flex flex-col items-center justify-center gap-2 bg-muted/30 text-xs h-full min-h-35 border-dashed border-muted-foreground/30"
              >
                <div
                  class="size-10 rounded-full bg-muted/50 flex items-center justify-center"
                >
                  <PlusIcon class="size-5 text-muted-foreground/50" />
                </div>
                <span class="text-muted-foreground/50 font-medium"
                  >Max Bands</span
                >
                <span class="text-muted-foreground/50 text-[10px]">
                  {playerStore.maxBands}/{playerStore.maxBands} bands
                </span>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </SettingCard>
  </div>
</div>

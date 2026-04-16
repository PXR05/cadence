<script lang="ts">
  import { onMount } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import {
    SelectContent,
    SelectItem,
    Select as SelectRoot,
    SelectTrigger,
  } from "$lib/components/ui/select";
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from "$lib/components/ui/dialog";
  import type { EqualizerPreset } from "$lib/stores/player.svelte";
  import { playerStore } from "$lib/stores/player.svelte";
  import {
    Download as DownloadIcon,
    Pencil as PencilIcon,
    Plus as PlusIcon,
    Trash2 as Trash2Icon,
    Upload as UploadIcon,
  } from "@lucide/svelte";

  let importInputRef: HTMLInputElement;
  let selectedPresetId = $state("");
  let renameDialogOpen = $state(false);
  let renameDraftName = $state("");
  let presetStatus = $state("");
  let presetStatusTone = $state<"success" | "warning" | "error">("success");

  const selectedPreset = $derived.by<EqualizerPreset | null>(() => {
    const bySelection = playerStore.getEqualizerPresetById(selectedPresetId);
    if (bySelection) return bySelection;

    const byActive = playerStore.getEqualizerPresetById(
      playerStore.activeEqualizerPresetId,
    );
    if (byActive) return byActive;

    return playerStore.equalizerPresets[0] ?? null;
  });

  function setPresetStatus(
    message: string,
    tone: "success" | "warning" | "error" = "success",
  ) {
    presetStatus = message;
    presetStatusTone = tone;
  }

  function syncPresetSelectionFromStore() {
    const activeId =
      playerStore.activeEqualizerPresetId ??
      playerStore.equalizerPresets[0]?.id;

    selectedPresetId = activeId ?? "";
  }

  function onPresetSelectionChange(nextPresetId: string) {
    const preset = playerStore.getEqualizerPresetById(nextPresetId);
    if (!preset) {
      setPresetStatus("Preset not found.", "error");
      return;
    }

    const applied = playerStore.applyEqualizerPreset(nextPresetId);
    if (!applied) {
      setPresetStatus("Could not apply the selected preset.", "error");
      return;
    }

    selectedPresetId = nextPresetId;
    setPresetStatus(`Applied "${preset.name}".`);
  }

  function createPresetFromCurrent() {
    const createdPreset = playerStore.createEqualizerPreset("Preset");
    selectedPresetId = createdPreset.id;
    setPresetStatus(`Created preset "${createdPreset.name}".`);
  }

  function openRenameDialog() {
    const presetId = selectedPresetId || selectedPreset?.id;
    if (!presetId) {
      setPresetStatus("Select a preset first.", "error");
      return;
    }

    const preset = playerStore.getEqualizerPresetById(presetId);
    if (!preset) {
      setPresetStatus("Preset not found.", "error");
      return;
    }

    if (preset.id === "flat") {
      setPresetStatus("Flat preset cannot be renamed.", "warning");
      return;
    }

    renameDraftName = preset.name;
    renameDialogOpen = true;
  }

  function renameSelectedPreset() {
    const presetId = selectedPresetId || selectedPreset?.id;
    if (!presetId) {
      setPresetStatus("Select a preset first.", "error");
      return;
    }

    const renamedPreset = playerStore.renameEqualizerPreset(
      presetId,
      renameDraftName,
    );
    if (!renamedPreset) {
      setPresetStatus("Flat preset cannot be renamed.", "warning");
      return;
    }

    renameDialogOpen = false;
    setPresetStatus(`Renamed preset to "${renamedPreset.name}".`);
  }

  function deleteSelectedPreset() {
    const presetId = selectedPresetId || selectedPreset?.id;
    if (!presetId) {
      setPresetStatus("Select a preset first.", "error");
      return;
    }

    const preset = playerStore.getEqualizerPresetById(presetId);
    if (!preset) {
      setPresetStatus("Preset not found.", "error");
      return;
    }

    if (!confirm(`Delete preset "${preset.name}"?`)) {
      return;
    }

    const deleted = playerStore.deleteEqualizerPreset(presetId);
    if (!deleted) {
      setPresetStatus("Flat preset cannot be deleted.", "warning");
      return;
    }

    syncPresetSelectionFromStore();
    setPresetStatus(`Deleted "${preset.name}".`);
  }

  function exportSelectedPreset() {
    const preset = selectedPreset;
    if (!preset) {
      setPresetStatus("Select a preset first.", "error");
      return;
    }

    const content = playerStore.exportEqualizerPresetToText(preset.id);
    if (!content) {
      setPresetStatus("Could not export preset.", "error");
      return;
    }

    const safeFileName = preset.name
      .trim()
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
      .replace(/\s+/g, "-")
      .toLowerCase();

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${safeFileName || "eq-preset"}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);

    setPresetStatus(`Exported "${preset.name}".`);
  }

  async function importPresetFromFile(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const imported = playerStore.importEqualizerPresetFromText(
        text,
        file.name.replace(/\.[^/.]+$/, ""),
      );

      selectedPresetId = imported.preset.id;

      if (imported.truncated) {
        setPresetStatus(
          `Imported "${imported.preset.name}". Extra filters were ignored (max ${playerStore.maxBands}).`,
          "warning",
        );
      } else {
        setPresetStatus(`Imported "${imported.preset.name}".`);
      }
    } catch (error) {
      console.error("Failed to import EQ preset:", error);
      setPresetStatus("Failed to import preset file.", "error");
    } finally {
      target.value = "";
    }
  }

  onMount(() => {
    syncPresetSelectionFromStore();
  });
</script>

<div class="w-full">
  <SelectRoot
    type="single"
    value={selectedPresetId}
    onValueChange={(value) => onPresetSelectionChange(value as string)}
  >
    <SelectTrigger class="w-full">
      {selectedPreset?.name ?? "Select preset"}
    </SelectTrigger>
    <SelectContent>
      {#each playerStore.equalizerPresets as preset (preset.id)}
        <SelectItem value={preset.id}>{preset.name}</SelectItem>
      {/each}
    </SelectContent>
  </SelectRoot>

  <div class="mt-2 flex flex-wrap gap-2">
    <Button
      onclick={createPresetFromCurrent}
      size="sm"
      variant="outline"
      class="gap-1.5"
    >
      <PlusIcon class="size-4" />
      New
    </Button>

    <Button
      onclick={openRenameDialog}
      size="sm"
      variant="outline"
      class="gap-1.5"
      disabled={selectedPreset?.id === "flat"}
    >
      <PencilIcon class="size-4" />
      Rename
    </Button>

    <Button
      onclick={deleteSelectedPreset}
      size="sm"
      variant="outline"
      class="gap-1.5"
      disabled={selectedPreset?.id === "flat"}
    >
      <Trash2Icon class="size-4" />
      Delete
    </Button>

    <Button
      onclick={exportSelectedPreset}
      size="sm"
      variant="outline"
      class="gap-1.5"
    >
      <DownloadIcon class="size-4" />
      Export
    </Button>

    <Button
      onclick={() => importInputRef?.click()}
      size="sm"
      variant="outline"
      class="gap-1.5"
    >
      <UploadIcon class="size-4" />
      Import
    </Button>

    <input
      bind:this={importInputRef}
      type="file"
      accept=".txt,text/plain"
      onchange={importPresetFromFile}
      class="hidden"
    />
  </div>

  {#if presetStatus}
    <p
      class="mt-1 text-xs"
      class:text-destructive={presetStatusTone === "error"}
      class:text-yellow-500={presetStatusTone === "warning"}
      class:text-muted-foreground={presetStatusTone === "success"}
    >
      {presetStatus}
    </p>
  {/if}
</div>

<Dialog bind:open={renameDialogOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Rename Preset</DialogTitle>
      <DialogDescription>
        Choose a new name for the selected preset.
      </DialogDescription>
    </DialogHeader>

    <Input
      type="text"
      bind:value={renameDraftName}
      placeholder="Preset name"
      autofocus
    />

    <DialogFooter>
      <Button variant="outline" onclick={() => (renameDialogOpen = false)}>
        Cancel
      </Button>
      <Button onclick={renameSelectedPreset}>Rename</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

<script lang="ts">
  import {
    Loader as LoaderIcon,
    Link as LinkIcon,
    Upload as UploadIcon,
  } from "@lucide/svelte";
  import * as Dialog from "../ui/dialog";
  import { Button } from "../ui/button";
  import { Input } from "../ui/input";
  import type { RemoteProvider } from "$lib/schemas";
  import { detectRemoteProviderFromUrl } from "$lib/utils/remote";
  import { uploadAudioFile } from "$lib/backend/services/uploads";
  import { backendCapabilities } from "$lib/backend/config";

  interface Props {
    open?: boolean;
    loading?: boolean;
    onOpenChange: (open: boolean) => void;
    onUploadComplete: (successCount: number, totalCount: number) => void;
    onUploadError: (error: string) => void;
    onRemoteUpload: (provider: RemoteProvider, url: string) => void;
  }

  let {
    open = false,
    loading = false,
    onOpenChange,
    onUploadComplete,
    onUploadError,
    onRemoteUpload,
  }: Props = $props();

  const SUPPORTED_REMOTE_SOURCES =
    "Supported sources:\n- YouTube links (youtube.com, youtu.be)\n- Tidal links (tidal.com)";

  let remoteUrl = $state("");
  let isUploading = $state(false);
  let currentFileIndex = $state(0);
  let totalFiles = $state(0);
  let currentFileName = $state("");
  let currentFileProgress = $state(0);
  const canUploadFile = backendCapabilities.uploads.file;
  const canUploadRemote = backendCapabilities.uploads.remote;
  let uploadMode = $state<"file" | "remote">(
    canUploadFile ? "file" : "remote",
  );

  async function uploadSingleFile(file: File): Promise<boolean> {
    return uploadAudioFile(file, {
      timeoutMs: 300_000,
      onProgress: (percent) => {
        currentFileProgress = percent;
      },
    });
  }

  async function handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      input.value = "";

      isUploading = true;
      totalFiles = files.length;
      currentFileIndex = 0;
      currentFileProgress = 0;

      let successCount = 0;

      for (let i = 0; i < files.length; i++) {
        currentFileIndex = i + 1;
        currentFileName = files[i].name;
        currentFileProgress = 0;

        const success = await uploadSingleFile(files[i]);
        if (success) {
          successCount++;
        }
      }

      isUploading = false;
      currentFileIndex = 0;
      totalFiles = 0;
      currentFileName = "";
      currentFileProgress = 0;

      if (successCount > 0) {
        onUploadComplete(successCount, files.length);
        onOpenChange(false);
      } else {
        onUploadError("Failed to upload files");
      }
    }
  }

  function handleRemoteSubmit(e: Event) {
    e.preventDefault();
    const url = remoteUrl.trim();
    if (!url) return;

    const provider = detectRemoteProviderFromUrl(url);
    if (!provider) {
      onUploadError(
        "Unsupported remote URL. Supported sources: YouTube and Tidal.",
      );
      return;
    }
    if (!backendCapabilities.remoteProviders[provider].import) {
      onUploadError(`${provider} imports are disabled`);
      return;
    }

    onRemoteUpload(provider, url);
    remoteUrl = "";
    onOpenChange(false);
  }

  function handleCancel() {
    onOpenChange(false);
    remoteUrl = "";
    uploadMode = canUploadFile ? "file" : "remote";
  }
</script>

<Dialog.Root {open} {onOpenChange}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Add Track</Dialog.Title>
    </Dialog.Header>

    <div class="space-y-4">
      <div class="flex gap-2">
        {#if canUploadFile}
          <Button
          variant={uploadMode === "file" ? "default" : "outline"}
          onclick={() => (uploadMode = "file")}
          class="flex-1 gap-2"
        >
          <UploadIcon size={16} />
          Upload File
          </Button>
        {/if}
        {#if canUploadRemote}
          <Button
          variant={uploadMode === "remote" ? "default" : "outline"}
          onclick={() => (uploadMode = "remote")}
          class="flex-1 gap-2"
        >
          <LinkIcon size={16} />
          Remote
          </Button>
        {/if}
      </div>

      {#if uploadMode === "file" && canUploadFile}
        <div class="space-y-2">
          <div class="text-sm font-medium">Select Audio Files</div>
          {#if !isUploading}
            <Input
              type="file"
              onchange={handleFileChange}
              multiple
              accept="audio/*"
              disabled={loading || isUploading}
              class="w-full"
            />
          {:else}
            <div class="space-y-2 p-4 border rounded-lg">
              <div class="space-y-1">
                <div
                  class="flex items-center justify-between gap-2 text-sm min-w-0 truncate"
                >
                  <span class="truncate flex-1 min-w-0">
                    Uploading {currentFileIndex}/{totalFiles}: {currentFileName}
                  </span>
                  <span class="text-muted-foreground shrink-0">
                    {Math.min(
                      Math.round(
                        ((currentFileIndex - 1) / totalFiles) * 100 +
                          currentFileProgress / totalFiles,
                      ),
                      100,
                    )}%
                  </span>
                </div>
                <div class="w-full bg-secondary h-1.5 overflow-hidden rounded">
                  <div
                    class="h-full bg-primary transition-all duration-100 rounded"
                    style="width: {Math.min(
                      ((currentFileIndex - 1) / totalFiles) * 100 +
                        currentFileProgress / totalFiles,
                      100,
                    )}%"
                  ></div>
                </div>
              </div>
            </div>
          {/if}

          <Dialog.Footer class="mt-4">
            <Button
              type="button"
              variant="outline"
              onclick={handleCancel}
              disabled={loading || isUploading}
            >
              Cancel
            </Button>
          </Dialog.Footer>
        </div>
      {:else if canUploadRemote}
        <form onsubmit={handleRemoteSubmit} class="space-y-4">
          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <label for="remote-url" class="text-sm font-medium"
                >Remote URL</label
              >

              <span
                title={SUPPORTED_REMOTE_SOURCES}
                class="inline-flex items-center justify-center size-4 rounded-full border border-muted-foreground/40 text-[10px] font-semibold text-muted-foreground cursor-help"
                aria-label="Supported remote sources"
              >
                i
              </span>
            </div>

            <Input
              id="remote-url"
              type="url"
              bind:value={remoteUrl}
              placeholder="https://youtube.com/... or https://tidal.com/..."
              disabled={loading || isUploading}
            />
          </div>

          <Dialog.Footer>
            <Button
              type="button"
              variant="outline"
              onclick={handleCancel}
              disabled={loading || isUploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || isUploading || !remoteUrl.trim()}
            >
              {#if loading || isUploading}
                <LoaderIcon class="animate-spin" size={16} />
              {/if}
              Download
            </Button>
          </Dialog.Footer>
        </form>
      {/if}
    </div>
  </Dialog.Content>
</Dialog.Root>

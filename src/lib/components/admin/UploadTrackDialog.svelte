<script lang="ts">
  import {  Loader as LoaderIcon, Link as LinkIcon, Upload as UploadIcon } from "@lucide/svelte";
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
  } from "../ui/dialog";
  import { Button } from "../ui/button";
  import { Input } from "../ui/input";
  import type { RemoteProvider } from "$lib/schemas";
  import { detectRemoteProviderFromUrl } from "$lib/utils/remote";
  import { getAudioBaseUrl } from "$lib/constants";

  interface Props {
    open?: boolean;
    loading?: boolean;
    onUploadComplete: (successCount: number, totalCount: number) => void;
    onUploadError: (error: string) => void;
    onRemoteUpload: (provider: RemoteProvider, url: string) => void;
  }

  let {
    open = $bindable(false),
    loading = false,
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
  let activeXHRUploads = new Map<string, XMLHttpRequest>();
  let uploadMode = $state<"file" | "remote">("file");

  async function uploadSingleFile(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const formData = new FormData();
      formData.append("file", file);

      const xhr = new XMLHttpRequest();
      activeXHRUploads.set(file.name, xhr);

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          currentFileProgress = (event.loaded / event.total) * 100;
        }
      });

      xhr.addEventListener("load", () => {
        activeXHRUploads.delete(file.name);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(true);
        } else {
          resolve(false);
        }
      });

      xhr.addEventListener("error", () => {
        activeXHRUploads.delete(file.name);
        resolve(false);
      });

      xhr.addEventListener("timeout", () => {
        activeXHRUploads.delete(file.name);
        resolve(false);
      });

      xhr.addEventListener("abort", () => {
        activeXHRUploads.delete(file.name);
        resolve(false);
      });

      xhr.timeout = 300000;

      xhr.open("POST", `${getAudioBaseUrl()}/upload`);
      xhr.withCredentials = true;
      xhr.send(formData);
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
        open = false;
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

    onRemoteUpload(provider, url);
    remoteUrl = "";
    open = false;
  }

  function handleCancel() {
    open = false;
    remoteUrl = "";
    uploadMode = "file";
  }
</script>

<Dialog bind:open>
  <DialogContent class="max-w-md">
    <DialogHeader>
      <DialogTitle>Add Track</DialogTitle>
    </DialogHeader>

    <div class="space-y-4 pb-4">
      <div class="flex gap-2">
        <Button
          variant={uploadMode === "file" ? "default" : "outline"}
          onclick={() => (uploadMode = "file")}
          class="flex-1 gap-2"
        >
          <UploadIcon size={16} />
          Upload File
        </Button>
        <Button
          variant={uploadMode === "remote" ? "default" : "outline"}
          onclick={() => (uploadMode = "remote")}
          class="flex-1 gap-2"
        >
          <LinkIcon size={16} />
          Remote
        </Button>
      </div>

      {#if uploadMode === "file"}
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
        </div>
      {:else}
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
          <div class="flex gap-2 justify-end">
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
          </div>
        </form>
      {/if}
    </div>
  </DialogContent>
</Dialog>

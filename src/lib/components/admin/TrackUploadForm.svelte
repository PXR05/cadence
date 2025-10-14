<script lang="ts">
  interface Props {
    loading: boolean;
    onUploadComplete: (successCount: number, totalCount: number) => void;
    onUploadError: (error: string) => void;
    onYoutubeUpload: (url: string) => void;
  }

  let { loading, onUploadComplete, onUploadError, onYoutubeUpload }: Props =
    $props();

  let youtubeUrl = $state("");
  let isUploading = $state(false);
  let currentFileIndex = $state(0);
  let totalFiles = $state(0);
  let currentFileName = $state("");
  let currentFileProgress = $state(0);
  let activeXHRUploads = new Map<string, XMLHttpRequest>();

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

      xhr.open("POST", "/api/audio/upload");
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
      } else {
        onUploadError("Failed to upload files");
      }
    }
  }

  function handleYoutubeSubmit(e: Event) {
    e.preventDefault();
    if (!youtubeUrl.trim()) return;
    onYoutubeUpload(youtubeUrl.trim());
    youtubeUrl = "";
  }
</script>

<div class="space-y-4">
  <div class="border p-4">
    <h3 class="font-medium mb-3">Upload Audio Files</h3>
    <input
      type="file"
      onchange={handleFileChange}
      multiple
      accept="audio/*"
      disabled={loading || isUploading}
      class="w-full text-sm file:mr-4 file:py-2 file:px-4 file: file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 disabled:opacity-50"
    />

    {#if isUploading}
      <div class="mt-4 space-y-2">
        <div class="space-y-1">
          <div class="flex items-center justify-between text-xs">
            <span class="truncate flex-1 mr-2">
              Uploading {currentFileIndex}/{totalFiles}: {currentFileName}
            </span>
            <span class="text-muted-foreground">
              {Math.round(
                ((currentFileIndex - 1) / totalFiles) * 100 +
                  currentFileProgress / totalFiles
              )}%
            </span>
          </div>
          <div class="w-full bg-secondary h-1.5 overflow-hidden">
            <div
              class="h-full bg-primary transition-all duration-300"
              style="width: {((currentFileIndex - 1) / totalFiles) * 100 +
                currentFileProgress / totalFiles}%"
            ></div>
          </div>
        </div>
      </div>
    {/if}
  </div>

  <div class="border p-4">
    <h3 class="font-medium mb-3">Download from YouTube</h3>
    <form onsubmit={handleYoutubeSubmit} class="flex max-md:flex-col gap-2">
      <input
        type="url"
        bind:value={youtubeUrl}
        placeholder="https://youtube.com/watch?v=..."
        disabled={loading || isUploading}
        class="flex-1 px-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={loading || isUploading || !youtubeUrl.trim()}
        class="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        Download
      </button>
    </form>
  </div>
</div>

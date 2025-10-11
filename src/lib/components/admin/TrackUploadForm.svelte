<script lang="ts">
  interface Props {
    loading: boolean;
    onFileUpload: (files: File[]) => void;
    onYoutubeUpload: (url: string) => void;
  }

  let { loading, onFileUpload, onYoutubeUpload }: Props = $props();

  let fileInput: HTMLInputElement;
  let youtubeUrl = $state("");

  function handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      onFileUpload(files);
      input.value = "";
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
      bind:this={fileInput}
      onchange={handleFileChange}
      multiple
      accept="audio/*"
      disabled={loading}
      class="w-full text-sm file:mr-4 file:py-2 file:px-4 file: file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 disabled:opacity-50"
    />
  </div>

  <div class="border p-4">
    <h3 class="font-medium mb-3">Download from YouTube</h3>
    <form onsubmit={handleYoutubeSubmit} class="flex gap-2">
      <input
        type="url"
        bind:value={youtubeUrl}
        placeholder="https://youtube.com/watch?v=..."
        disabled={loading}
        class="flex-1 px-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={loading || !youtubeUrl.trim()}
        class="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        Download
      </button>
    </form>
  </div>
</div>

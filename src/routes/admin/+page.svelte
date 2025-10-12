<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { LoaderIcon } from "@lucide/svelte";
  import {
    TokenForm,
    TokenTable,
    TokenFilter,
    CreatedTokenDisplay,
    MessageDisplay,
    DeleteTokenDialog,
    RerollTokenDialog,
    TrackUploadForm,
    TrackTable,
    DeleteTrackDialog,
    TrackPagination,
  } from "$lib/components/admin";
  import { tracksStore } from "$lib/stores/tracks.svelte";
  import {
    checkToken,
    listTokens,
    createToken,
    deleteToken,
    fetchTracks,
    downloadYoutube,
    deleteTrack,
    type TokenInfo,
  } from "$lib/api";

  let isAdmin = $state(false);
  let loading = $state(true);
  let tokensLoading = $state(false);

  let tokens: TokenInfo[] = $state([]);
  let filterUserId = $state("");

  let newTokenName = $state("");
  let newTokenUserId = $state("");
  let createdToken = $state<string | null>(null);

  let errorMessage = $state("");
  let successMessage = $state("");

  let deleteDialogOpen = $state(false);
  let rerollDialogOpen = $state(false);
  let selectedToken = $state<TokenInfo | null>(null);

  let activeTab = $state<"tokens" | "tracks">("tokens");

  let tracksLoading = $state(false);
  let tracksInitialLoading = $state(true);
  let tracks: AudioFile[] = $state([]);
  let currentPage = $state(1);
  let totalPages = $state(1);
  let deleteTrackDialogOpen = $state(false);
  let selectedTrack = $state<AudioFile | null>(null);

  onMount(async () => {
    try {
      const result = await checkToken();
      isAdmin = result.data.isAdmin;
      if (!isAdmin) {
        goto("/");
        return;
      }
      await loadTokens();
      await loadTracks();
    } catch {
      goto("/");
    } finally {
      loading = false;
    }
  });

  function clearMessages() {
    errorMessage = "";
    successMessage = "";
  }

  function setMessage(type: "error" | "success", message: string) {
    clearMessages();
    if (type === "error") errorMessage = message;
    else successMessage = message;
  }

  async function loadTokens() {
    tokensLoading = true;
    try {
      const result = await listTokens(filterUserId || undefined);
      tokens = result.data;
    } catch {
      setMessage("error", "Failed to load tokens");
    } finally {
      tokensLoading = false;
    }
  }

  async function handleCreateToken() {
    tokensLoading = true;
    clearMessages();

    try {
      const result = await createToken(
        newTokenName.trim(),
        newTokenUserId.trim()
      );
      createdToken = result.data.token;
      newTokenName = "";
      newTokenUserId = "";
      await loadTokens();
      setMessage("success", "Token created");
    } catch {
      setMessage("error", "Failed to create token");
    } finally {
      tokensLoading = false;
    }
  }

  function openDeleteDialog(token: TokenInfo) {
    selectedToken = token;
    deleteDialogOpen = true;
  }

  function openRerollDialog(token: TokenInfo) {
    selectedToken = token;
    rerollDialogOpen = true;
  }

  async function confirmDelete() {
    if (!selectedToken) return;

    deleteDialogOpen = false;
    tokensLoading = true;
    clearMessages();
    createdToken = null;

    try {
      await deleteToken(selectedToken.id);
      await loadTokens();
      setMessage("success", "Token deleted");
    } catch {
      setMessage("error", "Failed to delete token");
    } finally {
      tokensLoading = false;
      selectedToken = null;
    }
  }

  async function confirmReroll() {
    if (!selectedToken) return;

    rerollDialogOpen = false;
    tokensLoading = true;
    clearMessages();

    try {
      const result = await createToken(
        selectedToken.name,
        selectedToken.userId
      );
      createdToken = result.data.token;
      await loadTokens();
      setMessage("success", "Token rerolled");
    } catch {
      setMessage("error", "Failed to reroll token");
    } finally {
      tokensLoading = false;
      selectedToken = null;
    }
  }

  function clearFilter() {
    filterUserId = "";
    loadTokens();
  }

  function copyToken() {
    if (!createdToken) return;
    navigator.clipboard.writeText(createdToken);
    setMessage("success", "Copied to clipboard");
  }

  async function loadTracks(page: number = 1) {
    tracksLoading = true;
    try {
      const result = await fetchTracks({ page, limit: 10 });
      tracks = result.tracks;
      currentPage = result.currentPage;
      totalPages = result.totalPages ?? 1;
    } catch {
      setMessage("error", "Failed to load tracks");
    } finally {
      tracksLoading = false;
      tracksInitialLoading = false;
    }
  }

  async function handleUploadComplete(
    successCount: number,
    totalCount: number
  ) {
    clearMessages();
    setMessage("success", `Uploaded ${successCount}/${totalCount} files`);
    await loadTracks(currentPage);
    tracksStore.loadAllTracks(true);
  }

  function handleUploadError(error: string) {
    clearMessages();
    setMessage("error", error);
  }

  async function handleYoutubeUpload(url: string) {
    tracksLoading = true;
    clearMessages();

    try {
      await downloadYoutube(url);
      setMessage("success", "Downloaded from YouTube");
      await loadTracks(currentPage);
      tracksStore.loadAllTracks(true);
    } catch {
      setMessage("error", "Failed to download from YouTube");
    } finally {
      tracksLoading = false;
    }
  }

  function openDeleteTrackDialog(track: AudioFile) {
    selectedTrack = track;
    deleteTrackDialogOpen = true;
  }

  async function confirmDeleteTrack() {
    if (!selectedTrack) return;

    deleteTrackDialogOpen = false;
    tracksLoading = true;
    clearMessages();

    try {
      await deleteTrack(selectedTrack.id);
      await loadTracks(currentPage);
      tracksStore.loadAllTracks(true);
      setMessage("success", "Track deleted");
    } catch {
      setMessage("error", "Failed to delete track");
    } finally {
      tracksLoading = false;
      selectedTrack = null;
    }
  }

  function switchTab(tab: "tokens" | "tracks") {
    activeTab = tab;
    clearMessages();
    createdToken = null;
  }
</script>

{#if loading}
  <div class="flex items-center justify-center h-[calc(100dvh-3rem-2px)]">
    <LoaderIcon class="animate-spin text-muted-foreground" size={24} />
  </div>
{:else}
  <div
    class="relative flex flex-col max-w-4xl mx-auto w-full h-[calc(100dvh-3rem-2px)] border-x overflow-y-auto"
  >
    <div class="flex border-b sticky top-0 bg-background z-50">
      <button
        onclick={() => switchTab("tokens")}
        class="flex-1 px-4 py-3 text-sm font-medium border-b-2 {activeTab ===
        'tokens'
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground'}"
      >
        Tokens
      </button>
      <button
        onclick={() => switchTab("tracks")}
        class="flex-1 px-4 py-3 text-sm font-medium border-b-2 {activeTab ===
        'tracks'
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground'}"
      >
        Tracks
      </button>
    </div>

    <div class="relative p-4 space-y-4 pb-24">
      {#if activeTab === "tokens"}
        <TokenForm
          bind:name={newTokenName}
          bind:userId={newTokenUserId}
          loading={tokensLoading}
          onSubmit={handleCreateToken}
        />

        {#if createdToken}
          <CreatedTokenDisplay token={createdToken} onCopy={copyToken} />
        {/if}

        <TokenFilter
          bind:value={filterUserId}
          loading={tokensLoading}
          onChange={loadTokens}
          onClear={clearFilter}
        />

        <TokenTable
          {tokens}
          loading={tokensLoading}
          {filterUserId}
          onReroll={openRerollDialog}
          onDelete={openDeleteDialog}
        />
      {:else}
        <TrackUploadForm
          loading={tracksLoading}
          onUploadComplete={handleUploadComplete}
          onUploadError={handleUploadError}
          onYoutubeUpload={handleYoutubeUpload}
        />

        <TrackTable
          {tracks}
          loading={tracksLoading}
          initialLoading={tracksInitialLoading}
          onDelete={openDeleteTrackDialog}
        />

        {#if totalPages > 1}
          <TrackPagination
            {currentPage}
            {totalPages}
            loading={tracksLoading}
            onPageChange={loadTracks}
          />
        {/if}
      {/if}
    </div>
  </div>
{/if}

<DeleteTokenDialog
  bind:open={deleteDialogOpen}
  tokenName={selectedToken?.name ?? ""}
  onConfirm={confirmDelete}
/>

<RerollTokenDialog
  bind:open={rerollDialogOpen}
  tokenName={selectedToken?.name ?? ""}
  onConfirm={confirmReroll}
/>

<DeleteTrackDialog
  bind:open={deleteTrackDialogOpen}
  trackName={selectedTrack?.metadata?.title ||
    selectedTrack?.filename ||
    "this track"}
  onConfirm={confirmDeleteTrack}
/>

{#if errorMessage}
  <MessageDisplay
    type="error"
    message={errorMessage}
    onDismiss={clearMessages}
  />
{/if}

{#if successMessage}
  <MessageDisplay
    type="success"
    message={successMessage}
    onDismiss={clearMessages}
  />
{/if}

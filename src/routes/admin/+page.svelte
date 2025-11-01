<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { LoaderIcon } from "@lucide/svelte";
  import {
    TokenForm,
    TokenTable,
    TokenFilter,
    CreatedTokenDisplay,
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
  import { toast } from "svelte-sonner";
  import { Button } from "$lib/components/ui/button";

  let isAdmin = $state(false);
  let loading = $state(true);
  let tokensLoading = $state(false);

  let tokens: TokenInfo[] = $state([]);
  let filterUserId = $state("");

  let newTokenName = $state("");
  let newTokenUserId = $state("");
  let createdToken = $state<string | null>(null);

  let deleteDialogOpen = $state(false);
  let rerollDialogOpen = $state(false);
  let selectedToken = $state<TokenInfo | null>(null);

  let activeTab = $state<"tokens" | "tracks">("tracks");

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

  function setMessage(type: "error" | "success", message: string) {
    if (type === "error") {
      toast.error(message);
    } else {
      toast.success(message);
    }
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
    setMessage("success", `Uploaded ${successCount}/${totalCount} files`);
    await loadTracks(currentPage);
    tracksStore.loadAllTracks(true);
  }

  function handleUploadError(error: string) {
    setMessage("error", error);
  }

  async function handleYoutubeUpload(url: string) {
    tracksLoading = true;

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

    createdToken = null;
  }
</script>

<svelte:head>
  <title>Admin | Cadence</title>
</svelte:head>

{#if loading}
  <div class="flex items-center justify-center h-full">
    <LoaderIcon class="animate-spin text-muted-foreground" size={24} />
  </div>
{:else}
  <div
    class="relative flex flex-col mx-auto w-full h-full border-x overflow-y-auto"
  >
    <div class="flex border-b sticky top-0 p-2 z-50 gap-2">
      <Button
        variant={activeTab === "tracks" ? "default" : "outline"}
        onclick={() => switchTab("tracks")}
        class="flex-1"
      >
        Tracks
      </Button>
      <Button
        variant={activeTab === "tokens" ? "default" : "outline"}
        onclick={() => switchTab("tokens")}
        class="flex-1"
      >
        Tokens
      </Button>
    </div>

    <div class="relative p-2 space-y-2">
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

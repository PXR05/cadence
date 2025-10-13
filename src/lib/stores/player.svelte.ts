import { BASE_URL, PLAYLIST_URL } from "$lib/api";
import type { CarouselAPI } from "$lib/components/ui/carousel/context";
import { createLocalStorageState } from "./localStorage.svelte";
import { getAudioUrl, revokeAudioUrl } from "$lib/utils/offline";

export const getStreamUrl = (id: string) => `${BASE_URL}/${id}/stream`;
export const getImageUrl = (id: string) => `${BASE_URL}/${id}/image`;
export const getPlaylistImageUrl = (id: string) =>
  `${PLAYLIST_URL}/${id}/image`;

interface PersistedPlayerState {
  currentTrack: AudioFile | null;
  trackQueue: AudioFile[];
  queueIndex: number;
  isMuted: boolean;
  volume: number;
  currentTime: number;
}

class PlayerState {
  playerRef: HTMLAudioElement | null = $state(null);
  isPlaying: boolean = $state(false);
  duration: number = $state(0);
  private carousels = new Map<
    string,
    { api: CarouselAPI; handler: () => void }
  >();
  private currentBlobUrl: string | null = null;

  private persistedState = createLocalStorageState<PersistedPlayerState>(
    "cadence.player_state",
    {
      currentTrack: null,
      trackQueue: [],
      queueIndex: 0,
      isMuted: false,
      volume: 1,
      currentTime: 0,
    }
  );

  get currentTrack() {
    return this.persistedState.value.currentTrack;
  }
  set currentTrack(value: AudioFile | null) {
    this.persistedState.value = {
      ...this.persistedState.value,
      currentTrack: value,
    };
  }

  get trackQueue() {
    return this.persistedState.value.trackQueue;
  }
  set trackQueue(value: AudioFile[]) {
    this.persistedState.value = {
      ...this.persistedState.value,
      trackQueue: value,
    };
  }

  get queueIndex() {
    return this.persistedState.value.queueIndex;
  }
  set queueIndex(value: number) {
    this.persistedState.value = {
      ...this.persistedState.value,
      queueIndex: value,
    };
  }

  get isMuted() {
    return this.persistedState.value.isMuted;
  }
  set isMuted(value: boolean) {
    this.persistedState.value = {
      ...this.persistedState.value,
      isMuted: value,
    };
  }

  get volume() {
    return this.persistedState.value.volume;
  }
  set volume(value: number) {
    this.persistedState.value = { ...this.persistedState.value, volume: value };
  }

  get currentTime() {
    return this.persistedState.value.currentTime;
  }
  set currentTime(value: number) {
    this.persistedState.value = {
      ...this.persistedState.value,
      currentTime: value,
    };
  }

  get progress() {
    return this.duration ? this.currentTime / this.duration : 0;
  }

  get isLoaded() {
    return this.playerRef !== null;
  }

  get currentStreamUrl() {
    return this.currentTrack ? getStreamUrl(this.currentTrack.id) : "";
  }

  get currentImageUrl() {
    return this.currentTrack ? getImageUrl(this.currentTrack.id) : "";
  }

  get currentQueuePosition() {
    return this.queueIndex + 1;
  }

  get queueLength() {
    return this.trackQueue.length;
  }

  initialize(player: HTMLAudioElement) {
    this.playerRef = player;

    if (this.isMuted) {
      this.playerRef.muted = true;
    }
    this.playerRef.volume = this.volume;

    if (this.playerRef && this.currentTrack) {
      this.updateMetadata(this.currentTrack);
    }

    this.playerRef.addEventListener("loadedmetadata", () => {
      this.duration = this.playerRef!.duration || 0;
      if (this.currentTime > 0 && this.currentTime < this.duration) {
        this.playerRef!.currentTime = this.currentTime;
      }
    });

    this.playerRef.addEventListener("timeupdate", () => {
      if (this.playerRef && this.playerRef?.currentTime > 0) {
        this.currentTime = this.playerRef.currentTime;
      }
    });

    this.playerRef.addEventListener("ended", () => {
      this.isPlaying = false;
      this.playNext();
    });
  }

  cleanup() {
    if (this.currentBlobUrl) {
      revokeAudioUrl(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }
  }

  initializeCarousel(id: string, api: CarouselAPI) {
    const existing = this.carousels.get(id);
    if (existing) {
      existing.api.off("select", existing.handler);
    }

    const handler = () => {
      const carousel = this.carousels.get(id);
      if (!carousel) return;

      const newIndex = carousel.api.selectedScrollSnap() ?? 0;
      if (newIndex !== this.queueIndex) {
        this.playAtIndex(newIndex);
      }
    };

    this.carousels.set(id, { api, handler });
    api.on("select", handler);

    if (this.currentTrack && this.trackQueue.length > 0) {
      this.syncCarouselToTrack(this.queueIndex, true);
    }
  }

  async updateMetadata(track: AudioFile) {
    if (!this.playerRef) return;

    if (this.currentBlobUrl) {
      revokeAudioUrl(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }

    const audioUrl = await getAudioUrl(track.id);
    this.playerRef.src = audioUrl;
    this.playerRef.load();

    if (audioUrl.startsWith("blob:")) {
      this.currentBlobUrl = audioUrl;
    }

    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.metadata?.title || track.filename || "Unknown Title",
        artist: track.metadata?.artist || "Unknown Artist",
        album:
          track.metadata?.album || track.metadata?.title || "Unknown Album",
        artwork: [
          {
            src: getImageUrl(track.id),
            type: "image/png",
          },
        ],
      });

      navigator.mediaSession.setActionHandler("play", () => this.play());
      navigator.mediaSession.setActionHandler("pause", () => this.pause());
      navigator.mediaSession.setActionHandler("seekto", (e) =>
        this.seek(e.seekTime ?? 0)
      );
      navigator.mediaSession.setActionHandler("previoustrack", () =>
        this.playPrevious()
      );
      navigator.mediaSession.setActionHandler("nexttrack", () =>
        this.playNext()
      );
    }
  }

  async play(track?: AudioFile) {
    if (this.playerRef) {
      if (track && this.currentTrack?.id !== track.id) {
        this.currentTrack = track;
        const trackIndex = this.trackQueue.findIndex((t) => t.id === track.id);
        this.queueIndex = trackIndex;
        this.syncCarouselToTrack(trackIndex);
        this.currentTime = 0;
        await this.updateMetadata(track);
      }
      this.isPlaying = true;
      try {
        await this.playerRef.play();
      } catch (error) {
        console.error("Failed to play audio:", error);
        this.isPlaying = false;
      }
    }
  }

  pause() {
    if (this.playerRef && this.isPlaying) {
      this.isPlaying = false;
      this.playerRef.pause();
    }
  }

  togglePlayPause() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  playNext() {
    if (this.queueIndex < this.trackQueue.length - 1) {
      this.queueIndex++;
      this.play(this.trackQueue[this.queueIndex]);
    } else if (this.trackQueue.length > 0) {
      this.queueIndex = 0;
      this.play(this.trackQueue[0]);
    } else {
      this.pause();
    }
  }

  playPrevious() {
    if (this.queueIndex > 0) {
      this.queueIndex--;
      this.play(this.trackQueue[this.queueIndex]);
    } else if (this.trackQueue[0]) {
      this.play(this.trackQueue[this.trackQueue.length - 1]);
    }
  }

  playAtIndex(index: number) {
    if (this.trackQueue[index]) {
      this.queueIndex = index;
      this.syncCarouselToTrack(index);
      this.play(this.trackQueue[index]);
    }
  }

  seek(time: number) {
    if (this.playerRef) {
      this.playerRef.currentTime = time;
      this.currentTime = time;
    }
  }

  setQueue(tracks: AudioFile[], startIndex: number = 0) {
    this.trackQueue = tracks;
    this.queueIndex = startIndex;
    if (tracks[startIndex]) {
      this.play(tracks[startIndex]);
    }
  }

  addToQueue(track: AudioFile) {
    this.trackQueue.push(track);
  }

  addNextInQueue(track: AudioFile) {
    this.trackQueue.splice(this.queueIndex + 1, 0, track);
  }

  removeFromQueue(index: number) {
    if (index === this.queueIndex) {
      this.trackQueue.splice(index, 1);
      if (this.queueIndex >= this.trackQueue.length) {
        this.queueIndex = this.trackQueue.length - 1;
      }
      if (this.trackQueue[this.queueIndex]) {
        this.play(this.trackQueue[this.queueIndex]);
      } else {
        this.pause();
        this.currentTrack = null;
      }
    } else {
      this.trackQueue.splice(index, 1);
      if (index < this.queueIndex) {
        this.queueIndex--;
      }
    }
  }

  clearQueue() {
    this.trackQueue = [];
    this.queueIndex = -1;
  }

  syncCarouselToTrack(index: number, jump: boolean = false) {
    for (const { api } of this.carousels.values()) {
      api.scrollTo(index, jump);
    }
  }
}

export const playerStore = new PlayerState();

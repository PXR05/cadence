import type { AudioFile } from "$lib/schemas";
import {
  nativeBridgeStore,
  type NativePlaybackContextPayload,
  type NativePlayerCommandPayloadMap,
  type NativePlayerEvent,
} from "./nativeBridge.svelte";

export interface NativePlaybackRuntimeContext {
  queueIndex: number;
  queueLength: number;
  trackId: string | null;
  playlistId: string | null;
}

interface PlayerNativeDomainOptions {
  shouldUseNativePlayback: () => boolean;
  getRuntimeContext: () => NativePlaybackRuntimeContext;
  getCurrentTrackId: () => string | null;
  applyNativeTiming: (
    positionSeconds?: number,
    durationSeconds?: number,
  ) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setMediaSessionPlaybackState: (state: MediaSessionPlaybackState) => void;
  playNext: () => void;
}

export class PlayerNativeDomain {
  private nativeEventUnsubscribe: (() => void) | null = null;
  private nativeSessionId = this.createNativeSessionId();

  constructor(private options: PlayerNativeDomainOptions) {
    this.bindNativeBridgeEvents();
  }

  initialize(volume: number, muted: boolean) {
    this.postNativePlayerCommand("player.initialize", {
      ...this.createNativePlaybackContext(),
      volume,
      muted,
    });
  }

  cleanup() {
    this.postNativePlayerCommand("player.cleanup", {
      sessionId: this.nativeSessionId,
    });
  }

  updateTrack(track: AudioFile, sourceTrack: AudioFile) {
    this.postNativePlayerCommand("player.load_track", {
      ...this.createNativePlaybackContext(),
      canonicalTrackId: track.id,
      sourceTrackId: sourceTrack.id,
      canonicalTrack: track,
      sourceTrack,
    });
  }

  play(
    opts: { track?: AudioFile; index?: number } | undefined,
    positionSeconds: number,
  ) {
    this.postNativePlayerCommand("player.play", {
      ...this.createNativePlaybackContext(),
      requestedTrackId: opts?.track?.id ?? null,
      requestedIndex: opts?.index ?? null,
      positionSeconds,
    });
  }

  pause(positionSeconds: number) {
    this.postNativePlayerCommand("player.pause", {
      ...this.createNativePlaybackContext(),
      positionSeconds,
    });
  }

  seek(targetSeconds: number) {
    this.postNativePlayerCommand("player.seek", {
      ...this.createNativePlaybackContext(),
      targetSeconds,
    });
  }

  setMuted(muted: boolean) {
    this.postNativePlayerCommand("player.set_muted", {
      ...this.createNativePlaybackContext(),
      muted,
    });
  }

  setVolume(volume: number) {
    this.postNativePlayerCommand("player.set_volume", {
      ...this.createNativePlaybackContext(),
      volume,
    });
  }

  stop() {
    this.postNativePlayerCommand("player.stop", {
      ...this.createNativePlaybackContext(),
      reason: "reset_content_state",
    });
  }

  private createNativeSessionId() {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }

    return `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private createNativePlaybackContext(): NativePlaybackContextPayload {
    return {
      sessionId: this.nativeSessionId,
      ...this.options.getRuntimeContext(),
    };
  }

  private bindNativeBridgeEvents() {
    if (this.nativeEventUnsubscribe) {
      return;
    }

    this.nativeEventUnsubscribe = nativeBridgeStore.subscribePlayerEvents(
      (event) => {
        this.handleNativePlayerEvent(event);
      },
    );
  }

  private handleNativePlayerEvent(event: NativePlayerEvent) {
    if (!this.options.shouldUseNativePlayback()) {
      return;
    }

    switch (event.type) {
      case "player.state": {
        this.options.applyNativeTiming(
          event.payload.positionSeconds,
          event.payload.durationSeconds,
        );

        if (event.payload.playbackState === "playing") {
          this.options.setIsPlaying(true);
          this.options.setMediaSessionPlaybackState("playing");
          return;
        }

        if (event.payload.playbackState === "ended") {
          this.options.setIsPlaying(false);
          this.options.setMediaSessionPlaybackState("paused");
          this.options.playNext();
          return;
        }

        if (
          event.payload.playbackState === "paused" ||
          event.payload.playbackState === "idle" ||
          event.payload.playbackState === "error"
        ) {
          this.options.setIsPlaying(false);
          this.options.setMediaSessionPlaybackState("paused");
        }

        return;
      }
      case "player.position": {
        this.options.applyNativeTiming(
          event.payload.positionSeconds,
          event.payload.durationSeconds,
        );
        return;
      }
      case "player.track_loaded": {
        if (event.payload.trackId !== this.options.getCurrentTrackId()) {
          return;
        }

        this.options.applyNativeTiming(
          event.payload.positionSeconds,
          event.payload.durationSeconds,
        );
        return;
      }
      case "player.ended": {
        this.options.setIsPlaying(false);
        this.options.setMediaSessionPlaybackState("paused");
        this.options.playNext();
        return;
      }
      case "player.error": {
        this.options.setIsPlaying(false);
        this.options.setMediaSessionPlaybackState("paused");
        console.error(
          `Native player error [${event.payload.code}]: ${event.payload.message}`,
        );
      }
    }
  }

  private postNativePlayerCommand<
    TType extends keyof NativePlayerCommandPayloadMap,
  >(type: TType, payload: NativePlayerCommandPayloadMap[TType]) {
    nativeBridgeStore.postPlayerCommand(type, payload);
  }
}

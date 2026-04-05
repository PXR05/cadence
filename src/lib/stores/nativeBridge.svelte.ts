import * as v from "valibot";
import type { AudioFile } from "$lib/schemas";
import { authStore } from "./auth.svelte";

export interface NativeBridgeInfo {
  platform: string;
  version: string;
  status_bar_height?: number;
  navigation_bar_height?: number;
}

export const NATIVE_BRIDGE_PROTOCOL = "cadence.native-bridge";
export const NATIVE_BRIDGE_VERSION = 1;
export const NATIVE_BRIDGE_RECEIVE_HOOK = "__cadenceNativeBridgeReceive";
export const NATIVE_BRIDGE_AUTH_SESSION_TYPE = "auth.set_session_token";

export type NativePlayerCommandType =
  | "player.initialize"
  | "player.cleanup"
  | "player.load_track"
  | "player.play"
  | "player.pause"
  | "player.seek"
  | "player.set_muted"
  | "player.set_volume"
  | "player.stop";

export interface NativePlaybackContextPayload {
  sessionId: string;
  queueIndex: number;
  queueLength: number;
  trackId: string | null;
  playlistId: string | null;
}

export interface NativePlayerCommandPayloadMap {
  "player.initialize": NativePlaybackContextPayload & {
    volume: number;
    muted: boolean;
  };
  "player.cleanup": {
    sessionId: string;
  };
  "player.load_track": NativePlaybackContextPayload & {
    canonicalTrackId: string;
    sourceTrackId: string;
    canonicalTrack: AudioFile;
    sourceTrack: AudioFile;
  };
  "player.play": NativePlaybackContextPayload & {
    requestedTrackId: string | null;
    requestedIndex: number | null;
    positionSeconds: number;
  };
  "player.pause": NativePlaybackContextPayload & {
    positionSeconds: number;
  };
  "player.seek": NativePlaybackContextPayload & {
    targetSeconds: number;
  };
  "player.set_muted": NativePlaybackContextPayload & {
    muted: boolean;
  };
  "player.set_volume": NativePlaybackContextPayload & {
    volume: number;
  };
  "player.stop": NativePlaybackContextPayload & {
    reason: string;
  };
}

export interface NativeBridgeEnvelope<TPayload = unknown> {
  protocol: typeof NATIVE_BRIDGE_PROTOCOL;
  version: typeof NATIVE_BRIDGE_VERSION;
  id: string;
  timestamp: number;
  type: string;
  payload: TPayload;
}

export interface NativeBridgeMessage<TPayload = unknown> {
  type: string;
  payload: TPayload;
}

export interface NativeAuthSessionPayload {
  sessionId: string | null;
}

const NativeEnvelopeBaseSchema = {
  protocol: v.literal(NATIVE_BRIDGE_PROTOCOL),
  version: v.literal(NATIVE_BRIDGE_VERSION),
  id: v.string(),
  timestamp: v.number(),
};

const NativePlayerStateEventSchema = v.object({
  ...NativeEnvelopeBaseSchema,
  type: v.literal("player.state"),
  payload: v.object({
    playbackState: v.picklist([
      "idle",
      "buffering",
      "playing",
      "paused",
      "ended",
      "error",
    ]),
    positionSeconds: v.optional(v.number()),
    durationSeconds: v.optional(v.number()),
  }),
});

const NativePlayerPositionEventSchema = v.object({
  ...NativeEnvelopeBaseSchema,
  type: v.literal("player.position"),
  payload: v.object({
    positionSeconds: v.number(),
    durationSeconds: v.optional(v.number()),
  }),
});

const NativePlayerTrackLoadedEventSchema = v.object({
  ...NativeEnvelopeBaseSchema,
  type: v.literal("player.track_loaded"),
  payload: v.object({
    trackId: v.string(),
    positionSeconds: v.optional(v.number()),
    durationSeconds: v.optional(v.number()),
  }),
});

const NativePlayerEndedEventSchema = v.object({
  ...NativeEnvelopeBaseSchema,
  type: v.literal("player.ended"),
  payload: v.object({
    trackId: v.optional(v.string()),
    reason: v.optional(v.string()),
  }),
});

const NativePlayerErrorEventSchema = v.object({
  ...NativeEnvelopeBaseSchema,
  type: v.literal("player.error"),
  payload: v.object({
    code: v.string(),
    message: v.string(),
    recoverable: v.optional(v.boolean()),
  }),
});

export const NativePlayerEventSchema = v.union([
  NativePlayerStateEventSchema,
  NativePlayerPositionEventSchema,
  NativePlayerTrackLoadedEventSchema,
  NativePlayerEndedEventSchema,
  NativePlayerErrorEventSchema,
]);

export type NativePlayerEvent = v.InferOutput<typeof NativePlayerEventSchema>;
type NativePlayerEventListener = (event: NativePlayerEvent) => void;

class NativeBridgeStore {
  private _info = $state<NativeBridgeInfo | null>(null);
  private _isAvailable = $state(false);
  private _error = $state<string | null>(null);
  private messageCounter = 0;
  private receiveHookInstalled = false;
  private initialSessionSynced = false;
  private playerEventListeners = new Set<NativePlayerEventListener>();

  get info(): NativeBridgeInfo | null {
    return this._info;
  }

  get isAvailable(): boolean {
    return this._isAvailable;
  }

  get error(): string | null {
    return this._error;
  }

  get platform(): string | null {
    return this._info?.platform ?? null;
  }

  constructor() {
    this.installReceiveHook();
    this.syncInitialAuthSession();
  }

  refreshNativeInfo(): NativeBridgeInfo | null {
    const bridge = this.resolveBridge();
    if (!bridge) {
      this._info = null;
      this._error = null;
      return null;
    }

    try {
      const rawInfo = bridge.getNativeInfo();

      const parsedInfo = JSON.parse(rawInfo) as Partial<NativeBridgeInfo>;

      if (
        !parsedInfo ||
        typeof parsedInfo.platform !== "string" ||
        typeof parsedInfo.version !== "string"
      ) {
        throw new Error("Native info payload is missing required fields");
      }

      this._info = {
        platform: parsedInfo.platform,
        version: parsedInfo.version,
        status_bar_height: parsedInfo.status_bar_height ?? 0,
        navigation_bar_height: parsedInfo.navigation_bar_height ?? 0,
      };
      this._error = null;
      this.syncInitialAuthSession();
      return this._info;
    } catch (error) {
      if (this.isUnsupportedGetNativeInfo(error)) {
        this._info = null;
        this._error = null;
        return null;
      }

      const message =
        error instanceof Error
          ? error.message
          : "Failed to parse native bridge info";
      this._info = null;
      this._error = message;
      console.warn("Failed to read native bridge info:", error);
      return null;
    }
  }

  postMessage<TPayload>(message: NativeBridgeMessage<TPayload>): boolean {
    const bridge = this.resolveBridge();
    if (!bridge) {
      this._error = "Native bridge is unavailable";
      return false;
    }

    if (typeof message.type !== "string" || message.type.trim().length === 0) {
      this._error = "Native bridge message type is required";
      return false;
    }

    try {
      const envelope: NativeBridgeEnvelope<TPayload> = {
        protocol: NATIVE_BRIDGE_PROTOCOL,
        version: NATIVE_BRIDGE_VERSION,
        id: this.createMessageId(),
        timestamp: Date.now(),
        type: message.type,
        payload: message.payload,
      };

      bridge.postMessage(JSON.stringify(envelope));
      this._error = null;
      return true;
    } catch (error) {
      const messageText =
        error instanceof Error
          ? error.message
          : "Failed to post native bridge message";
      this._error = messageText;
      console.warn("Failed to post native bridge message:", error);
      return false;
    }
  }

  postPlayerCommand<TType extends NativePlayerCommandType>(
    type: TType,
    payload: NativePlayerCommandPayloadMap[TType],
  ): boolean {
    return this.postMessage({
      type,
      payload,
    });
  }

  postAuthSessionToken(sessionId: string | null): boolean {
    return this.postMessage<NativeAuthSessionPayload>({
      type: NATIVE_BRIDGE_AUTH_SESSION_TYPE,
      payload: {
        sessionId,
      },
    });
  }

  subscribePlayerEvents(listener: NativePlayerEventListener): () => void {
    this.installReceiveHook();
    this.playerEventListeners.add(listener);

    return () => {
      this.playerEventListeners.delete(listener);
    };
  }

  receiveFromNative(rawMessage: unknown): boolean {
    const normalizedMessage = this.normalizeInboundMessage(rawMessage);
    const parsed = v.safeParse(NativePlayerEventSchema, normalizedMessage);

    if (!parsed.success) {
      this._error = "Invalid native player event payload";
      console.warn("Failed to parse native player event:", parsed.issues);
      return false;
    }

    this._error = null;

    for (const listener of this.playerEventListeners) {
      try {
        listener(parsed.output);
      } catch (error) {
        console.warn("Native player event listener failed:", error);
      }
    }

    return true;
  }

  private createMessageId() {
    this.messageCounter += 1;
    return `msg-${Date.now().toString(36)}-${this.messageCounter.toString(36)}`;
  }

  private normalizeInboundMessage(rawMessage: unknown): unknown {
    if (typeof rawMessage !== "string") {
      return rawMessage;
    }

    try {
      return JSON.parse(rawMessage);
    } catch (error) {
      this._error = "Invalid native event JSON";
      console.warn("Failed to parse native event JSON:", error);
      return rawMessage;
    }
  }

  private installReceiveHook() {
    if (this.receiveHookInstalled || typeof window === "undefined") {
      return;
    }

    (window as unknown as Record<string, unknown>)[NATIVE_BRIDGE_RECEIVE_HOOK] =
      (rawMessage: unknown) => this.receiveFromNative(rawMessage);

    this.receiveHookInstalled = true;
  }

  private syncInitialAuthSession() {
    if (this.initialSessionSynced || typeof window === "undefined") {
      return;
    }

    if (!this.resolveBridge()) {
      return;
    }

    const didSync = this.postAuthSessionToken(authStore.sessionId);
    if (didSync) {
      this.initialSessionSynced = true;
    }
  }

  private isUnsupportedGetNativeInfo(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    const normalized = error.message.toLowerCase();
    return (
      normalized.includes("getnativeinfo") &&
      normalized.includes("method not found")
    );
  }

  private resolveBridge(): NativeBridgeApi | null {
    if (typeof window === "undefined") {
      this._isAvailable = false;
      return null;
    }

    const bridge = window.NativeBridge;
    const isBridgeValid =
      !!bridge &&
      typeof bridge.getNativeInfo === "function" &&
      typeof bridge.postMessage === "function";

    this._isAvailable = isBridgeValid;
    return isBridgeValid ? bridge : null;
  }
}

export const nativeBridgeStore = new NativeBridgeStore();

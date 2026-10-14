import * as v from "valibot";
import { UploadResponseSchema, type UploadResponse } from "$lib/schemas/audio";
import type { RemoteProvider } from "$lib/schemas";
import { backendConfig } from "../config";
import { backendRequest, createBackendHeaders } from "../client";
import { requireBackendCapability } from "../capabilities";
import { buildBackendUrl } from "../runtime.svelte";

export interface UploadFileOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  stallTimeoutMs?: number;
  minUploadSpeedBps?: number;
  baseTimeoutMs?: number;
  maxTimeoutMs?: number;
  onProgress?: (percent: number) => void;
}

export const DEFAULT_UPLOAD_BASE_TIMEOUT_MS = 30_000;
export const DEFAULT_UPLOAD_MIN_TIMEOUT_MS = 300_000;
export const DEFAULT_UPLOAD_MIN_SPEED_BPS = 50 * 1024;
export const DEFAULT_UPLOAD_MAX_TIMEOUT_MS = 2 * 60 * 60 * 1000;
export const DEFAULT_UPLOAD_STALL_TIMEOUT_MS = 60_000;

export interface UploadTimeoutEstimateOptions
  extends Pick<
    UploadFileOptions,
    "minUploadSpeedBps" | "baseTimeoutMs" | "maxTimeoutMs"
  > {
  minTimeoutMs?: number;
}

export function estimateUploadTimeoutMs(
  fileSizeBytes: number,
  options: UploadTimeoutEstimateOptions = {},
): number {
  const requestedSpeed =
    options.minUploadSpeedBps ?? DEFAULT_UPLOAD_MIN_SPEED_BPS;
  const speed = requestedSpeed > 0 ? requestedSpeed : DEFAULT_UPLOAD_MIN_SPEED_BPS;
  const base = options.baseTimeoutMs ?? DEFAULT_UPLOAD_BASE_TIMEOUT_MS;
  const min = options.minTimeoutMs ?? DEFAULT_UPLOAD_MIN_TIMEOUT_MS;
  const max = options.maxTimeoutMs ?? DEFAULT_UPLOAD_MAX_TIMEOUT_MS;
  const size = fileSizeBytes > 0 ? fileSizeBytes : 0;
  return Math.min(Math.max(Math.ceil(base + (size / speed) * 1000), min), max);
}

function extendedDeadline(
  loaded: number,
  total: number,
  elapsedMs: number,
  baseMs: number,
  currentMs: number,
  maxMs: number,
): number {
  if (total <= 0 || loaded <= 0 || elapsedMs <= 1000) return currentMs;
  const speed = loaded / (elapsedMs / 1000);
  if (!(speed > 0)) return currentMs;
  const needed = elapsedMs + ((total - loaded) / speed) * 1000 + baseMs;
  return Math.min(Math.max(Math.ceil(needed), currentMs), maxMs);
}

function sendAudioFile(
  file: File,
  options: UploadFileOptions = {},
): Promise<XMLHttpRequest> {
  requireBackendCapability("uploads.file");
  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(new Error("Upload cancelled"));
      return;
    }
    const baseMs = options.baseTimeoutMs ?? DEFAULT_UPLOAD_BASE_TIMEOUT_MS;
    const maxMs = options.maxTimeoutMs ?? DEFAULT_UPLOAD_MAX_TIMEOUT_MS;
    const stallMs = options.stallTimeoutMs ?? DEFAULT_UPLOAD_STALL_TIMEOUT_MS;
    const explicitMs = options.timeoutMs;
    let deadlineMs =
      explicitMs === undefined || explicitMs === null
        ? estimateUploadTimeoutMs(file.size, {
            minUploadSpeedBps: options.minUploadSpeedBps,
            baseTimeoutMs: baseMs,
            maxTimeoutMs: maxMs,
          })
        : explicitMs <= 0
          ? Number.POSITIVE_INFINITY
          : explicitMs;
    const timeoutMessage = (ms: number) =>
      `Upload timed out after ${Math.round(ms / 1000)}s`;
    const stallMessage =
      `Upload stalled (no progress for ${Math.round(stallMs / 1000)}s)`;
    const startTime = Date.now();
    const formData = new FormData();
    formData.append("file", file);
    const xhr = new XMLHttpRequest();
    let settled = false;
    let absoluteTimer: ReturnType<typeof setTimeout> | undefined;
    let stallTimer: ReturnType<typeof setTimeout> | undefined;
    const finish = (action: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(absoluteTimer);
      clearTimeout(stallTimer);
      action();
    };
    const fail = (message: string) =>
      finish(() => {
        xhr.abort();
        reject(new Error(message));
      });
    const armAbsolute = (delayMs: number) => {
      clearTimeout(absoluteTimer);
      if (Number.isFinite(delayMs))
        absoluteTimer = setTimeout(() => fail(timeoutMessage(deadlineMs)), delayMs);
    };
    const armStall = () => {
      clearTimeout(stallTimer);
      if (stallMs > 0) stallTimer = setTimeout(() => fail(stallMessage), stallMs);
    };
    armAbsolute(deadlineMs);
    armStall();
    xhr.upload.addEventListener("progress", (event) => {
      if (settled) return;
      if (event.lengthComputable)
        options.onProgress?.((event.loaded / event.total) * 100);
      armStall();
      if (explicitMs !== undefined && explicitMs !== null) return;
      const next = extendedDeadline(
        event.loaded,
        event.lengthComputable ? event.total : file.size,
        Date.now() - startTime,
        baseMs,
        deadlineMs,
        maxMs,
      );
      if (next !== deadlineMs) {
        deadlineMs = next;
        armAbsolute(startTime + deadlineMs - Date.now());
      }
    });
    xhr.upload.addEventListener("load", () => clearTimeout(stallTimer));
    const abort = () => fail("Upload cancelled");
    xhr.addEventListener("loadend", () => options.signal?.removeEventListener("abort", abort), {
      once: true,
    });
    for (const eventName of ["error", "timeout", "abort"] as const)
      xhr.addEventListener(eventName, () => fail(`Upload ${eventName}`), {
        once: true,
      });
    xhr.addEventListener(
      "load",
      () =>
        finish(() => {
          if (xhr.status >= 200 && xhr.status < 300) resolve(xhr);
          else reject(new Error(`Upload failed (${xhr.status})`));
        }),
      { once: true },
    );
    options.signal?.addEventListener("abort", abort, { once: true });
    xhr.timeout = 0;
    xhr.open("POST", buildBackendUrl(backendConfig.routes.audio.upload));
    xhr.withCredentials = backendConfig.auth.credentials === "include";
    for (const [name, value] of createBackendHeaders())
      xhr.setRequestHeader(name, value);
    xhr.send(formData);
  });
}

export async function uploadAudioFile(
  file: File,
  options: UploadFileOptions = {},
): Promise<boolean> {
  try {
    await sendAudioFile(file, options);
    return true;
  } catch {
    return false;
  }
}

export async function uploadAudioFileWithResult(
  file: File,
  options: UploadFileOptions = {},
): Promise<UploadResponse> {
  const xhr = await sendAudioFile(file, options);
  const result = v.parse(UploadResponseSchema, JSON.parse(xhr.responseText));
  if (!result.success || !result.id) {
    throw new Error(result.message || "Upload did not return a track ID");
  }
  return result;
}

export async function openRemoteImportStream(
  provider: RemoteProvider,
  url: string,
  streamId: string,
  signal: AbortSignal,
): Promise<Response> {
  requireBackendCapability(`remoteProviders.${provider}.import`);
  requireBackendCapability("uploads.remote");
  const params = new URLSearchParams({ url, stream: streamId });
  return backendRequest(
    `${backendConfig.routes.audio.remoteImport(provider)}?${params}`,
    {
      method: "GET",
      signal,
      headers: { Accept: "text/event-stream" },
    },
  );
}

export async function cancelRemoteImport(
  provider: RemoteProvider,
  streamId: string,
): Promise<void> {
  requireBackendCapability(`remoteProviders.${provider}.import`);
  const response = await backendRequest(
    backendConfig.routes.audio.remoteImportCancel(provider, streamId),
    { method: "DELETE" },
  );
  if (!response.ok) {
    throw new Error(`Failed to cancel download: ${await response.text()}`);
  }
  const data = (await response.json()) as { success: boolean; message: string };
  if (!data.success) throw new Error(data.message || "Failed to cancel download");
}

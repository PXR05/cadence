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
  onProgress?: (percent: number) => void;
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
    const formData = new FormData();
    formData.append("file", file);
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        options.onProgress?.((event.loaded / event.total) * 100);
      }
    });

    const abort = () => xhr.abort();
    xhr.addEventListener(
      "loadend",
      () => options.signal?.removeEventListener("abort", abort),
      { once: true },
    );
    for (const eventName of ["error", "timeout", "abort"] as const) {
      xhr.addEventListener(
        eventName,
        () => reject(new Error(`Upload ${eventName}`)),
        { once: true },
      );
    }
    xhr.addEventListener(
      "load",
      () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve(xhr);
        else reject(new Error(`Upload failed (${xhr.status})`));
      },
      { once: true },
    );

    options.signal?.addEventListener("abort", abort, {
      once: true,
    });
    xhr.timeout = options.timeoutMs ?? 300_000;
    xhr.open("POST", buildBackendUrl(backendConfig.routes.audio.upload));
    xhr.withCredentials = backendConfig.auth.credentials === "include";
    for (const [name, value] of createBackendHeaders()) {
      xhr.setRequestHeader(name, value);
    }
    xhr.send(formData);
  });
}

export async function uploadAudioFile(
  file: File,
  options: UploadFileOptions = {},
): Promise<boolean> {
  requireBackendCapability("uploads.file");
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


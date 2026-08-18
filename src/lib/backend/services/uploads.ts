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

export function uploadAudioFile(
  file: File,
  options: UploadFileOptions = {},
): Promise<boolean> {
  requireBackendCapability("uploads.file");
  return new Promise((resolve) => {
    const formData = new FormData();
    formData.append("file", file);
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        options.onProgress?.((event.loaded / event.total) * 100);
      }
    });

    for (const eventName of ["error", "timeout", "abort"] as const) {
      xhr.addEventListener(eventName, () => resolve(false), { once: true });
    }
    xhr.addEventListener(
      "load",
      () => resolve(xhr.status >= 200 && xhr.status < 300),
      { once: true },
    );

    options.signal?.addEventListener("abort", () => xhr.abort(), {
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


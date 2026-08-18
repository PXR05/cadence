import { backendConfig } from "./config";
import { buildBackendUrl } from "./runtime.svelte";

let sessionProvider: () => string | null = () => null;

export function setBackendSessionProvider(
  provider: () => string | null,
): void {
  sessionProvider = provider;
}

export interface BackendRequestOptions extends RequestInit {
  authenticated?: boolean;
}

export function createBackendHeaders(
  headers?: HeadersInit,
  authenticated = true,
): Headers {
  const result = new Headers(headers);
  const sessionId = sessionProvider();
  const mode = backendConfig.auth.mode;

  if (
    authenticated &&
    sessionId &&
    mode !== "cookie" &&
    !result.has(backendConfig.auth.bearerHeader)
  ) {
    result.set(backendConfig.auth.bearerHeader, `Bearer ${sessionId}`);
  }

  return result;
}

export async function backendRequest(
  path: string,
  options: BackendRequestOptions = {},
): Promise<Response> {
  const { authenticated = true, ...init } = options;
  return fetch(buildBackendUrl(path), {
    ...init,
    credentials: backendConfig.auth.credentials,
    mode: "cors",
    headers: createBackendHeaders(init.headers, authenticated),
  });
}

export async function backendJson<T>(
  path: string,
  options: BackendRequestOptions = {},
): Promise<T> {
  const response = await backendRequest(path, options);
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(body || `${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

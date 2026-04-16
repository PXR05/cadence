import { buildBackendUrl } from "$lib/stores/apiUrl.svelte";
import { authStore } from "$lib/stores/auth.svelte";

export async function authFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const url = buildBackendUrl(path);
  const headers = new Headers(init?.headers);
  const sessionId = authStore.sessionId;

  if (sessionId && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${sessionId}`);
  }

  return fetch(url, {
    ...init,
    credentials: "include",
    mode: "cors",
    headers,
  });
}

import { buildBackendUrl } from "$lib/stores/apiUrl.svelte";

function getSessionIdFromStorage(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem("cadence.sessionId");
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return typeof parsed === "string" && parsed.trim() ? parsed : null;
  } catch {
    return null;
  }
}

export async function authFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const url = buildBackendUrl(path);
  const headers = new Headers(init?.headers);
  const sessionId = getSessionIdFromStorage();

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

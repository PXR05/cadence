export function getSessionId(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/cadence\.sessionId=([^;]+)/);
  return match ? match[1] : null;
}

export async function authFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const baseUrl = import.meta.env.VITE_API_URL;
  const sessionId = getSessionId();

  const headers = new Headers(init?.headers);
  if (sessionId) {
    headers.set("Authorization", `Bearer ${sessionId}`);
  }

  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
}

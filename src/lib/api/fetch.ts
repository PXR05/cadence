export function getAuthToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/cadence\.token=([^;]+)/);
  return match ? match[1] : null;
}

export async function authFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const baseUrl = import.meta.env.VITE_API_URL;
  const token = getAuthToken();

  const headers = new Headers(init?.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
}

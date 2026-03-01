export async function authFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const baseUrl = import.meta.env.VITE_API_URL;

  if (!baseUrl) {
    throw new Error("API base URL is not defined in environment variables");
  }

  return fetch(`${baseUrl}${path}`, {
    ...init,
    credentials: "include",
    mode: "cors",
  });
}

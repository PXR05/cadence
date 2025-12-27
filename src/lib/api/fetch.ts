export async function authFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const baseUrl = import.meta.env.VITE_API_URL;

  return fetch(`${baseUrl}${path}`, {
    ...init,
    credentials: "include",
    mode: "cors",
  });
}

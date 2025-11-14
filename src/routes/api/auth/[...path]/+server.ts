import { error, json } from "@sveltejs/kit";

if (!process.env.API_URL) throw new Error("API_URL is not set.");

const BACKEND_URL = process.env.API_URL ?? "";

async function proxyRequest(
  method: string,
  path: string,
  authHash: string | undefined,
  url: URL,
  body?: any
): Promise<Response> {
  const backendUrl = new URL(`/auth/${path}`, BACKEND_URL);
  url.searchParams.forEach((value, key) => {
    backendUrl.searchParams.append(key, value);
  });

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (authHash) {
    headers.Authorization = `Bearer ${authHash}`;
  }

  try {
    const response = await fetch(backendUrl.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw error(
        response.status,
        errorData.error || `Backend error: ${response.statusText}`
      );
    }

    const data = await response.json();
    return json(data);
  } catch (err) {
    console.error("Auth proxy error:", err);
    if (err && typeof err === "object" && "status" in err) {
      throw err;
    }
    throw error(500, "Failed to fetch from backend");
  }
}

export const GET = async ({ params, url, cookies }) => {
  const { path } = params;
  const authHash = cookies.get("cadence.token");

  return proxyRequest("GET", path, authHash, url);
};

export const POST = async ({ params, url, cookies, request }) => {
  const { path } = params;
  const authHash = cookies.get("cadence.token");

  const body = await request.json().catch(() => ({}));
  return proxyRequest("POST", path, authHash, url, body);
};

export const PATCH = async ({ params, url, cookies, request }) => {
  const { path } = params;
  const authHash = cookies.get("cadence.token");

  const body = await request.json().catch(() => ({}));
  return proxyRequest("PATCH", path, authHash, url, body);
};

export const DELETE = async ({ params, url, cookies }) => {
  const { path } = params;
  const authHash = cookies.get("cadence.token");

  return proxyRequest("DELETE", path, authHash, url);
};

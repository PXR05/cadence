import "dotenv/config";
import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

if (!process.env.API_URL) throw new Error("API_URL is not set.");

const BACKEND_URL = process.env.API_URL ?? "";

async function proxyRequest(
  method: string,
  path: string,
  authHash: string,
  url: URL,
  body?: any
): Promise<Response> {
  const backendUrl = new URL(`/token/${path}`, BACKEND_URL);
  url.searchParams.forEach((value, key) => {
    backendUrl.searchParams.append(key, value);
  });

  const headers: HeadersInit = {
    Authorization: `Bearer ${authHash}`,
    "Content-Type": "application/json",
  };

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
    console.error("Token proxy error:", err);
    if (err && typeof err === "object" && "status" in err) {
      throw err;
    }
    throw error(500, "Failed to fetch from backend");
  }
}

export const GET: RequestHandler = async ({ params, url, cookies }) => {
  const { path } = params;
  const authHash = cookies.get("cadence.token");

  if (!authHash) {
    throw error(401, "Unauthorized: No authentication provided");
  }

  return proxyRequest("GET", path, authHash, url);
};

export const POST: RequestHandler = async ({
  params,
  url,
  cookies,
  request,
}) => {
  const { path } = params;
  const authHash = cookies.get("cadence.token");

  if (!authHash) {
    throw error(401, "Unauthorized: No authentication provided");
  }

  const body = await request.json().catch(() => ({}));
  return proxyRequest("POST", path, authHash, url, body);
};

export const DELETE: RequestHandler = async ({ params, url, cookies }) => {
  const { path } = params;
  const authHash = cookies.get("cadence.token");

  if (!authHash) {
    throw error(401, "Unauthorized: No authentication provided");
  }

  return proxyRequest("DELETE", path, authHash, url);
};

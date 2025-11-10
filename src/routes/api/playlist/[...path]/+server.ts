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
  const backendUrl = new URL(`/playlist/${path}`, BACKEND_URL);
  url.searchParams.forEach((value, key) => {
    backendUrl.searchParams.append(key, value);
  });

  const headers: HeadersInit = {
    Authorization: `Bearer ${authHash}`,
  };

  try {
    const response = await fetch(backendUrl.toString(), {
      method,
      headers,
      body: body || undefined,
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
    console.error("Playlist proxy error:", url, backendUrl, err);
    if (err && typeof err === "object" && "status" in err) {
      throw err;
    }
    throw error(500, "Failed to fetch from backend");
  }
}

export const GET: RequestHandler = async ({
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

  const backendUrl = new URL(`/playlist/${path}`, BACKEND_URL);
  url.searchParams.forEach((value, key) => {
    backendUrl.searchParams.append(key, value);
  });

  const headers: HeadersInit = {
    Authorization: `Bearer ${authHash}`,
  };

  const rangeHeader = request.headers.get("range");
  if (rangeHeader) {
    headers["Range"] = rangeHeader;
  }

  try {
    const response = await fetch(backendUrl.toString(), {
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw error(
        response.status,
        errorData.error || `Backend error: ${response.statusText}`
      );
    }

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const data = await response.json();
      return json(data);
    }

    const responseHeaders: Record<string, string> = {
      "Content-Type": contentType,
    };

    const headersToPreserve = [
      "content-length",
      "accept-ranges",
      "content-range",
      "content-disposition",
      "cache-control",
      "etag",
      "last-modified",
    ];

    headersToPreserve.forEach((header) => {
      const value = response.headers.get(header);
      if (value) {
        responseHeaders[
          header
            .split("-")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join("-")
        ] = value;
      }
    });

    if (contentType.startsWith("image/") && !responseHeaders["Cache-Control"]) {
      responseHeaders["Cache-Control"] = "public, max-age=31536000";
    }

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error("Playlist proxy error:", backendUrl, err);
    if (err && typeof err === "object" && "status" in err) {
      throw err;
    }
    throw error(500, "Failed to fetch from backend");
  }
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

  try {
    const contentType = request.headers.get("content-type");
    let body: BodyInit | undefined;
    const backendUrl = new URL(`/playlist/${path}`, BACKEND_URL);
    url.searchParams.forEach((value, key) => {
      backendUrl.searchParams.append(key, value);
    });

    const headers: HeadersInit = {
      Authorization: `Bearer ${authHash}`,
    };

    if (contentType?.includes("multipart/form-data")) {
      body = (await request.formData()) as any;
    } else if (contentType?.includes("application/json")) {
      headers["Content-Type"] = "application/json";
      const jsonBody = await request.json();
      body = JSON.stringify(jsonBody);
    }

    const response = await fetch(backendUrl.toString(), {
      method: "POST",
      headers,
      body,
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
    console.error("Playlist proxy error:", err);
    if (err && typeof err === "object" && "status" in err) {
      throw err;
    }
    throw error(500, "Failed to fetch from backend");
  }
};

export const PATCH: RequestHandler = async ({
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

  try {
    const contentType = request.headers.get("content-type");
    let body: BodyInit | undefined;
    const backendUrl = new URL(`/playlist/${path}`, BACKEND_URL);
    url.searchParams.forEach((value, key) => {
      backendUrl.searchParams.append(key, value);
    });

    const headers: HeadersInit = {
      Authorization: `Bearer ${authHash}`,
    };

    if (contentType?.includes("multipart/form-data")) {
      body = (await request.formData()) as any;
    } else if (contentType?.includes("application/json")) {
      headers["Content-Type"] = "application/json";
      const jsonBody = await request.json();
      body = JSON.stringify(jsonBody);
    }

    const response = await fetch(backendUrl.toString(), {
      method: "PATCH",
      headers,
      body,
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
    console.error("Playlist proxy error:", err);
    if (err && typeof err === "object" && "status" in err) {
      throw err;
    }
    throw error(500, "Failed to fetch from backend");
  }
};

export const DELETE: RequestHandler = async ({ params, url, cookies }) => {
  const { path } = params;
  const authHash = cookies.get("cadence.token");

  if (!authHash) {
    throw error(401, "Unauthorized: No authentication provided");
  }

  return proxyRequest("DELETE", path, authHash, url);
};

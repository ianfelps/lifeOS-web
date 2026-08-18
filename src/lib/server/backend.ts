import type { AuthResponse } from "@/lib/api/contracts";

export function getApiUrl(): string {
  const apiUrl = process.env.API_URL?.trim();
  if (!apiUrl) {
    throw new Error("API_URL is not configured.");
  }
  return apiUrl.replace(/\/$/, "");
}

export async function refreshSession(refreshToken: string): Promise<AuthResponse | null> {
  const response = await fetch(`${getApiUrl()}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
    cache: "no-store",
  });
  if (!response.ok) {
    return null;
  }
  return response.json() as Promise<AuthResponse>;
}

export async function forwardRequest(
  path: string,
  request: Request,
  accessToken: string,
  body?: ArrayBuffer,
): Promise<Response> {
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("Content-Type", contentType);
  }
  headers.set("Authorization", `Bearer ${accessToken}`);

  const requestUrl = new URL(request.url);
  return fetch(`${getApiUrl()}/${path}${requestUrl.search}`, {
    method: request.method,
    headers,
    body: body && body.byteLength > 0 ? body : undefined,
    cache: "no-store",
  });
}

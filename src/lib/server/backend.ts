import type { AuthResponse } from "@/lib/api/contracts";

export function getApiUrl(): string {
  const apiUrl = process.env.API_URL?.trim();
  if (!apiUrl) {
    throw new Error("API_URL is not configured.");
  }
  return apiUrl.replace(/\/$/, "");
}

// The API rotates refresh tokens and revokes the session when a used token is presented again.
// Parallel requests from one page share the same cookie, so they must share one refresh, and
// requests still carrying the old cookie shortly after it reuse the rotated session.
const refreshReuseWindowMs = 30_000;

interface RefreshEntry {
  promise: Promise<AuthResponse | null>;
  settledAt?: number;
}

const refreshes = new Map<string, RefreshEntry>();

export function refreshSession(refreshToken: string): Promise<AuthResponse | null> {
  pruneRefreshes(Date.now());
  const existing = refreshes.get(refreshToken);
  if (existing) {
    return existing.promise;
  }

  const entry: RefreshEntry = { promise: requestRefresh(refreshToken) };
  refreshes.set(refreshToken, entry);
  entry.promise.then(
    (session) => {
      if (session) {
        entry.settledAt = Date.now();
      } else {
        refreshes.delete(refreshToken);
      }
    },
    () => refreshes.delete(refreshToken),
  );
  return entry.promise;
}

function pruneRefreshes(now: number): void {
  for (const [token, entry] of refreshes) {
    if (entry.settledAt !== undefined && now - entry.settledAt > refreshReuseWindowMs) {
      refreshes.delete(token);
    }
  }
}

async function requestRefresh(refreshToken: string): Promise<AuthResponse | null> {
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

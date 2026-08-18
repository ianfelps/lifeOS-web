import type { ApiErrorResponse } from "./contracts";

type QueryValue = string | number | boolean | null | undefined;

export interface ApiRequestOptions {
  method?: "DELETE" | "GET" | "POST" | "PUT";
  body?: object;
  query?: object;
  signal?: AbortSignal;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiRequest<T>(
  path: string,
  { method = "GET", body, query, signal }: ApiRequestOptions = {},
): Promise<T> {
  const response = await fetch(createUrl(path, query), {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    credentials: "same-origin",
    signal,
  });

  if (!response.ok) {
    throw new ApiError(response.status, await getErrorMessage(response));
  }
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function createUrl(path: string, query?: object): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (isQueryValue(value) && value !== null && value !== undefined) {
      searchParams.set(key, String(value));
    }
  }
  const suffix = searchParams.size === 0 ? "" : `?${searchParams.toString()}`;
  return `/api/${path.replace(/^\//, "")}${suffix}`;
}

function isQueryValue(value: unknown): value is QueryValue {
  return value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean";
}

async function getErrorMessage(response: Response): Promise<string> {
  const payload: unknown = await response.json().catch(() => null);
  if (isApiErrorResponse(payload)) {
    return payload.message;
  }
  return "The request could not be completed.";
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof value.message === "string";
}

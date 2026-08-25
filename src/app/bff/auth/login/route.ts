import { NextRequest, NextResponse } from "next/server";
import type { AuthResponse, LoginRequest } from "@/lib/api/contracts";
import { getApiUrl } from "@/lib/server/backend";
import { setSessionCookies, toPublicAuthResponse } from "@/lib/server/session";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const payload: unknown = await request.json().catch(() => null);
  if (!isLoginRequest(payload)) {
    return NextResponse.json({ message: "Username and password are required." }, { status: 400 });
  }

  const backendResponse = await fetch(`${getApiUrl()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (!backendResponse.ok) {
    return copyResponse(backendResponse);
  }

  const session = await backendResponse.json() as AuthResponse;
  const response = NextResponse.json(toPublicAuthResponse(session));
  setSessionCookies(response, session);
  return response;
}

function isLoginRequest(value: unknown): value is LoginRequest {
  return typeof value === "object" &&
    value !== null &&
    "userName" in value &&
    typeof value.userName === "string" &&
    "password" in value &&
    typeof value.password === "string";
}

async function copyResponse(response: Response): Promise<NextResponse> {
  const body = await response.text();
  return new NextResponse(body, {
    status: response.status,
    headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" },
  });
}

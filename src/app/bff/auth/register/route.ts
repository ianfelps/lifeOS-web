import { NextRequest, NextResponse } from "next/server";
import type { AuthResponse, RegisterRequest } from "@/lib/api/contracts";
import { getApiUrl } from "@/lib/server/backend";
import { setSessionCookies, toPublicAuthResponse } from "@/lib/server/session";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const payload: unknown = await request.json().catch(() => null);
  if (!isRegisterRequest(payload)) {
    return NextResponse.json(
      { message: "User name, display name, and password are required." },
      { status: 400 },
    );
  }

  const registerResponse = await fetch(`${getApiUrl()}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (!registerResponse.ok) {
    return copyResponse(registerResponse);
  }

  // The API registration does not issue tokens, so sign in right away to start the session.
  const loginResponse = await fetch(`${getApiUrl()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userName: payload.userName, password: payload.password }),
    cache: "no-store",
  });
  if (!loginResponse.ok) {
    return NextResponse.json({ registered: true }, { status: 201 });
  }

  const session = await loginResponse.json() as AuthResponse;
  const response = NextResponse.json(toPublicAuthResponse(session), { status: 201 });
  setSessionCookies(response, session);
  return response;
}

function isRegisterRequest(value: unknown): value is RegisterRequest {
  return typeof value === "object" &&
    value !== null &&
    "userName" in value &&
    typeof value.userName === "string" &&
    "displayName" in value &&
    typeof value.displayName === "string" &&
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

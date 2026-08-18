import { NextResponse } from "next/server";
import type { AuthResponse, PublicAuthResponse } from "@/lib/api/contracts";

const accessTokenCookie = "lifeos_access_token";
const refreshTokenCookie = "lifeos_refresh_token";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export function toPublicAuthResponse(response: AuthResponse): PublicAuthResponse {
  return {
    expiresAt: response.expiresAt,
    user: response.user,
  };
}

export function setSessionCookies(response: NextResponse, session: AuthResponse): void {
  response.cookies.set(accessTokenCookie, session.accessToken, {
    ...cookieOptions,
    expires: new Date(session.expiresAt),
  });
  response.cookies.set(refreshTokenCookie, session.refreshToken, {
    ...cookieOptions,
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearSessionCookies(response: NextResponse): void {
  response.cookies.set(accessTokenCookie, "", { ...cookieOptions, maxAge: 0 });
  response.cookies.set(refreshTokenCookie, "", { ...cookieOptions, maxAge: 0 });
}

export { accessTokenCookie, refreshTokenCookie };

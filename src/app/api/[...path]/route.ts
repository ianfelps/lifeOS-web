import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { forwardRequest, refreshSession } from "@/lib/server/backend";
import {
  accessTokenCookie,
  clearSessionCookies,
  refreshTokenCookie,
  setSessionCookies,
} from "@/lib/server/session";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return proxyRequest(request, context);
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return proxyRequest(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return proxyRequest(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return proxyRequest(request, context);
}

async function proxyRequest(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { path } = await context.params;
  const cookieStore = await cookies();
  let accessToken = cookieStore.get(accessTokenCookie)?.value;
  const refreshToken = cookieStore.get(refreshTokenCookie)?.value;
  if (!accessToken || !refreshToken) {
    return unauthorizedResponse();
  }

  const requestBody = request.method === "GET" || request.method === "HEAD"
    ? undefined
    : await request.arrayBuffer();
  let backendResponse = await forwardRequest(path.join("/"), request, accessToken, requestBody);
  let refreshed = false;
  let refreshedSession: Awaited<ReturnType<typeof refreshSession>> = null;
  if (backendResponse.status === 401) {
    refreshedSession = await refreshSession(refreshToken);
    if (!refreshedSession) {
      return unauthorizedResponse();
    }
    accessToken = refreshedSession.accessToken;
    backendResponse = await forwardRequest(path.join("/"), request, accessToken, requestBody);
    refreshed = true;
  }

  const response = await copyResponse(backendResponse);
  if (refreshed && refreshedSession) {
    setSessionCookies(response, refreshedSession);
  }
  if (backendResponse.status === 401) {
    clearSessionCookies(response);
  }
  return response;
}

async function copyResponse(response: Response): Promise<NextResponse> {
  const headers = new Headers();
  const contentType = response.headers.get("content-type");
  if (contentType) {
    headers.set("Content-Type", contentType);
  }
  if (response.status === 204 || response.status === 205 || response.status === 304) {
    return new NextResponse(null, { status: response.status, headers });
  }

  const body = await response.arrayBuffer();
  return new NextResponse(body, { status: response.status, headers });
}

function unauthorizedResponse(): NextResponse {
  const response = NextResponse.json({ message: "Authentication is required." }, { status: 401 });
  clearSessionCookies(response);
  return response;
}

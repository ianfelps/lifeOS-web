import { NextResponse } from "next/server";
import { clearSessionCookies } from "@/lib/server/session";

export async function POST(): Promise<NextResponse> {
  const response = new NextResponse(null, { status: 204 });
  clearSessionCookies(response);
  return response;
}

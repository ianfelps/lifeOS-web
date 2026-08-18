import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { accessTokenCookie, refreshTokenCookie } from "@/lib/server/session";

export default async function AuthenticatedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  if (!cookieStore.get(accessTokenCookie)?.value || !cookieStore.get(refreshTokenCookie)?.value) {
    redirect("/login");
  }
  return <main>{children}</main>;
}

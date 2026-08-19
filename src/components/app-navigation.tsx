"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { authApi } from "@/lib/api/auth";

const navigationItems = [
  { href: "/dashboard", label: "Painel" },
  { href: "/habits", label: "Hábitos" },
];

const futureItems = ["Finanças", "Treinos", "Metas", "Perfil"];

export function AppNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function logout() {
    setIsLoggingOut(true);
    try {
      await authApi.logout();
      router.replace("/login");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <header className="app-nav">
      <div className="app-nav-content">
        <Link className="app-nav-brand" href="/dashboard" aria-label="LifeOS, painel">
          <span className="app-nav-brand-mark" aria-hidden="true">L</span>
          <span>LifeOS</span>
        </Link>
        <nav className="app-nav-links" aria-label="Navegação principal">
          {navigationItems.map((item) => (
            <Link
              className={pathname === item.href ? "app-nav-link active" : "app-nav-link"}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
          {futureItems.map((item) => (
            <span className="app-nav-link unavailable" key={item} title="Em breve">
              {item}
            </span>
          ))}
        </nav>
        <button className="app-nav-logout" disabled={isLoggingOut} onClick={logout} type="button">
          {isLoggingOut ? "Saindo..." : "Sair"}
        </button>
      </div>
    </header>
  );
}

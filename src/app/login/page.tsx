"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { localizeApiMessage } from "@/lib/api/client";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const userName = String(formData.get("userName") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!userName || !password) {
      setError("Informe seu nome de usuário e senha.");
      return;
    }

    try {
      const response = await fetch("/bff/auth/login", {
        body: JSON.stringify({ userName, password }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        setError(getErrorMessage(payload));
        return;
      }

      startTransition(() => router.push("/dashboard"));
    } catch {
      setError("Não foi possível conectar ao LifeOS. Tente novamente.");
    }
  }

  return (
    <main className="login-page">
      <Link className="login-brand" href="/" aria-label="LifeOS, início">
        <span className="login-brand-mark" aria-hidden="true">L</span>
        <span>LifeOS</span>
      </Link>

      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-panel-header">
          <span>ACESSO SEGURO</span>
          <span aria-hidden="true">01</span>
        </div>
        <div className="login-panel-content">
          <p className="login-eyebrow">Bem-vindo de volta</p>
          <h1 id="login-title">Continue sua jornada.</h1>
          <p className="login-description">
            Entre para acompanhar o que importa e avançar no seu ritmo.
          </p>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="form-field">
              <label htmlFor="userName">Nome de usuário</label>
              <input autoComplete="username" id="userName" name="userName" required type="text" />
            </div>
            <div className="form-field">
              <label htmlFor="password">Senha</label>
              <input
                autoComplete="current-password"
                id="password"
                name="password"
                required
                type="password"
              />
            </div>
            {error ? <p className="login-error" role="alert">{error}</p> : null}
            <button className="login-submit" disabled={isPending} type="submit">
              <span className="login-submit-key" aria-hidden="true">A</span>
              {isPending ? "Entrando..." : "Entrar no LifeOS"}
            </button>
          </form>
        </div>
      </section>

      <aside className="login-aside" aria-hidden="true">
        <div className="login-status-card">
          <span>SISTEMA PESSOAL</span>
          <strong>ONLINE</strong>
          <i />
        </div>
        <p>Organize o hoje.<br />Evolua no seu ritmo.</p>
      </aside>
    </main>
  );
}

function getErrorMessage(payload: unknown): string {
  if (typeof payload === "object" && payload !== null && "message" in payload) {
    const { message } = payload;
    if (typeof message === "string" && message.trim()) {
      return localizeApiMessage(message);
    }
  }

  return "Não foi possível entrar. Verifique suas credenciais.";
}

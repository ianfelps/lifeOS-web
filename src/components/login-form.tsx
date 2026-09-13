"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { localizeApiMessage } from "@/lib/api/client";

export function LoginForm() {
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
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      <div className="form-field">
        <label htmlFor="userName">Nome de usuário</label>
        <input autoComplete="username" id="userName" name="userName" required type="text" />
      </div>
      <div className="form-field">
        <label htmlFor="password">Senha</label>
        <input autoComplete="current-password" id="password" name="password" required type="password" />
      </div>
      {error ? <p className="login-error" role="alert">{error}</p> : null}
      <button className="login-submit" disabled={isPending} type="submit">
        <span className="login-submit-key" aria-hidden="true">A</span>
        {isPending ? "Entrando..." : "Entrar no LifeOS"}
      </button>
    </form>
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

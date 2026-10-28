"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { localizeApiMessage } from "@/lib/api/client";

const minimumPasswordLength = 12;

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isBusy = isSubmitting || isPending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const displayName = String(formData.get("displayName") ?? "").trim();
    const userName = String(formData.get("userName") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const passwordConfirmation = String(formData.get("passwordConfirmation") ?? "");

    if (!displayName || !userName || !password) {
      setError("Informe nome de exibição, nome de usuário e senha.");
      return;
    }
    if (password.length < minimumPasswordLength) {
      setError(`A senha precisa ter pelo menos ${minimumPasswordLength} caracteres.`);
      return;
    }
    if (password !== passwordConfirmation) {
      setError("As senhas não conferem.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/bff/auth/register", {
        body: JSON.stringify({ userName, displayName, password }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        setError(getErrorMessage(payload));
        return;
      }

      const destination = hasUser(payload) ? "/dashboard" : "/login";
      startTransition(() => router.push(destination));
    } catch {
      setError("Não foi possível conectar ao LifeOS. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      <div className="form-field">
        <label htmlFor="displayName">Nome de exibição</label>
        <input autoComplete="name" id="displayName" name="displayName" required type="text" />
      </div>
      <div className="form-field">
        <label htmlFor="userName">Nome de usuário</label>
        <input autoComplete="username" id="userName" name="userName" required type="text" />
      </div>
      <div className="form-field">
        <label htmlFor="password">Senha</label>
        <input
          aria-describedby="password-hint"
          autoComplete="new-password"
          id="password"
          minLength={minimumPasswordLength}
          name="password"
          required
          type="password"
        />
        <span className="form-hint" id="password-hint">
          Mínimo de {minimumPasswordLength} caracteres.
        </span>
      </div>
      <div className="form-field">
        <label htmlFor="passwordConfirmation">Confirme a senha</label>
        <input
          autoComplete="new-password"
          id="passwordConfirmation"
          name="passwordConfirmation"
          required
          type="password"
        />
      </div>
      {error ? <p className="login-error" role="alert">{error}</p> : null}
      <button className="login-submit" disabled={isBusy} type="submit">
        <span className="login-submit-key" aria-hidden="true">A</span>
        {isBusy ? "Criando conta..." : "Criar minha conta"}
      </button>
    </form>
  );
}

function hasUser(payload: unknown): boolean {
  return typeof payload === "object" && payload !== null && "user" in payload;
}

function getErrorMessage(payload: unknown): string {
  if (typeof payload === "object" && payload !== null && "message" in payload) {
    const { message } = payload;
    if (typeof message === "string" && message.trim()) {
      return localizeApiMessage(message);
    }
  }

  return "Não foi possível criar sua conta. Tente novamente.";
}

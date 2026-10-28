import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/register-form";

export const metadata: Metadata = {
  title: "Registre-se · LifeOS",
};

export default function RegisterPage() {
  return (
    <main className="login-page">
      <Link className="login-brand" href="/" aria-label="LifeOS, início">
        <span className="login-brand-mark" aria-hidden="true">L</span>
        <span>LifeOS</span>
      </Link>

      <section className="login-panel" aria-labelledby="register-title">
        <div className="login-panel-header">
          <span>NOVO JOGADOR</span>
          <span aria-hidden="true">00</span>
        </div>
        <div className="login-panel-content">
          <p className="login-eyebrow">Primeiro acesso</p>
          <h1 id="register-title">Comece sua jornada.</h1>
          <p className="login-description">
            Crie a conta que vai guardar suas finanças, hábitos, treinos e metas.
          </p>

          <RegisterForm />

          <p className="login-switch">
            Já tem uma conta? <Link href="/login">Entrar</Link>
          </p>
        </div>
      </section>

      <aside className="login-aside" aria-hidden="true">
        <div className="login-status-card">
          <span>SISTEMA PESSOAL</span>
          <strong>PRONTO</strong>
          <i />
        </div>
        <p>Registre.<br />Acompanhe.<br />Evolua.</p>
      </aside>
    </main>
  );
}

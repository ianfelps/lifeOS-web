import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { accessTokenCookie, refreshTokenCookie } from "@/lib/server/session";

export default async function LoginPage() {
  const cookieStore = await cookies();
  if (cookieStore.get(accessTokenCookie)?.value && cookieStore.get(refreshTokenCookie)?.value) {
    redirect("/dashboard");
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

          <LoginForm />
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

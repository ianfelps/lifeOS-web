import Link from "next/link";
import { Dollar } from "pixelarticons/react/Dollar";
import { Pencil } from "pixelarticons/react/Pencil";
import { Target } from "pixelarticons/react/Target";
import { ChartLine } from "pixelarticons/react/ChartLine";
import { TrendingUp } from "pixelarticons/react/TrendingUp";
import { Waves } from "pixelarticons/react/Waves";
import { Zap } from "pixelarticons/react/Zap";

export default function HomePage() {
  return (
    <main className="landing-page">
      <nav className="landing-nav" aria-label="Navegação principal">
        <Link className="brand" href="#inicio" aria-label="LifeOS, início">
          <span className="brand-mark" aria-hidden="true">
            L
          </span>
          <span>LifeOS</span>
        </Link>
        <Link className="nav-login" href="/login">
          Entrar <span aria-hidden="true">A</span>
        </Link>
      </nav>

      <section className="hero" id="inicio">
        <div className="hero-copy">
          <p className="eyebrow">Seu sistema pessoal de evolução</p>
          <h1>
            Organize o hoje.
            <span>Evolua no seu ritmo.</span>
          </h1>
          <p className="hero-description">
            Organize suas finanças, hábitos, treinos e metas em um só lugar. Menos atrito para agir,
            mais clareza para evoluir.
          </p>
          <div className="hero-actions">
            <Link className="primary-action" href="/login">
              <span className="action-key" aria-hidden="true">
                A
              </span>
              Acessar LifeOS
            </Link>
            <a className="secondary-action" href="#recursos">
              Ver como funciona <span aria-hidden="true">↓</span>
            </a>
          </div>
          <p className="hero-note">
            <span className="status-dot" aria-hidden="true" /> Feito para o seu ritmo. Sem excesso de
            notificações.
          </p>
        </div>

        <div className="hero-cards" aria-label="Resumo das áreas do LifeOS">
          <article className="floating-card floating-finance">
            <div className="floating-card-header">
              <span>FINANÇAS</span>
              <Dollar aria-hidden="true" />
            </div>
            <strong>R$ 2.840,00</strong>
            <span className="floating-caption positive">+12% neste mês</span>
            <div className="floating-bars" aria-hidden="true"><i /><i /><i /><i /></div>
          </article>
          <article className="floating-card floating-habits">
            <div className="floating-card-header">
              <span>HÁBITOS</span>
              <Waves aria-hidden="true" />
            </div>
            <strong>5 / 7</strong>
            <span className="floating-caption">dias concluídos</span>
            <div className="floating-progress"><span /></div>
          </article>
          <article className="floating-card floating-workouts">
            <div className="floating-card-header">
              <span>TREINOS</span>
              <Zap aria-hidden="true" />
            </div>
            <strong>3 sessões</strong>
            <span className="floating-caption">esta semana</span>
            <div className="floating-stats"><i /><i /><i /></div>
          </article>
          <article className="floating-card floating-goals">
            <div className="floating-card-header">
              <span>META ATUAL</span>
              <Target aria-hidden="true" />
            </div>
            <strong>72%</strong>
            <span className="floating-caption">Reserva de emergência</span>
            <div className="floating-progress"><span /></div>
          </article>
        </div>
      </section>

      <section className="feature-section" id="recursos" aria-labelledby="features-title">
        <div className="section-intro">
          <p className="eyebrow">Uma rotina sem excesso</p>
          <h2 id="features-title">Do registro à evolução, sem complicar.</h2>
          <p>
            O LifeOS deixa suas ações diárias simples e transforma o que você registra em clareza para
            o próximo passo.
          </p>
        </div>
        <div className="journey-panel">
          <div className="journey-header">
            <span>SEU CICLO DIÁRIO</span>
            <span>03 ETAPAS</span>
          </div>
          <div className="flow-grid">
            <article className="flow-step">
              <span className="step-number">01</span>
              <div className="flow-icon register-icon" aria-hidden="true"><Pencil /></div>
              <h3>Registre</h3>
              <p>Inclua uma despesa, conclua um hábito ou anote uma série sem interromper seu dia.</p>
            </article>
            <article className="flow-step">
              <span className="step-number">02</span>
              <div className="flow-icon track-icon" aria-hidden="true"><ChartLine /></div>
              <h3>Acompanhe</h3>
              <p>Encontre o que merece atenção em uma visão diária, objetiva e sempre atualizada.</p>
            </article>
            <article className="flow-step">
              <span className="step-number">03</span>
              <div className="flow-icon evolve-icon" aria-hidden="true"><TrendingUp /></div>
              <h3>Evolua</h3>
              <p>Visualize seu progresso, celebre consistência e avance com metas que fazem sentido.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="closing-section">
        <div className="closing-panel">
          <p className="eyebrow">Pronto para jogar a seu favor?</p>
          <h2>Comece sua próxima fase.</h2>
          <p>Uma rotina mais consciente não precisa ser complicada.</p>
          <Link className="primary-action" href="/login">
            <span className="action-key" aria-hidden="true">A</span>
            Entrar no LifeOS
          </Link>
        </div>
      </section>

      <footer className="landing-footer">
        <Link className="brand" href="#inicio">
          <span className="brand-mark" aria-hidden="true">L</span>
          <span>LifeOS</span>
        </Link>
        <span>Seu sistema pessoal de evolução.</span>
      </footer>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Check } from "pixelarticons/react/Check";
import { Dollar } from "pixelarticons/react/Dollar";
import { Target } from "pixelarticons/react/Target";
import { Waves } from "pixelarticons/react/Waves";
import { Zap } from "pixelarticons/react/Zap";
import { authApi } from "@/lib/api/auth";
import type { Dashboard, HabitProgress, User } from "@/lib/api/contracts";
import { dashboardApi } from "@/lib/api/dashboard";
import { habitsApi } from "@/lib/api/habits";

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completingHabitId, setCompletingHabitId] = useState<string | null>(null);

  async function loadDashboard(signal?: AbortSignal) {
    try {
      const [nextDashboard, nextUser] = await Promise.all([
        dashboardApi.get(signal),
        authApi.me(signal),
      ]);
      setError(null);
      setDashboard(nextDashboard);
      setUser(nextUser);
    } catch (loadError) {
      if (signal?.aborted) {
        return;
      }
      setError(getErrorMessage(loadError));
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([dashboardApi.get(controller.signal), authApi.me(controller.signal)])
      .then(([nextDashboard, nextUser]) => {
        if (controller.signal.aborted) {
          return;
        }
        setError(null);
        setDashboard(nextDashboard);
        setUser(nextUser);
      })
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) {
          setError(getErrorMessage(loadError));
        }
      });
    return () => controller.abort();
  }, []);

  async function completeHabit(habit: HabitProgress) {
    setCompletingHabitId(habit.habitId);
    setError(null);

    try {
      await habitsApi.createCompletion(habit.habitId, getSaoPauloDate());
      await loadDashboard();
    } catch (completionError) {
      setError(getErrorMessage(completionError));
    } finally {
      setCompletingHabitId(null);
    }
  }

  if (!dashboard || !user) {
    return <DashboardLoading error={error} onRetry={() => void loadDashboard()} />;
  }

  const xpProgress = getXpProgress(dashboard);
  const unlockedBadges = dashboard.gamification.badges.filter((badge) => badge.unlockedAt).length;

  return (
    <div className="dashboard-page">
      <main className="dashboard-main">
        <section className="dashboard-greeting" aria-labelledby="dashboard-title">
          <p>{formatCurrentDate()}</p>
          <h1 id="dashboard-title">Olá, {user.displayName}.</h1>
          <span>Seu resumo de hoje está pronto.</span>
        </section>

        {error ? (
          <div className="dashboard-error" role="alert">
            <span>{error}</span>
            <button onClick={() => void loadDashboard()} type="button">Tentar novamente</button>
          </div>
        ) : null}

        <section className="dashboard-overview" aria-label="Visão geral">
          <article className="level-panel">
            <div className="dashboard-card-header">
              <span>JORNADA ATUAL</span>
              <Target aria-hidden="true" />
            </div>
            <div className="level-panel-body">
              <div>
                <strong>Nível {dashboard.gamification.level}</strong>
                <span>{dashboard.gamification.totalXp.toLocaleString("pt-BR")} XP total</span>
              </div>
              <span className="badge-count">{unlockedBadges} badges</span>
            </div>
            <div className="xp-meter" aria-label={`${xpProgress}% até o próximo nível`}>
              <span style={{ width: `${xpProgress}%` }} />
            </div>
          </article>

          <article className="balance-panel">
            <div className="dashboard-card-header">
              <span>SALDO DO MÊS</span>
              <Dollar aria-hidden="true" />
            </div>
            <strong>{formatCurrency(dashboard.finance.confirmedBalance)}</strong>
            <span>{formatMonth(dashboard.finance.month)}</span>
          </article>
        </section>

        <section className="dashboard-grid">
          <article className="dashboard-panel habits-panel">
            <div className="dashboard-card-header">
              <span>HÁBITOS DE HOJE</span>
              <Waves aria-hidden="true" />
            </div>
            {dashboard.pendingHabits.length === 0 ? (
              <div className="empty-panel">
                <Check aria-hidden="true" />
                <p>Todos os hábitos de hoje foram concluídos.</p>
              </div>
            ) : (
              <ul className="habit-list">
                {dashboard.pendingHabits.map((habit) => (
                  <li key={habit.habitId}>
                    <div>
                      <strong>{habit.title}</strong>
                      <span>
                        {habit.completionCount} de {habit.targetCount} concluído
                        {habit.targetCount > 1 ? "s" : ""}
                      </span>
                    </div>
                    <button
                      aria-label={`Concluir ${habit.title}`}
                      disabled={completingHabitId === habit.habitId}
                      onClick={() => void completeHabit(habit)}
                      type="button"
                    >
                      <Check aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="dashboard-panel finance-panel">
            <div className="dashboard-card-header">
              <span>FINANÇAS</span>
              <Dollar aria-hidden="true" />
            </div>
            <dl className="finance-summary">
              <div>
                <dt>Receitas</dt>
                <dd className="income">{formatCurrency(dashboard.finance.confirmedIncome)}</dd>
              </div>
              <div>
                <dt>Despesas</dt>
                <dd className="expense">{formatCurrency(dashboard.finance.confirmedExpense)}</dd>
              </div>
              <div>
                <dt>Projetado</dt>
                <dd>{formatCurrency(dashboard.finance.projectedBalance)}</dd>
              </div>
            </dl>
          </article>

          <article className="dashboard-panel workouts-panel">
            <div className="dashboard-card-header">
              <span>TREINOS RECENTES</span>
              <Zap aria-hidden="true" />
            </div>
            {dashboard.recentWorkouts.length === 0 ? (
              <div className="empty-panel compact">
                <p>Nenhum treino registrado ainda.</p>
              </div>
            ) : (
              <ul className="workout-list">
                {dashboard.recentWorkouts.map((workout) => (
                  <li key={workout.id}>
                    <strong>{workout.exercises[0]?.exerciseName ?? "Treino livre"}</strong>
                    <span>{formatWorkoutDate(workout.completedAt ?? workout.startedAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>
      </main>
    </div>
  );
}

function DashboardLoading({ error, onRetry }: Readonly<{ error: string | null; onRetry: () => void }>) {
  return (
    <main className="dashboard-page dashboard-loading" aria-live="polite">
      <div className="loading-panel">
        {error ? (
          <>
            <span>FALHA AO CARREGAR</span>
            <p>{error}</p>
            <button onClick={onRetry} type="button">Tentar novamente</button>
          </>
        ) : (
          <>
            <span>CARREGANDO PAINEL</span>
            <i />
          </>
        )}
      </div>
    </main>
  );
}

function getSaoPauloDate(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).formatToParts();
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";

  return `${part("year")}-${part("month")}-${part("day")}`;
}

function getXpProgress(dashboard: Dashboard): number {
  const { currentLevelXp, nextLevelXp, totalXp } = dashboard.gamification;
  if (nextLevelXp === null || nextLevelXp <= currentLevelXp) {
    return 100;
  }

  return Math.min(100, Math.max(0, ((totalXp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100));
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" }).format(value);
}

function formatMonth(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function formatCurrentDate(): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    timeZone: "America/Sao_Paulo",
    weekday: "long",
  }).format(new Date());
}

function formatWorkoutDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Não foi possível atualizar o painel.";
}

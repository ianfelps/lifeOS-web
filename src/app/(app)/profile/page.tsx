"use client";

import { useEffect, useState } from "react";
import { Chart } from "pixelarticons/react/Chart";
import { Lock } from "pixelarticons/react/Lock";
import { Target } from "pixelarticons/react/Target";
import { User } from "pixelarticons/react/User";
import { Zap } from "pixelarticons/react/Zap";
import {
  ConfirmationModal,
  type Confirmation,
} from "@/components/confirmation-modal";
import { authApi } from "@/lib/api/auth";
import type {
  Badge,
  BadgeCriterion,
  BadgeCriterionType,
  Exercise,
  FinancialCategory,
  GamificationProfile,
  Habit,
  LevelProgressionRule,
  User as AppUser,
  UserPreference,
  XpLedgerEntry,
  XpRule,
} from "@/lib/api/contracts";
import { financesApi } from "@/lib/api/finances";
import { gamificationApi } from "@/lib/api/gamification";
import { habitsApi } from "@/lib/api/habits";
import { usersApi } from "@/lib/api/users";
import { workoutsApi } from "@/lib/api/workouts";

type BadgeCriterionEditor = {
  targetValue: string;
  type: BadgeCriterionType;
  resourceId: string;
};

type BadgeEditor = {
  criteria: BadgeCriterionEditor[];
  description: string;
  name: string;
};

type BadgeResources = {
  categories: FinancialCategory[];
  exercises: Exercise[];
  goals: Array<{ id: string; title: string }>;
  habits: Habit[];
};

const ledgerPageSize = 10;

const criterionTypes: Array<{ label: string; value: BadgeCriterionType }> = [
  { label: "XP acumulado", value: "Xp" },
  { label: "Nível", value: "Level" },
  { label: "Conclusões de hábito", value: "HabitCompletionCount" },
  { label: "Metas semanais de hábito", value: "WeeklyHabitGoalCount" },
  { label: "Treinos concluídos", value: "WorkoutCompletionCount" },
  { label: "Transações confirmadas", value: "TransactionConfirmationCount" },
  { label: "Metas concluídas", value: "GoalCompletionCount" },
  { label: "Meses positivos", value: "PositiveMonthCount" },
];

const eventLabels: Record<XpLedgerEntry["type"], string> = {
  Adjustment: "Ajuste",
  Grant: "Concessão",
  Reversal: "Reversão",
};

const xpEventLabels: Record<XpRule["eventType"], string> = {
  GoalCompleted: "Meta concluída",
  HabitCompletion: "Conclusão de hábito",
  PositiveMonth: "Mês positivo",
  TransactionConfirmed: "Transação confirmada",
  WeeklyHabitGoal: "Meta semanal de hábito",
  WorkoutCompleted: "Treino concluído",
};

const initialBadgeEditor: BadgeEditor = {
  criteria: [{ resourceId: "", targetValue: "1", type: "Xp" }],
  description: "",
  name: "",
};

export default function ProfilePage() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [preference, setPreference] = useState<UserPreference | null>(null);
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [xpRules, setXpRules] = useState<XpRule[]>([]);
  const [progression, setProgression] = useState<LevelProgressionRule | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [ledger, setLedger] = useState<XpLedgerEntry[]>([]);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerEvent, setLedgerEvent] = useState<XpRule["eventType"] | "All">("All");
  const [ledgerFrom, setLedgerFrom] = useState("");
  const [ledgerTo, setLedgerTo] = useState("");
  const [includeArchivedBadges, setIncludeArchivedBadges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBadgeResourcesLoading, setIsBadgeResourcesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [identityEditor, setIdentityEditor] = useState<AppUser | null>(null);
  const [password, setPassword] = useState({ confirm: "", current: "", next: "" });
  const [badgeEditor, setBadgeEditor] = useState<BadgeEditor | null>(null);
  const [editingBadge, setEditingBadge] = useState<Badge | null>(null);
  const [badgeResources, setBadgeResources] = useState<BadgeResources | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const ledgerPageCount = Math.max(1, Math.ceil(ledgerTotal / ledgerPageSize));

  async function loadProfile(signal?: AbortSignal) {
    try {
      const [nextUser, nextPreference, nextProfile, nextXpRules, nextProgression, nextBadges, nextLedger] =
        await Promise.all([
          authApi.me(signal),
          usersApi.getPreferences(signal),
          gamificationApi.getProfile(signal),
          gamificationApi.getXpRules(signal),
          gamificationApi.getLevelProgression(signal),
          gamificationApi.getBadges(includeArchivedBadges, signal),
          gamificationApi.getLedger(
            {
              eventType: ledgerEvent === "All" ? undefined : ledgerEvent,
              from: ledgerFrom || undefined,
              page: ledgerPage,
              pageSize: ledgerPageSize,
              to: ledgerTo || undefined,
            },
            signal,
          ),
        ]);
      if (signal?.aborted) return;
      setUser(nextUser);
      setPreference(nextPreference);
      setProfile(nextProfile);
      setXpRules(nextXpRules);
      setProgression(nextProgression);
      setBadges(nextBadges);
      setLedger(nextLedger.items);
      setLedgerTotal(nextLedger.totalCount);
      setError(null);
    } catch (loadError) {
      if (!signal?.aborted) setError(getErrorMessage(loadError));
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      authApi.me(controller.signal),
      usersApi.getPreferences(controller.signal),
      gamificationApi.getProfile(controller.signal),
      gamificationApi.getXpRules(controller.signal),
      gamificationApi.getLevelProgression(controller.signal),
      gamificationApi.getBadges(includeArchivedBadges, controller.signal),
      gamificationApi.getLedger(
        {
          eventType: ledgerEvent === "All" ? undefined : ledgerEvent,
          from: ledgerFrom || undefined,
          page: ledgerPage,
          pageSize: ledgerPageSize,
          to: ledgerTo || undefined,
        },
        controller.signal,
      ),
    ])
      .then(([nextUser, nextPreference, nextProfile, nextXpRules, nextProgression, nextBadges, nextLedger]) => {
        if (controller.signal.aborted) return;
        setUser(nextUser);
        setPreference(nextPreference);
        setProfile(nextProfile);
        setXpRules(nextXpRules);
        setProgression(nextProgression);
        setBadges(nextBadges);
        setLedger(nextLedger.items);
        setLedgerTotal(nextLedger.totalCount);
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) setError(getErrorMessage(loadError));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [includeArchivedBadges, ledgerEvent, ledgerFrom, ledgerPage, ledgerTo]);

  async function updatePreference(preferredWeightUnit: UserPreference["preferredWeightUnit"]) {
    setProcessing("preference");
    setError(null);
    setNotice(null);
    try {
      const nextPreference = await usersApi.updatePreferences({ preferredWeightUnit });
      setPreference(nextPreference);
      setNotice("A unidade padrão de carga foi atualizada.");
    } catch (updateError) {
      setError(getErrorMessage(updateError));
    } finally {
      setProcessing(null);
    }
  }

  async function saveIdentity() {
    if (!identityEditor) return;
    if (!identityEditor.userName.trim() || !identityEditor.displayName.trim()) {
      setError("Informe o nome de usuário e o nome de exibição.");
      return;
    }

    setProcessing("identity");
    setError(null);
    setNotice(null);
    try {
      const nextUser = await usersApi.updateIdentity({
        displayName: identityEditor.displayName,
        userName: identityEditor.userName,
      });
      setUser(nextUser);
      setIdentityEditor(null);
      setNotice("Sua identidade foi atualizada.");
    } catch (updateError) {
      setError(getErrorMessage(updateError));
    } finally {
      setProcessing(null);
    }
  }

  async function savePassword() {
    if (!password.current || !password.next) {
      setError("Informe a senha atual e a nova senha.");
      return;
    }
    if (password.next !== password.confirm) {
      setError("A confirmação da nova senha não corresponde.");
      return;
    }

    setProcessing("password");
    setError(null);
    setNotice(null);
    try {
      await usersApi.changePassword({ currentPassword: password.current, newPassword: password.next });
      setPassword({ confirm: "", current: "", next: "" });
      setNotice("Senha atualizada. As outras sessões ativas foram encerradas.");
    } catch (changeError) {
      setError(getErrorMessage(changeError));
    } finally {
      setProcessing(null);
    }
  }

  async function revokeOtherSessions() {
    setProcessing("sessions");
    setError(null);
    setNotice(null);
    try {
      const response = await usersApi.revokeOtherSessions();
      setNotice(
        response.revokedSessionCount === 1
          ? "1 outra sessão foi encerrada."
          : `${response.revokedSessionCount} outras sessões foram encerradas.`,
      );
    } catch (revokeError) {
      setError(getErrorMessage(revokeError));
    } finally {
      setProcessing(null);
    }
  }

  async function saveXpRules() {
    if (!xpRules.every((rule) => isNonNegativeInteger(rule.amount))) {
      setError("Cada regra de XP precisa ter um valor inteiro maior ou igual a zero.");
      return;
    }
    setProcessing("xp-rules");
    setError(null);
    setNotice(null);
    try {
      const nextRules = await gamificationApi.updateXpRules(xpRules);
      setXpRules(nextRules);
      setNotice("As regras de XP foram atualizadas.");
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setProcessing(null);
    }
  }

  async function saveProgression() {
    if (!progression || !isPositiveInteger(progression.baseXp) || !isNonNegativeInteger(progression.incrementPerLevel)) {
      setError("Informe uma base de XP positiva e um incremento inteiro maior ou igual a zero.");
      return;
    }
    setProcessing("progression");
    setError(null);
    setNotice(null);
    try {
      const nextProgression = await gamificationApi.updateLevelProgression(progression);
      setProgression(nextProgression);
      const nextProfile = await gamificationApi.getProfile();
      setProfile(nextProfile);
      setNotice("A progressão de níveis foi atualizada.");
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setProcessing(null);
    }
  }

  async function openBadgeEditor(badge?: Badge) {
    setEditingBadge(badge ?? null);
    setBadgeEditor(badge ? toBadgeEditor(badge) : initialBadgeEditor);
    if (badgeResources) return;

    setIsBadgeResourcesLoading(true);
    try {
      const [habitResponse, exercises, categories, goalResponse] = await Promise.all([
        habitsApi.getAll({ page: 1, pageSize: 100 }),
        workoutsApi.getExercises(false),
        financesApi.getCategories(false),
        gamificationApi.getGoals({ includeArchived: false, page: 1, pageSize: 100 }),
      ]);
      setBadgeResources({
        categories,
        exercises,
        goals: goalResponse.items.map((goal) => ({ id: goal.id, title: goal.title })),
        habits: habitResponse.items,
      });
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsBadgeResourcesLoading(false);
    }
  }

  async function saveBadge() {
    if (!badgeEditor) return;
    const request = toBadgeRequest(badgeEditor);
    if (!request) {
      setError("Informe nome, descrição e critérios válidos para a conquista.");
      return;
    }

    setProcessing("badge-editor");
    setError(null);
    setNotice(null);
    try {
      if (editingBadge) {
        await gamificationApi.updateBadge(editingBadge.id, request);
      } else {
        await gamificationApi.createBadge(request);
      }
      setBadgeEditor(null);
      setEditingBadge(null);
      const [nextBadges, nextProfile] = await Promise.all([
        gamificationApi.getBadges(includeArchivedBadges),
        gamificationApi.getProfile(),
      ]);
      setBadges(nextBadges);
      setProfile(nextProfile);
      setNotice(editingBadge ? "A conquista foi atualizada." : "A conquista foi criada.");
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setProcessing(null);
    }
  }

  async function archiveBadge(badge: Badge) {
    setProcessing(badge.id);
    setError(null);
    setNotice(null);
    try {
      await gamificationApi.archiveBadge(badge.id);
      const [nextBadges, nextProfile] = await Promise.all([
        gamificationApi.getBadges(includeArchivedBadges),
        gamificationApi.getProfile(),
      ]);
      setBadges(nextBadges);
      setProfile(nextProfile);
      setNotice("A conquista foi arquivada.");
    } catch (archiveError) {
      setError(getErrorMessage(archiveError));
    } finally {
      setProcessing(null);
    }
  }

  function changeLedgerFilters(eventType: XpRule["eventType"] | "All", from: string, to: string) {
    if (from && to && from > to) {
      setError("A data inicial não pode ser posterior à data final.");
      return;
    }
    setLedgerPage(1);
    setLedgerEvent(eventType);
    setLedgerFrom(from);
    setLedgerTo(to);
  }

  if (isLoading || !user || !preference || !profile || !progression) {
    return <ProfileLoading error={error} onRetry={() => void loadProfile()} />;
  }

  const unlockedBadges = profile.badges.filter((badge) => badge.unlockedAt !== null);
  const xpProgress = getXpProgress(profile);

  return (
    <div className="profile-page">
      <main className="profile-main">
        <section className="profile-heading" aria-labelledby="profile-title">
          <div>
            <p>CONTA, EVOLUÇÃO E CONFIGURAÇÕES</p>
            <h1 id="profile-title">Perfil</h1>
            <span>Seu progresso, conquistas e preferências em um só lugar.</span>
          </div>
          <div className="profile-heading-level">
            <Zap aria-hidden="true" />
            <span>Nível {profile.level}</span>
          </div>
        </section>

        {error ? (
          <div className="profile-error" role="alert">
            <span>{error}</span>
            <button onClick={() => void loadProfile()} type="button">Tentar novamente</button>
          </div>
        ) : null}
        {notice ? <div className="profile-notice" role="status">{notice}</div> : null}

        <section className="profile-section" aria-labelledby="identity-title">
          <div className="profile-section-heading">
            <div>
              <User aria-hidden="true" />
              <div><span>CONTA</span><h2 id="identity-title">Identidade</h2></div>
            </div>
          </div>
          <div className="profile-identity">
            {identityEditor ? <><label className="profile-field"><span>Nome</span><input autoFocus maxLength={160} onChange={(event) => setIdentityEditor({ ...identityEditor, displayName: event.target.value })} value={identityEditor.displayName} /></label><label className="profile-field"><span>Usuário</span><input maxLength={120} onChange={(event) => setIdentityEditor({ ...identityEditor, userName: event.target.value })} value={identityEditor.userName} /></label><div className="profile-identity-actions"><button onClick={() => setIdentityEditor(null)} type="button">Cancelar</button><button className="primary" disabled={processing === "identity"} onClick={() => void saveIdentity()} type="button">{processing === "identity" ? "Salvando..." : "Salvar identidade"}</button></div></> : <><div><span>Nome</span><strong>{user.displayName}</strong></div><div><span>Usuário</span><strong>{user.userName}</strong></div><button className="profile-edit-identity" onClick={() => setIdentityEditor({ ...user })} type="button">Editar identidade</button></>}
          </div>
        </section>

        <section className="profile-section" aria-labelledby="evolution-title">
          <div className="profile-section-heading">
            <div>
              <Chart aria-hidden="true" />
              <div><span>JORNADA</span><h2 id="evolution-title">Evolução</h2></div>
            </div>
          </div>
          <div className="profile-evolution-grid">
            <article className="profile-level-card">
              <span>NÍVEL ATUAL</span>
              <strong>{profile.level}</strong>
              <p>{formatNumber(profile.totalXp)} XP no total</p>
              {profile.nextLevelXp === null ? (
                <small>Você alcançou o maior nível configurado.</small>
              ) : (
                <>
                  <div className="profile-xp-meter" aria-label={`${xpProgress}% até o próximo nível`}>
                    <span style={{ width: `${xpProgress}%` }} />
                  </div>
                  <small>{formatNumber(profile.totalXp)} de {formatNumber(profile.nextLevelXp)} XP</small>
                </>
              )}
            </article>
            <article className="profile-badge-summary">
              <Target aria-hidden="true" />
              <strong>{unlockedBadges.length}</strong>
              <span>conquistas desbloqueadas</span>
              <small>{profile.badges.length - unlockedBadges.length} ainda em progresso</small>
            </article>
          </div>

          <div className="profile-subsection-heading"><h3>Conquistas</h3><span>{profile.badges.length} no catálogo ativo</span></div>
          <div className="profile-badge-grid" aria-label="Conquistas">
            {profile.badges.map((badge) => (
              <article className={`profile-badge ${badge.unlockedAt ? "unlocked" : "locked"}`} key={badge.id}>
                <Target aria-hidden="true" />
                <div><h4>{badge.name}</h4><p>{badge.description}</p></div>
                <small>{badge.unlockedAt ? `Desbloqueada em ${formatDateTime(badge.unlockedAt)}` : "Em progresso"}</small>
              </article>
            ))}
          </div>

          <div className="profile-subsection-heading"><h3>Extrato de XP</h3><span>Histórico de ganhos e reversões</span></div>
          <div className="profile-ledger-filters">
            <label><span>Evento</span><select onChange={(event) => changeLedgerFilters(event.target.value as XpRule["eventType"] | "All", ledgerFrom, ledgerTo)} value={ledgerEvent}><option value="All">Todos</option>{Object.entries(xpEventLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label><span>De</span><input onChange={(event) => changeLedgerFilters(ledgerEvent, event.target.value, ledgerTo)} type="date" value={ledgerFrom} /></label>
            <label><span>Até</span><input onChange={(event) => changeLedgerFilters(ledgerEvent, ledgerFrom, event.target.value)} type="date" value={ledgerTo} /></label>
          </div>
          <div className="profile-ledger-list">
            {ledger.length === 0 ? <p>Nenhum evento de XP foi encontrado para os filtros informados.</p> : ledger.map((entry) => (
              <article key={entry.id}>
                <div><strong>{entry.eventType ? xpEventLabels[entry.eventType] : eventLabels[entry.type]}</strong><span>{formatDateTime(entry.createdAt)}</span></div>
                <b className={entry.amount >= 0 ? "positive" : "negative"}>{entry.amount >= 0 ? "+" : ""}{formatNumber(entry.amount)} XP</b>
              </article>
            ))}
          </div>
          <div className="profile-pagination">
            <button disabled={ledgerPage === 1} onClick={() => setLedgerPage(ledgerPage - 1)} type="button">Anterior</button>
            <span>Página {ledgerPage} de {ledgerPageCount}</span>
            <button disabled={ledgerPage === ledgerPageCount} onClick={() => setLedgerPage(ledgerPage + 1)} type="button">Próxima</button>
          </div>
        </section>

        <section className="profile-section" aria-labelledby="gamification-settings-title">
          <div className="profile-section-heading">
            <div><Chart aria-hidden="true" /><div><span>CONFIGURAÇÃO AVANÇADA</span><h2 id="gamification-settings-title">Gamificação</h2></div></div>
          </div>
          <div className="profile-settings-grid">
            <article className="profile-settings-card">
              <h3>Regras de XP</h3><p>Defina os pontos concedidos por cada evento.</p>
              <div className="profile-rule-list">
                {xpRules.map((rule, index) => <label key={rule.eventType}><span>{xpEventLabels[rule.eventType]}</span><input min="0" onChange={(event) => setXpRules(xpRules.map((current, currentIndex) => currentIndex === index ? { ...current, amount: Number(event.target.value) } : current))} type="number" value={rule.amount} /><small>XP</small></label>)}
              </div>
              <button className="profile-primary-button" disabled={processing === "xp-rules"} onClick={() => void saveXpRules()} type="button">{processing === "xp-rules" ? "Salvando..." : "Salvar regras"}</button>
            </article>
            <article className="profile-settings-card">
              <h3>Progressão de níveis</h3><p>Controla o XP necessário para cada avanço.</p>
              <label className="profile-field"><span>XP base</span><input min="1" onChange={(event) => setProgression({ ...progression, baseXp: Number(event.target.value) })} type="number" value={progression.baseXp} /></label>
              <label className="profile-field"><span>Incremento por nível</span><input min="0" onChange={(event) => setProgression({ ...progression, incrementPerLevel: Number(event.target.value) })} type="number" value={progression.incrementPerLevel} /></label>
              <button className="profile-primary-button" disabled={processing === "progression"} onClick={() => void saveProgression()} type="button">{processing === "progression" ? "Salvando..." : "Salvar progressão"}</button>
            </article>
          </div>
          <div className="profile-subsection-heading profile-catalog-heading"><div><h3>Catálogo de conquistas</h3><span>Crie critérios para desbloqueios automáticos.</span></div><button className="profile-primary-button" onClick={() => void openBadgeEditor()} type="button">Nova conquista</button></div>
          <label className="profile-archive-toggle"><input checked={includeArchivedBadges} onChange={(event) => setIncludeArchivedBadges(event.target.checked)} type="checkbox" /><span>Incluir arquivadas</span></label>
          <div className="profile-catalog-list">
            {badges.map((badge) => <article className={badge.archived ? "archived" : ""} key={badge.id}><div><strong>{badge.name}</strong><p>{badge.description}</p><span>{badge.criteria.length} {badge.criteria.length === 1 ? "critério" : "critérios"}{badge.unlockedAt ? ` · desbloqueada em ${formatDateTime(badge.unlockedAt)}` : ""}</span></div><div><button disabled={badge.archived} onClick={() => void openBadgeEditor(badge)} type="button">Editar</button>{!badge.archived ? <button className="danger" disabled={processing === badge.id} onClick={() => setConfirmation({ confirmLabel: "Arquivar", description: `A conquista “${badge.name}” não ficará mais disponível para novos desbloqueios.`, onConfirm: () => archiveBadge(badge), title: "Arquivar conquista" })} type="button">Arquivar</button> : null}</div></article>)}
          </div>
        </section>

        <section className="profile-section" aria-labelledby="preferences-title">
          <div className="profile-section-heading"><div><Chart aria-hidden="true" /><div><span>PREFERÊNCIAS</span><h2 id="preferences-title">Treinos</h2></div></div></div>
          <article className="profile-settings-card profile-preference-card"><h3>Unidade padrão de carga</h3><p>Usada como sugestão em novas séries. Séries já registradas não são alteradas.</p><div className="profile-unit-options"><label><input checked={preference.preferredWeightUnit === "Kilograms"} disabled={processing === "preference"} onChange={() => void updatePreference("Kilograms")} type="radio" /><span>Quilogramas <b>kg</b></span></label><label><input checked={preference.preferredWeightUnit === "Pounds"} disabled={processing === "preference"} onChange={() => void updatePreference("Pounds")} type="radio" /><span>Libras <b>lb</b></span></label></div></article>
        </section>

        <section className="profile-section" aria-labelledby="security-title">
          <div className="profile-section-heading"><div><Lock aria-hidden="true" /><div><span>SEGURANÇA</span><h2 id="security-title">Acesso</h2></div></div></div>
          <div className="profile-settings-grid">
            <article className="profile-settings-card"><h3>Alterar senha</h3><p>A nova senha encerra automaticamente as outras sessões ativas.</p><label className="profile-field"><span>Senha atual</span><input autoComplete="current-password" onChange={(event) => setPassword({ ...password, current: event.target.value })} type="password" value={password.current} /></label><label className="profile-field"><span>Nova senha</span><input autoComplete="new-password" onChange={(event) => setPassword({ ...password, next: event.target.value })} type="password" value={password.next} /></label><label className="profile-field"><span>Confirmar nova senha</span><input autoComplete="new-password" onChange={(event) => setPassword({ ...password, confirm: event.target.value })} type="password" value={password.confirm} /></label><button className="profile-primary-button" disabled={processing === "password"} onClick={() => void savePassword()} type="button">{processing === "password" ? "Atualizando..." : "Atualizar senha"}</button></article>
            <article className="profile-settings-card profile-danger-card"><h3>Encerrar outras sessões</h3><p>Desconecte dispositivos e navegadores que usam sua conta. Sua sessão atual permanece ativa.</p><button className="profile-danger-button" disabled={processing === "sessions"} onClick={() => setConfirmation({ confirmLabel: "Encerrar sessões", description: "Todos os outros dispositivos perderão o acesso imediatamente. Sua sessão atual continuará ativa.", onConfirm: revokeOtherSessions, title: "Encerrar outras sessões" })} type="button">{processing === "sessions" ? "Encerrando..." : "Encerrar outras sessões"}</button></article>
          </div>
        </section>
      </main>

      {badgeEditor ? <BadgeEditorModal badgeEditor={badgeEditor} isLoadingResources={isBadgeResourcesLoading} isSaving={processing === "badge-editor"} onCancel={() => { setBadgeEditor(null); setEditingBadge(null); }} onChange={setBadgeEditor} onSave={() => void saveBadge()} resources={badgeResources} title={editingBadge ? "Editar conquista" : "Nova conquista"} /> : null}
      {confirmation ? <ConfirmationModal confirmation={confirmation} onCancel={() => setConfirmation(null)} /> : null}
    </div>
  );
}

function BadgeEditorModal({ badgeEditor, isLoadingResources, isSaving, onCancel, onChange, onSave, resources, title }: Readonly<{ badgeEditor: BadgeEditor; isLoadingResources: boolean; isSaving: boolean; onCancel: () => void; onChange: (editor: BadgeEditor) => void; onSave: () => void; resources: BadgeResources | null; title: string }>) {
  return <div className="profile-modal-backdrop" role="presentation"><section aria-labelledby="profile-modal-title" aria-modal="true" className="profile-modal" role="dialog"><header><span id="profile-modal-title">{title.toUpperCase()}</span><button aria-label="Fechar" onClick={onCancel} type="button">×</button></header><div className="profile-badge-form"><label className="profile-field"><span>Nome</span><input autoFocus maxLength={120} onChange={(event) => onChange({ ...badgeEditor, name: event.target.value })} value={badgeEditor.name} /></label><label className="profile-field"><span>Descrição</span><textarea maxLength={300} onChange={(event) => onChange({ ...badgeEditor, description: event.target.value })} value={badgeEditor.description} /></label><div className="profile-criteria-heading"><span>Critérios</span><button onClick={() => onChange({ ...badgeEditor, criteria: [...badgeEditor.criteria, { resourceId: "", targetValue: "1", type: "Xp" }] })} type="button">Adicionar critério</button></div>{badgeEditor.criteria.map((criterion, index) => <CriterionEditor criterion={criterion} index={index} isLoadingResources={isLoadingResources} key={`${criterion.type}-${index}`} onChange={(nextCriterion) => onChange({ ...badgeEditor, criteria: badgeEditor.criteria.map((current, currentIndex) => currentIndex === index ? nextCriterion : current) })} onRemove={() => onChange({ ...badgeEditor, criteria: badgeEditor.criteria.filter((_, currentIndex) => currentIndex !== index) })} resources={resources} showRemove={badgeEditor.criteria.length > 1} />)}<div className="profile-modal-actions"><button onClick={onCancel} type="button">Cancelar</button><button className="primary" disabled={isSaving || isLoadingResources} onClick={onSave} type="button">{isSaving ? "Salvando..." : "Salvar conquista"}</button></div></div></section></div>;
}

function CriterionEditor({ criterion, index, isLoadingResources, onChange, onRemove, resources, showRemove }: Readonly<{ criterion: BadgeCriterionEditor; index: number; isLoadingResources: boolean; onChange: (criterion: BadgeCriterionEditor) => void; onRemove: () => void; resources: BadgeResources | null; showRemove: boolean }>) {
  const resource = getCriterionResources(criterion.type, resources);
  return <div className="profile-criterion"><strong>Critério {index + 1}</strong><label className="profile-field"><span>Tipo</span><select onChange={(event) => onChange({ resourceId: "", targetValue: criterion.targetValue, type: event.target.value as BadgeCriterionType })} value={criterion.type}>{criterionTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label className="profile-field"><span>Alvo</span><input min="1" onChange={(event) => onChange({ ...criterion, targetValue: event.target.value })} type="number" value={criterion.targetValue} /></label>{resource ? <label className="profile-field"><span>{resource.label} específico</span><select disabled={isLoadingResources} onChange={(event) => onChange({ ...criterion, resourceId: event.target.value })} value={criterion.resourceId}><option value="">Qualquer {resource.label.toLowerCase()}</option>{resource.items.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label> : null}{showRemove ? <button className="remove" onClick={onRemove} type="button">Remover critério</button> : null}</div>;
}

function ProfileLoading({ error, onRetry }: Readonly<{ error: string | null; onRetry: () => void }>) {
  return <div className="profile-page"><main className="profile-main"><section className="profile-loading" aria-live="polite">{error ? <><span>{error}</span><button onClick={onRetry} type="button">Tentar novamente</button></> : "CARREGANDO PERFIL"}</section></main></div>;
}

function getCriterionResources(type: BadgeCriterionType, resources: BadgeResources | null): { items: Array<{ id: string; label: string }>; label: string } | null {
  if (!resources) return null;
  if (type === "HabitCompletionCount") return { items: resources.habits.map((habit) => ({ id: habit.id, label: habit.title })), label: "Hábito" };
  if (type === "WorkoutCompletionCount") return { items: resources.exercises.map((exercise) => ({ id: exercise.id, label: exercise.name })), label: "Exercício" };
  if (type === "TransactionConfirmationCount") return { items: resources.categories.map((category) => ({ id: category.id, label: category.name })), label: "Categoria" };
  if (type === "GoalCompletionCount") return { items: resources.goals.map((goal) => ({ id: goal.id, label: goal.title })), label: "Meta" };
  return null;
}

function toBadgeEditor(badge: Badge): BadgeEditor {
  return { criteria: badge.criteria.map((criterion) => ({ resourceId: getCriterionResourceId(criterion), targetValue: String(criterion.targetValue), type: criterion.type })), description: badge.description, name: badge.name };
}

function toBadgeRequest(editor: BadgeEditor): { criteria: BadgeCriterion[]; description: string; name: string } | null {
  const name = editor.name.trim();
  const description = editor.description.trim();
  const criteria = editor.criteria.map((criterion) => ({ ...toBadgeCriterion(criterion), targetValue: Number(criterion.targetValue) }));
  if (!name || !description || !criteria.every((criterion) => isPositiveInteger(criterion.targetValue))) return null;
  return { criteria, description, name };
}

function toBadgeCriterion(criterion: BadgeCriterionEditor): BadgeCriterion {
  const result: BadgeCriterion = { targetValue: Number(criterion.targetValue), type: criterion.type };
  if (!criterion.resourceId) return result;
  if (criterion.type === "HabitCompletionCount") result.habitId = criterion.resourceId;
  if (criterion.type === "WorkoutCompletionCount") result.exerciseId = criterion.resourceId;
  if (criterion.type === "TransactionConfirmationCount") result.financialCategoryId = criterion.resourceId;
  if (criterion.type === "GoalCompletionCount") result.goalId = criterion.resourceId;
  return result;
}

function getCriterionResourceId(criterion: BadgeCriterion): string {
  return criterion.habitId ?? criterion.exerciseId ?? criterion.financialCategoryId ?? criterion.goalId ?? "";
}

function getXpProgress(profile: GamificationProfile): number {
  if (profile.nextLevelXp === null || profile.nextLevelXp <= profile.currentLevelXp) return 100;
  return Math.min(100, Math.max(0, ((profile.totalXp - profile.currentLevelXp) / (profile.nextLevelXp - profile.currentLevelXp)) * 100));
}

function isPositiveInteger(value: number): boolean { return Number.isInteger(value) && value > 0; }
function isNonNegativeInteger(value: number): boolean { return Number.isInteger(value) && value >= 0; }
function formatNumber(value: number): string { return new Intl.NumberFormat("pt-BR").format(value); }
function formatDateTime(value: string): string { return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo", year: "numeric" }).format(new Date(value)); }
function getErrorMessage(error: unknown): string { return error instanceof Error ? error.message : "Não foi possível concluir esta ação."; }

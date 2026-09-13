"use client";

import { useEffect, useState } from "react";
import { Target } from "pixelarticons/react/Target";
import {
  ConfirmationModal,
  type Confirmation,
} from "@/components/confirmation-modal";
import type {
  Exercise,
  Goal,
  GoalRequest,
  GoalSourceType,
  GoalStatus,
  GoalType,
  Habit,
  WorkoutSheet,
} from "@/lib/api/contracts";
import { gamificationApi } from "@/lib/api/gamification";
import { habitsApi } from "@/lib/api/habits";
import { workoutsApi } from "@/lib/api/workouts";

type GoalEditor = {
  description: string;
  dueDate: string;
  sourceId: string;
  sourceType: "Habit" | "Exercise" | "WorkoutSheet";
  targetValue: string;
  title: string;
  type: GoalType;
  unit: string;
};

type StatusFilter = GoalStatus | "All";

const pageSize = 12;

const initialEditor: GoalEditor = {
  description: "",
  dueDate: "",
  sourceId: "",
  sourceType: "Habit",
  targetValue: "1",
  title: "",
  type: "FreeForm",
  unit: "vezes",
};

const goalTypes: Array<{ value: GoalType; label: string; description: string }> = [
  { value: "FreeForm", label: "Livre", description: "Você informa o progresso." },
  { value: "Habit", label: "Hábito", description: "Acompanha a ofensiva de um hábito." },
  { value: "Training", label: "Treino", description: "Acompanha semanas de treino." },
  { value: "Financial", label: "Financeira", description: "Acompanha meses positivos fechados." },
];

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [sheets, setSheets] = useState<WorkoutSheet[]>([]);
  const [totalGoals, setTotalGoals] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusFilter>("All");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<GoalEditor>(initialEditor);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [progressGoal, setProgressGoal] = useState<Goal | null>(null);
  const [progressValue, setProgressValue] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const pageCount = Math.max(1, Math.ceil(totalGoals / pageSize));

  async function loadGoals(signal?: AbortSignal) {
    try {
      const response = await gamificationApi.getGoals(
        {
          includeArchived,
          page,
          pageSize,
          status: status === "All" ? undefined : status,
        },
        signal,
      );
      if (signal?.aborted) return;
      setGoals(response.items);
      setTotalGoals(response.totalCount);
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
      gamificationApi.getGoals(
        {
          includeArchived,
          page,
          pageSize,
          status: status === "All" ? undefined : status,
        },
        controller.signal,
      ),
      habitsApi.getAll({ page: 1, pageSize: 100 }, controller.signal),
      workoutsApi.getExercises(false, controller.signal),
      workoutsApi.getSheets(false, controller.signal),
    ])
      .then(([response, habitResponse, nextExercises, nextSheets]) => {
        if (controller.signal.aborted) return;
        setGoals(response.items);
        setTotalGoals(response.totalCount);
        setHabits(habitResponse.items);
        setExercises(nextExercises);
        setSheets(nextSheets);
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) setError(getErrorMessage(loadError));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [includeArchived, page, status]);

  function openCreateEditor() {
    setEditingGoal(null);
    setEditor(initialEditor);
    setIsEditorOpen(true);
  }

  function openEditEditor(goal: Goal) {
    const source = goal.sources[0];
    setEditingGoal(goal);
    setEditor({
      description: goal.description ?? "",
      dueDate: goal.dueDate ?? "",
      sourceId: source?.sourceId ?? "",
      sourceType: toEditorSourceType(source?.sourceType, goal.type),
      targetValue: String(goal.targetValue),
      title: goal.title,
      type: goal.type,
      unit: goal.unit,
    });
    setIsEditorOpen(true);
  }

  function changeType(type: GoalType) {
    setEditor({
      ...editor,
      sourceId: "",
      sourceType: type === "Habit" ? "Habit" : "Exercise",
      type,
    });
  }

  async function saveGoal() {
    const request = toGoalRequest(editor);
    if (request === null) {
      setError(getEditorError(editor));
      return;
    }

    setProcessingId("goal-editor");
    setError(null);
    try {
      if (editingGoal) {
        await gamificationApi.updateGoal(editingGoal.id, request);
      } else {
        await gamificationApi.createGoal(request);
      }
      setIsEditorOpen(false);
      await loadGoals();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setProcessingId(null);
    }
  }

  function openProgressEditor(goal: Goal) {
    setProgressGoal(goal);
    setProgressValue(String(goal.progress));
  }

  async function saveProgress() {
    if (!progressGoal) return;
    const progress = Number(progressValue.replace(",", "."));
    if (!Number.isFinite(progress) || progress < 0) {
      setError("Informe um progresso igual ou maior que zero.");
      return;
    }

    setProcessingId("progress-editor");
    setError(null);
    try {
      await gamificationApi.updateGoalProgress(progressGoal.id, progress);
      setProgressGoal(null);
      await loadGoals();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setProcessingId(null);
    }
  }

  async function cancelGoal(goal: Goal) {
    setProcessingId(goal.id);
    setError(null);
    try {
      await gamificationApi.cancelGoal(goal.id);
      await loadGoals();
    } catch (cancelError) {
      setError(getErrorMessage(cancelError));
    } finally {
      setProcessingId(null);
    }
  }

  async function archiveGoal(goal: Goal) {
    setProcessingId(goal.id);
    setError(null);
    try {
      await gamificationApi.archiveGoal(goal.id);
      await loadGoals();
    } catch (archiveError) {
      setError(getErrorMessage(archiveError));
    } finally {
      setProcessingId(null);
    }
  }

  function updateFilters(nextStatus: StatusFilter, nextIncludeArchived: boolean) {
    setPage(1);
    setStatus(nextStatus);
    setIncludeArchived(nextIncludeArchived);
  }

  return (
    <div className="goals-page">
      <main className="goals-main">
        <section className="goals-heading" aria-labelledby="goals-title">
          <div>
            <p>DIREÇÃO E CONQUISTAS</p>
            <h1 id="goals-title">Metas</h1>
            <span>Transforme consistência em marcos visíveis.</span>
          </div>
          <button className="goals-create" onClick={openCreateEditor} type="button">
            <span aria-hidden="true">+</span>
            Nova meta
          </button>
        </section>

        {error ? (
          <div className="goals-error" role="alert">
            <span>{error}</span>
            <button onClick={() => void loadGoals()} type="button">Tentar novamente</button>
          </div>
        ) : null}

        <section className="goals-toolbar" aria-label="Filtros de metas">
          <label>
            <span>Estado</span>
            <select
              onChange={(event) => updateFilters(event.target.value as StatusFilter, includeArchived)}
              value={status}
            >
              <option value="All">Todas ativas</option>
              <option value="Active">Em andamento</option>
              <option value="Completed">Concluídas</option>
              <option value="Cancelled">Canceladas</option>
            </select>
          </label>
          <label className="goals-archive-filter">
            <input
              checked={includeArchived}
              onChange={(event) => updateFilters(status, event.target.checked)}
              type="checkbox"
            />
            <span>Incluir arquivadas</span>
          </label>
        </section>

        {isLoading ? (
          <section className="goals-loading" aria-live="polite">CARREGANDO METAS</section>
        ) : goals.length === 0 ? (
          <section className="goals-empty">
            <Target aria-hidden="true" />
            <h2>Nenhuma meta por aqui.</h2>
            <p>Defina um alvo para acompanhar sua evolução.</p>
            <button className="goals-create" onClick={openCreateEditor} type="button">Criar meta</button>
          </section>
        ) : (
          <>
            <section className="goals-list" aria-label="Lista de metas">
              {goals.map((goal) => {
                const progressPercent = getProgressPercent(goal);
                const isCancelled = goal.status === "Cancelled";
                const canEdit = !goal.archived && !isCancelled;
                const canUpdateProgress = canEdit && goal.type === "FreeForm" && goal.status === "Active";

                return (
                  <article
                    className={`goal-card ${goal.status.toLowerCase()}${goal.archived ? " archived" : ""}`}
                    key={goal.id}
                  >
                    <div className="goal-card-topline">
                      <span className={`goal-type ${goal.type.toLowerCase()}`}>{getGoalTypeLabel(goal.type)}</span>
                      <span className={`goal-status ${goal.status.toLowerCase()}`}>{getGoalStatusLabel(goal.status)}</span>
                    </div>
                    <div className="goal-card-content">
                      <div className="goal-card-title">
                        <h2>{goal.title}</h2>
                        {goal.archived ? <span>ARQUIVADA</span> : null}
                      </div>
                      {goal.description ? <p className="goal-description">{goal.description}</p> : null}
                      <div className="goal-progress" aria-label={`${formatNumber(progressPercent)}% concluído`}>
                        <span style={{ width: `${progressPercent}%` }} />
                      </div>
                      <div className="goal-progress-values">
                        <strong>{formatNumber(goal.progress)} / {formatNumber(goal.targetValue)} {goal.unit}</strong>
                        <span>{formatNumber(progressPercent)}%</span>
                      </div>
                      <div className="goal-details">
                        <span>{getGoalMeasureDescription(goal.type)}</span>
                        {goal.sources[0] ? <span>{getSourceLabel(goal, habits, exercises, sheets)}</span> : null}
                        {goal.dueDate ? <span>Prazo: {formatDate(goal.dueDate)}</span> : null}
                      </div>
                    </div>
                    <div className="goal-card-actions">
                      {canUpdateProgress ? (
                        <button onClick={() => openProgressEditor(goal)} type="button">Atualizar progresso</button>
                      ) : null}
                      {canEdit ? <button onClick={() => openEditEditor(goal)} type="button">Editar</button> : null}
                      {goal.status === "Active" && !goal.archived ? (
                        <button
                          className="cancel-action"
                          disabled={processingId === goal.id}
                          onClick={() => setConfirmation({
                            confirmLabel: "Cancelar meta",
                            description: `A meta “${goal.title}” deixará de receber atualizações automáticas.`,
                            onConfirm: () => cancelGoal(goal),
                            title: "Cancelar meta?",
                          })}
                          type="button"
                        >
                          Cancelar
                        </button>
                      ) : null}
                      {!goal.archived ? (
                        <button
                          className="archive-action"
                          disabled={processingId === goal.id}
                          onClick={() => setConfirmation({
                            confirmLabel: "Arquivar meta",
                            description: `A meta “${goal.title}” será preservada no histórico.`,
                            onConfirm: () => archiveGoal(goal),
                            title: "Arquivar meta?",
                          })}
                          type="button"
                        >
                          Arquivar
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </section>
            <div className="goals-pagination">
              <button disabled={page === 1} onClick={() => setPage(page - 1)} type="button">Anterior</button>
              <span>Página {page} de {pageCount}</span>
              <button disabled={page === pageCount} onClick={() => setPage(page + 1)} type="button">Próxima</button>
            </div>
          </>
        )}
      </main>

      {isEditorOpen ? (
        <GoalEditorModal
          editor={editor}
          exercises={exercises}
          habits={habits}
          isEditing={editingGoal !== null}
          isSaving={processingId === "goal-editor"}
          onCancel={() => setIsEditorOpen(false)}
          onChange={setEditor}
          onChangeType={changeType}
          onSave={() => void saveGoal()}
          sheets={sheets}
        />
      ) : null}
      {progressGoal ? (
        <ProgressModal
          goal={progressGoal}
          isSaving={processingId === "progress-editor"}
          onCancel={() => setProgressGoal(null)}
          onChange={setProgressValue}
          onSave={() => void saveProgress()}
          value={progressValue}
        />
      ) : null}
      {confirmation ? <ConfirmationModal confirmation={confirmation} onCancel={() => setConfirmation(null)} /> : null}
    </div>
  );
}

function GoalEditorModal({
  editor,
  exercises,
  habits,
  isEditing,
  isSaving,
  onCancel,
  onChange,
  onChangeType,
  onSave,
  sheets,
}: Readonly<{
  editor: GoalEditor;
  exercises: Exercise[];
  habits: Habit[];
  isEditing: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onChange: (editor: GoalEditor) => void;
  onChangeType: (type: GoalType) => void;
  onSave: () => void;
  sheets: WorkoutSheet[];
}>) {
  const sources = editor.sourceType === "Habit" ? habits : editor.sourceType === "Exercise" ? exercises : sheets;
  return (
    <Modal onClose={onCancel} title={isEditing ? "Editar meta" : "Nova meta"}>
      <div className="goal-form">
        <label>
          <span>Tipo de meta</span>
          <select disabled={isEditing} onChange={(event) => onChangeType(event.target.value as GoalType)} value={editor.type}>
            {goalTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
          <small>{goalTypes.find((type) => type.value === editor.type)?.description}</small>
        </label>
        <label>
          <span>Título</span>
          <input autoFocus onChange={(event) => onChange({ ...editor, title: event.target.value })} value={editor.title} />
        </label>
        <label>
          <span>Descrição</span>
          <textarea onChange={(event) => onChange({ ...editor, description: event.target.value })} value={editor.description} />
        </label>
        <div className="goal-form-row">
          <label>
            <span>Alvo</span>
            <input inputMode="decimal" min="0.01" onChange={(event) => onChange({ ...editor, targetValue: event.target.value })} type="number" value={editor.targetValue} />
          </label>
          <label>
            <span>Unidade</span>
            <input onChange={(event) => onChange({ ...editor, unit: event.target.value })} value={editor.unit} />
          </label>
        </div>
        <label>
          <span>Prazo</span>
          <input onChange={(event) => onChange({ ...editor, dueDate: event.target.value })} type="date" value={editor.dueDate} />
          <small>Opcional. O prazo não altera o estado da meta.</small>
        </label>
        {editor.type === "Habit" || editor.type === "Training" ? (
          <div className="goal-source-picker">
            {editor.type === "Training" ? (
              <label>
                <span>Vincular a</span>
                <select
                  onChange={(event) => onChange({ ...editor, sourceId: "", sourceType: event.target.value as "Exercise" | "WorkoutSheet" })}
                  value={editor.sourceType}
                >
                  <option value="Exercise">Exercício</option>
                  <option value="WorkoutSheet">Ficha de treino</option>
                </select>
              </label>
            ) : null}
            <label>
              <span>{editor.type === "Habit" ? "Hábito" : editor.sourceType === "Exercise" ? "Exercício" : "Ficha"}</span>
              <select onChange={(event) => onChange({ ...editor, sourceId: event.target.value })} value={editor.sourceId}>
                <option value="">Selecione</option>
                {sources.map((source) => <option key={source.id} value={source.id}>{"title" in source ? source.title : source.name}</option>)}
              </select>
            </label>
          </div>
        ) : null}
        <div className="goal-modal-actions">
          <button onClick={onCancel} type="button">Cancelar</button>
          <button className="primary" disabled={isSaving} onClick={onSave} type="button">
            {isSaving ? "Salvando..." : "Salvar meta"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ProgressModal({ goal, isSaving, onCancel, onChange, onSave, value }: Readonly<{
  goal: Goal;
  isSaving: boolean;
  onCancel: () => void;
  onChange: (value: string) => void;
  onSave: () => void;
  value: string;
}>) {
  return (
    <Modal onClose={onCancel} title="Atualizar progresso">
      <div className="goal-form">
        <p className="goal-form-note">{goal.title}: alvo de {formatNumber(goal.targetValue)} {goal.unit}.</p>
        <label>
          <span>Progresso atual</span>
          <input autoFocus inputMode="decimal" min="0" onChange={(event) => onChange(event.target.value)} type="number" value={value} />
        </label>
        <div className="goal-modal-actions">
          <button onClick={onCancel} type="button">Cancelar</button>
          <button className="primary" disabled={isSaving} onClick={onSave} type="button">
            {isSaving ? "Salvando..." : "Atualizar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Modal({ children, onClose, title }: Readonly<{ children: React.ReactNode; onClose: () => void; title: string }>) {
  return (
    <div className="goal-modal-backdrop" role="presentation">
      <section aria-labelledby="goal-modal-title" aria-modal="true" className="goal-modal" role="dialog">
        <header>
          <span id="goal-modal-title">{title.toUpperCase()}</span>
          <button aria-label="Fechar" onClick={onClose} type="button">×</button>
        </header>
        {children}
      </section>
    </div>
  );
}

function toGoalRequest(editor: GoalEditor): GoalRequest | null {
  const title = editor.title.trim();
  const unit = editor.unit.trim();
  const targetValue = Number(editor.targetValue.replace(",", "."));
  if (!title || !unit || !Number.isFinite(targetValue) || targetValue <= 0) return null;
  if ((editor.type === "Habit" || editor.type === "Training") && !editor.sourceId) return null;
  return {
    description: editor.description.trim() || undefined,
    dueDate: editor.dueDate || null,
    sources: editor.type === "Habit" || editor.type === "Training" ? [{ sourceId: editor.sourceId, sourceType: editor.sourceType }] : undefined,
    targetValue,
    title,
    type: editor.type,
    unit,
  };
}

function getEditorError(editor: GoalEditor): string {
  if (!editor.title.trim()) return "Informe um título para a meta.";
  if (!editor.unit.trim()) return "Informe a unidade da meta.";
  const targetValue = Number(editor.targetValue.replace(",", "."));
  if (!Number.isFinite(targetValue) || targetValue <= 0) return "O alvo precisa ser maior que zero.";
  return editor.type === "Habit" ? "Selecione o hábito que será acompanhado." : "Selecione a fonte de treino que será acompanhada.";
}

function toEditorSourceType(sourceType: GoalSourceType | undefined, type: GoalType): "Habit" | "Exercise" | "WorkoutSheet" {
  if (sourceType === "Habit" || sourceType === "Exercise" || sourceType === "WorkoutSheet") return sourceType;
  return type === "Habit" ? "Habit" : "Exercise";
}

function getProgressPercent(goal: Goal): number {
  if (goal.targetValue <= 0) return 0;
  return Math.min(100, Math.max(0, (goal.progress / goal.targetValue) * 100));
}

function getGoalTypeLabel(type: GoalType): string {
  return { Financial: "Financeira", FreeForm: "Livre", Habit: "Hábito", Training: "Treino" }[type];
}

function getGoalStatusLabel(status: GoalStatus): string {
  return { Active: "Em andamento", Cancelled: "Cancelada", Completed: "Concluída" }[status];
}

function getGoalMeasureDescription(type: GoalType): string {
  return {
    Financial: "Meses positivos consecutivos",
    FreeForm: "Progresso informado manualmente",
    Habit: "Ofensiva atual do hábito",
    Training: "Semanas consecutivas de treino",
  }[type];
}

function getSourceLabel(goal: Goal, habits: Habit[], exercises: Exercise[], sheets: WorkoutSheet[]): string {
  const source = goal.sources[0];
  if (!source) return "";
  const label = source.sourceType === "Habit"
    ? habits.find((habit) => habit.id === source.sourceId)?.title
    : source.sourceType === "Exercise"
      ? exercises.find((exercise) => exercise.id === source.sourceId)?.name
      : sheets.find((sheet) => sheet.id === source.sourceId)?.name;
  return label ? `Vinculada a: ${label}` : "Fonte vinculada indisponível";
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Não foi possível concluir esta ação.";
}

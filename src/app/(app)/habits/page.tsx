"use client";

import { useEffect, useState } from "react";
import { Check } from "pixelarticons/react/Check";
import { Pencil } from "pixelarticons/react/Pencil";
import { Waves } from "pixelarticons/react/Waves";
import type {
  Habit,
  HabitCompletion,
  HabitPriority,
  HabitProgress,
  HabitScheduleType,
  Weekday,
} from "@/lib/api/contracts";
import { habitsApi } from "@/lib/api/habits";

type EditorState = {
  title: string;
  priority: HabitPriority;
  scheduleType: HabitScheduleType;
  targetCount: number;
  weekdays: Weekday[];
};

const initialEditor: EditorState = {
  title: "",
  priority: "Medium",
  scheduleType: "Daily",
  targetCount: 1,
  weekdays: [],
};

const weekdays: Array<{ value: Weekday; label: string }> = [
  { value: "Monday", label: "S" },
  { value: "Tuesday", label: "T" },
  { value: "Wednesday", label: "Q" },
  { value: "Thursday", label: "Q" },
  { value: "Friday", label: "S" },
  { value: "Saturday", label: "S" },
  { value: "Sunday", label: "D" },
];

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [progressByHabitId, setProgressByHabitId] = useState<Record<string, HabitProgress>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [editor, setEditor] = useState<EditorState>(initialEditor);
  const [isSaving, setIsSaving] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [historyHabit, setHistoryHabit] = useState<Habit | null>(null);
  const [history, setHistory] = useState<HabitCompletion[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  async function loadHabits() {
    try {
      setError(null);
      const response = await habitsApi.getAll({ includeArchived: false, page: 1, pageSize: 50 });
      const today = getSaoPauloDate();
      const progress = await Promise.all(
        response.items.map((habit) => habitsApi.getProgress(habit.id, today)),
      );
      setHabits(response.items);
      setProgressByHabitId(toProgressMap(progress));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void habitsApi.getAll({ includeArchived: false, page: 1, pageSize: 50 }, controller.signal)
      .then(async (response) => {
        const today = getSaoPauloDate();
        const progress = await Promise.all(
          response.items.map((habit) => habitsApi.getProgress(habit.id, today, controller.signal)),
        );
        if (controller.signal.aborted) {
          return;
        }
        setHabits(response.items);
        setProgressByHabitId(toProgressMap(progress));
      })
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) {
          setError(getErrorMessage(loadError));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });
    return () => controller.abort();
  }, []);

  function openCreateEditor() {
    setEditingHabit(null);
    setEditor(initialEditor);
    setIsEditorOpen(true);
  }

  function openEditEditor(habit: Habit) {
    setEditingHabit(habit);
    setEditor({
      title: habit.title,
      priority: habit.priority,
      scheduleType: habit.schedule.type,
      targetCount: habit.schedule.targetCount,
      weekdays: habit.schedule.weekdays,
    });
    setIsEditorOpen(true);
  }

  async function saveHabit() {
    const title = editor.title.trim();
    if (!title) {
      setError("Informe um título para o hábito.");
      return;
    }
    if (editor.scheduleType === "Weekdays" && editor.weekdays.length === 0) {
      setError("Selecione pelo menos um dia da semana.");
      return;
    }
    if ((editor.scheduleType === "WeeklyCount" || editor.scheduleType === "DailyCount") && editor.targetCount < 1) {
      setError("A meta precisa ser maior que zero.");
      return;
    }

    setIsSaving(true);
    setError(null);
    const request = {
      priority: editor.priority,
      schedule: {
        targetCount: editor.scheduleType === "WeeklyCount" || editor.scheduleType === "DailyCount"
          ? editor.targetCount
          : undefined,
        type: editor.scheduleType,
        weekdays: editor.scheduleType === "Weekdays" ? editor.weekdays : undefined,
      },
      title,
    };

    try {
      if (editingHabit) {
        await habitsApi.update(editingHabit.id, request);
      } else {
        await habitsApi.create(request);
      }
      setIsEditorOpen(false);
      await loadHabits();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  async function completeHabit(habit: Habit) {
    setProcessingId(habit.id);
    setError(null);
    try {
      await habitsApi.createCompletion(habit.id, getSaoPauloDate());
      await loadHabits();
    } catch (completionError) {
      setError(getErrorMessage(completionError));
    } finally {
      setProcessingId(null);
    }
  }

  async function changeStatus(habit: Habit) {
    setProcessingId(habit.id);
    setError(null);
    try {
      if (habit.status === "Active") {
        await habitsApi.pause(habit.id);
      } else {
        await habitsApi.resume(habit.id);
      }
      await loadHabits();
    } catch (statusError) {
      setError(getErrorMessage(statusError));
    } finally {
      setProcessingId(null);
    }
  }

  async function archiveHabit(habit: Habit) {
    if (!window.confirm(`Arquivar o hábito “${habit.title}”? O histórico será preservado.`)) {
      return;
    }

    setProcessingId(habit.id);
    setError(null);
    try {
      await habitsApi.archive(habit.id);
      if (historyHabit?.id === habit.id) {
        setHistoryHabit(null);
        setHistory([]);
      }
      await loadHabits();
    } catch (archiveError) {
      setError(getErrorMessage(archiveError));
    } finally {
      setProcessingId(null);
    }
  }

  async function openHistory(habit: Habit) {
    setHistoryHabit(habit);
    await loadHistory(habit);
  }

  async function loadHistory(habit: Habit, showLoading = true) {
    if (showLoading) {
      setIsHistoryLoading(true);
    }
    setError(null);
    try {
      const dates = getRecentDates();
      const completions = await habitsApi.getCompletions(habit.id, dates.at(-1) ?? dates[0], dates[0]);
      setHistory(completions);
    } catch (historyError) {
      setError(getErrorMessage(historyError));
    } finally {
      if (showLoading) {
        setIsHistoryLoading(false);
      }
    }
  }

  async function createHistoryCompletion(date: string) {
    if (!historyHabit) {
      return;
    }

    setProcessingId(`${historyHabit.id}:${date}`);
    setError(null);
    try {
      await habitsApi.createCompletion(historyHabit.id, date);
      await Promise.all([loadHabits(), loadHistory(historyHabit, false)]);
    } catch (completionError) {
      setError(getErrorMessage(completionError));
    } finally {
      setProcessingId(null);
    }
  }

  async function deleteHistoryCompletion(completion: HabitCompletion) {
    if (!historyHabit) {
      return;
    }

    setProcessingId(completion.id);
    setError(null);
    try {
      await habitsApi.deleteCompletion(historyHabit.id, completion.id);
      await Promise.all([loadHabits(), loadHistory(historyHabit, false)]);
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="habits-page">
      <main className="habits-main">
        <section className="habits-heading" aria-labelledby="habits-title">
          <div>
            <p>ROTINA E CONSISTÊNCIA</p>
            <h1 id="habits-title">Hábitos</h1>
            <span>Pequenas ações, progresso visível.</span>
          </div>
          <button className="habits-create" onClick={openCreateEditor} type="button">
            <span aria-hidden="true">+</span>
            Novo hábito
          </button>
        </section>

        {error ? (
          <div className="habits-error" role="alert">
            <span>{error}</span>
            <button onClick={() => void loadHabits()} type="button">Tentar novamente</button>
          </div>
        ) : null}

        {isLoading ? (
          <div className="habits-loading" aria-live="polite">CARREGANDO HÁBITOS</div>
        ) : habits.length === 0 ? (
          <section className="habits-empty">
            <Waves aria-hidden="true" />
            <h2>Seu primeiro hábito começa aqui.</h2>
            <p>Crie uma rotina que vale a pena repetir.</p>
            <button className="habits-create" onClick={openCreateEditor} type="button">Criar hábito</button>
          </section>
        ) : (
          <section className="habits-list" aria-label="Lista de hábitos">
            {habits.map((habit) => {
              const progress = progressByHabitId[habit.id];
              const isPaused = habit.status === "Paused";
              const progressPercent = progress
                ? Math.min(100, (progress.completionCount / progress.targetCount) * 100)
                : 0;

              return (
                <article className={isPaused ? "habit-card paused" : "habit-card"} key={habit.id}>
                  <div className="habit-card-topline">
                    <span className={`priority priority-${habit.priority.toLowerCase()}`}>
                      {getPriorityLabel(habit.priority)}
                    </span>
                    <span>{getScheduleLabel(habit)}</span>
                  </div>
                  <div className="habit-card-content">
                    <div>
                      <h2>{habit.title}</h2>
                      <p>{isPaused ? "Pausado" : `${progress?.streak ?? 0} de ofensiva`}</p>
                    </div>
                    <div className="habit-progress" aria-label={`${progressPercent}% concluído`}>
                      <span style={{ width: `${progressPercent}%` }} />
                    </div>
                    <span className="habit-count">
                      {progress?.completionCount ?? 0} / {progress?.targetCount ?? habit.schedule.targetCount}
                    </span>
                  </div>
                  <div className="habit-card-actions">
                    {!progress?.isCompleted ? (
                      <button
                        className="habit-complete"
                        disabled={isPaused || processingId === habit.id}
                        onClick={() => void completeHabit(habit)}
                        type="button"
                      >
                        <Check aria-hidden="true" />
                        Concluir
                      </button>
                    ) : null}
                    <button onClick={() => void openHistory(habit)} type="button">Histórico</button>
                    <button onClick={() => openEditEditor(habit)} type="button">Editar</button>
                    <button onClick={() => void changeStatus(habit)} type="button">
                      {isPaused ? "Retomar" : "Pausar"}
                    </button>
                    <button className="archive-action" onClick={() => void archiveHabit(habit)} type="button">
                      Arquivar
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>

      {isEditorOpen ? (
        <HabitEditor
          editor={editor}
          isSaving={isSaving}
          onCancel={() => setIsEditorOpen(false)}
          onChange={setEditor}
          onSave={() => void saveHabit()}
          title={editingHabit ? "Editar hábito" : "Novo hábito"}
        />
      ) : null}

      {historyHabit ? (
        <HabitHistory
          completions={history}
          habit={historyHabit}
          isLoading={isHistoryLoading}
          processingId={processingId}
          onClose={() => setHistoryHabit(null)}
          onCreate={(date) => void createHistoryCompletion(date)}
          onDelete={(completion) => void deleteHistoryCompletion(completion)}
        />
      ) : null}
    </div>
  );
}

function HabitEditor({
  editor,
  isSaving,
  onCancel,
  onChange,
  onSave,
  title,
}: Readonly<{
  editor: EditorState;
  isSaving: boolean;
  onCancel: () => void;
  onChange: (nextEditor: EditorState) => void;
  onSave: () => void;
  title: string;
}>) {
  function toggleWeekday(day: Weekday) {
    const nextWeekdays = editor.weekdays.includes(day)
      ? editor.weekdays.filter((item) => item !== day)
      : [...editor.weekdays, day];
    onChange({ ...editor, weekdays: nextWeekdays });
  }

  return (
    <div className="habit-modal-backdrop" role="presentation">
      <section className="habit-modal" aria-labelledby="habit-editor-title" role="dialog" aria-modal="true">
        <div className="habit-modal-header">
          <span id="habit-editor-title">{title.toUpperCase()}</span>
          <button aria-label="Fechar" onClick={onCancel} type="button">×</button>
        </div>
        <div className="habit-modal-content">
          <label className="habit-field">
            <span>Título</span>
            <input
              autoFocus
              onChange={(event) => onChange({ ...editor, title: event.target.value })}
              value={editor.title}
            />
          </label>
          <label className="habit-field">
            <span>Prioridade</span>
            <select
              onChange={(event) => onChange({
                ...editor,
                priority: event.target.value as HabitPriority,
              })}
              value={editor.priority}
            >
              <option value="Low">Baixa</option>
              <option value="Medium">Média</option>
              <option value="High">Alta</option>
            </select>
          </label>
          <fieldset className="schedule-fieldset">
            <legend>Agenda</legend>
            <div className="schedule-types">
              <button
                className={editor.scheduleType === "Daily" ? "selected" : ""}
                onClick={() => onChange({ ...editor, scheduleType: "Daily" })}
                type="button"
              >
                Diária
              </button>
              <button
                className={editor.scheduleType === "Weekdays" ? "selected" : ""}
                onClick={() => onChange({ ...editor, scheduleType: "Weekdays" })}
                type="button"
              >
                Dias da semana
              </button>
              <button
                className={editor.scheduleType === "WeeklyCount" ? "selected" : ""}
                onClick={() => onChange({ ...editor, scheduleType: "WeeklyCount" })}
                type="button"
              >
                Meta semanal
              </button>
              <button
                className={editor.scheduleType === "DailyCount" ? "selected" : ""}
                onClick={() => onChange({ ...editor, scheduleType: "DailyCount" })}
                type="button"
              >
                Meta diária
              </button>
            </div>
          </fieldset>
          {editor.scheduleType === "Weekdays" ? (
            <div className="weekday-picker" aria-label="Dias da semana">
              {weekdays.map((day) => (
                <button
                  className={editor.weekdays.includes(day.value) ? "selected" : ""}
                  key={day.value}
                  onClick={() => toggleWeekday(day.value)}
                  title={getWeekdayLabel(day.value)}
                  type="button"
                >
                  {day.label}
                </button>
              ))}
            </div>
          ) : null}
          {editor.scheduleType === "WeeklyCount" || editor.scheduleType === "DailyCount" ? (
            <label className="habit-field compact-field">
              <span>Conclusões necessárias</span>
              <input
                min="1"
                onChange={(event) => onChange({
                  ...editor,
                  targetCount: Number(event.target.value),
                })}
                type="number"
                value={editor.targetCount}
              />
            </label>
          ) : null}
          <div className="habit-modal-actions">
            <button onClick={onCancel} type="button">Cancelar</button>
            <button className="primary" disabled={isSaving} onClick={onSave} type="button">
              {isSaving ? "Salvando..." : "Salvar hábito"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function HabitHistory({
  completions,
  habit,
  isLoading,
  processingId,
  onClose,
  onCreate,
  onDelete,
}: Readonly<{
  completions: HabitCompletion[];
  habit: Habit;
  isLoading: boolean;
  processingId: string | null;
  onClose: () => void;
  onCreate: (date: string) => void;
  onDelete: (completion: HabitCompletion) => void;
}>) {
  return (
    <div className="habit-modal-backdrop" role="presentation">
      <section className="habit-modal history-modal" aria-labelledby="history-title" role="dialog" aria-modal="true">
        <div className="habit-modal-header">
          <span id="history-title">HISTÓRICO</span>
          <button aria-label="Fechar" onClick={onClose} type="button">×</button>
        </div>
        <div className="habit-modal-content">
          <div className="history-intro">
            <Pencil aria-hidden="true" />
            <div>
              <strong>{habit.title}</strong>
              <span>Correções disponíveis para hoje e os sete dias anteriores.</span>
            </div>
          </div>
          {isLoading ? <p className="history-loading">CARREGANDO HISTÓRICO</p> : (
            <ul className="history-list">
              {getRecentDates().filter((date) => isScheduledOn(habit, date)).map((date) => {
                const entries = completions.filter((completion) => completion.completedOn === date);
                const isProcessing = processingId === `${habit.id}:${date}`;

                return (
                  <li key={date}>
                    <span>{formatHistoryDate(date)}</span>
                    <div>
                      {entries.map((entry) => (
                        <button
                          className="history-completion"
                          disabled={processingId === entry.id}
                          key={entry.id}
                          onClick={() => onDelete(entry)}
                          title="Remover conclusão"
                          type="button"
                        >
                          <Check aria-hidden="true" />
                        </button>
                      ))}
                      <button
                        className="history-add"
                        disabled={isProcessing}
                        onClick={() => onCreate(date)}
                        title="Registrar conclusão"
                        type="button"
                      >
                        +
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function toProgressMap(progresses: HabitProgress[]): Record<string, HabitProgress> {
  const result: Record<string, HabitProgress> = {};
  for (const progress of progresses) {
    result[progress.habitId] = progress;
  }
  return result;
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

function getRecentDates(): string[] {
  const today = new Date(`${getSaoPauloDate()}T12:00:00`);
  return Array.from({ length: 8 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    return date.toISOString().slice(0, 10);
  });
}

function formatHistoryDate(date: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "America/Sao_Paulo",
    weekday: "short",
  }).format(new Date(`${date}T12:00:00`));
}

function getPriorityLabel(priority: HabitPriority): string {
  return { High: "Alta", Low: "Baixa", Medium: "Média" }[priority];
}

function getScheduleLabel(habit: Habit): string {
  if (habit.schedule.type === "Daily") return "Diária";
  if (habit.schedule.type === "Weekdays") return "Dias específicos";
  if (habit.schedule.type === "WeeklyCount") return `${habit.schedule.targetCount}x por semana`;
  return `${habit.schedule.targetCount}x por dia`;
}

function getWeekdayLabel(day: Weekday): string {
  return {
    Friday: "Sexta-feira",
    Monday: "Segunda-feira",
    Saturday: "Sábado",
    Sunday: "Domingo",
    Thursday: "Quinta-feira",
    Tuesday: "Terça-feira",
    Wednesday: "Quarta-feira",
  }[day];
}

function isScheduledOn(habit: Habit, date: string): boolean {
  if (habit.schedule.type !== "Weekdays") {
    return true;
  }

  const weekdaysByIndex: Record<number, Weekday> = {
    0: "Sunday",
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday",
  };
  const weekday = weekdaysByIndex[new Date(`${date}T12:00:00Z`).getUTCDay()];

  return habit.schedule.weekdays.includes(weekday);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Não foi possível concluir esta ação.";
}

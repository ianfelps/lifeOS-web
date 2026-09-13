"use client";

import { useEffect, useState } from "react";
import { Check } from "pixelarticons/react/Check";
import { Chart } from "pixelarticons/react/Chart";
import { Plus } from "pixelarticons/react/Plus";
import { Zap } from "pixelarticons/react/Zap";
import {
  ConfirmationModal,
  type Confirmation,
} from "@/components/confirmation-modal";
import type {
  Exercise,
  ExerciseProgress,
  MuscleGroup,
  WeightUnit,
  WorkoutSession,
  WorkoutSessionExerciseRequest,
  WorkoutSheet,
  WorkoutSheetExerciseRequest,
} from "@/lib/api/contracts";
import { usersApi } from "@/lib/api/users";
import { workoutsApi } from "@/lib/api/workouts";
type SetEditor = {
  repetitions: string;
  weight: string;
  weightUnit: WeightUnit;
};
type SessionExerciseEditor = {
  exerciseId: string;
  exerciseName: string;
  sets: SetEditor[];
};
type SheetExerciseEditor = {
  exerciseId: string;
  sets: string[];
};
const pageSize = 10;
const muscleGroups: Array<{
  value: Exclude<MuscleGroup, "Other">;
  label: string;
}> = [
  { value: "Chest", label: "Peito" },
  { value: "Back", label: "Costas" },
  { value: "Shoulders", label: "Ombros" },
  { value: "Biceps", label: "Bíceps" },
  { value: "Triceps", label: "Tríceps" },
  { value: "Forearms", label: "Antebraços" },
  { value: "Quadriceps", label: "Quadríceps" },
  { value: "Hamstrings", label: "Posteriores" },
  { value: "Glutes", label: "Glúteos" },
  { value: "Calves", label: "Panturrilhas" },
  { value: "Abdomen", label: "Abdômen" },
];
export default function WorkoutsPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [sheets, setSheets] = useState<WorkoutSheet[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [preferredWeightUnit, setPreferredWeightUnit] =
    useState<WeightUnit>("Kilograms");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [exerciseEditor, setExerciseEditor] = useState<
    Exercise | null | undefined
  >(undefined);
  const [exerciseName, setExerciseName] = useState("");
  const [primaryMuscleGroup, setPrimaryMuscleGroup] = useState<
    MuscleGroup | ""
  >("");
  const [secondaryMuscleGroup, setSecondaryMuscleGroup] = useState<
    MuscleGroup | ""
  >("");
  const [sheetEditor, setSheetEditor] = useState<
    WorkoutSheet | null | undefined
  >(undefined);
  const [sheetName, setSheetName] = useState("");
  const [sheetMuscleGroups, setSheetMuscleGroups] = useState<MuscleGroup[]>([]);
  const [sheetExercises, setSheetExercises] = useState<SheetExerciseEditor[]>(
    [],
  );
  const [sessionEditor, setSessionEditor] = useState<WorkoutSession | null>(
    null,
  );
  const [sessionExercises, setSessionExercises] = useState<
    SessionExerciseEditor[]
  >([]);
  const [progress, setProgress] = useState<ExerciseProgress | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const pageCount = Math.max(1, Math.ceil(totalSessions / pageSize));
  async function loadWorkouts(signal?: AbortSignal) {
    try {
      const [nextExercises, nextSheets, nextSessions, preference] =
        await Promise.all([
          workoutsApi.getExercises(false, signal),
          workoutsApi.getSheets(false, signal),
          workoutsApi.getSessions(
            {
              page,
              pageSize,
            },
            signal,
          ),
          usersApi.getPreferences(signal),
        ]);
      if (signal?.aborted) return;
      setExercises(nextExercises);
      setSheets(nextSheets);
      setSessions(nextSessions.items);
      setTotalSessions(nextSessions.totalCount);
      setPreferredWeightUnit(preference.preferredWeightUnit);
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
      workoutsApi.getExercises(false, controller.signal),
      workoutsApi.getSheets(false, controller.signal),
      workoutsApi.getSessions(
        {
          page,
          pageSize,
        },
        controller.signal,
      ),
      usersApi.getPreferences(controller.signal),
    ])
      .then(([nextExercises, nextSheets, nextSessions, preference]) => {
        if (controller.signal.aborted) return;
        setExercises(nextExercises);
        setSheets(nextSheets);
        setSessions(nextSessions.items);
        setTotalSessions(nextSessions.totalCount);
        setPreferredWeightUnit(preference.preferredWeightUnit);
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) setError(getErrorMessage(loadError));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [page]);
  function openCreateExercise() {
    setExerciseName("");
    setPrimaryMuscleGroup("");
    setSecondaryMuscleGroup("");
    setExerciseEditor(null);
  }
  function openEditExercise(exercise: Exercise) {
    setExerciseName(exercise.name);
    setPrimaryMuscleGroup(exercise.primaryMuscleGroup);
    setSecondaryMuscleGroup(exercise.secondaryMuscleGroup ?? "");
    setExerciseEditor(exercise);
  }
  async function saveExercise() {
    const name = exerciseName.trim();
    if (!name || !primaryMuscleGroup || primaryMuscleGroup === "Other") {
      setError("Informe nome e grupo muscular primário para o exercício.");
      return;
    }
    setProcessingId("exercise-editor");
    try {
      if (exerciseEditor)
        await workoutsApi.updateExercise(exerciseEditor.id, {
          name,
          primaryMuscleGroup,
          secondaryMuscleGroup: secondaryMuscleGroup || null,
        });
      else
        await workoutsApi.createExercise({
          name,
          primaryMuscleGroup,
          secondaryMuscleGroup: secondaryMuscleGroup || null,
        });
      setExerciseEditor(undefined);
      await loadWorkouts();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setProcessingId(null);
    }
  }
  async function archiveExercise(exercise: Exercise) {
    setProcessingId(exercise.id);
    try {
      await workoutsApi.archiveExercise(exercise.id);
      await loadWorkouts();
    } catch (archiveError) {
      setError(getErrorMessage(archiveError));
    } finally {
      setProcessingId(null);
    }
  }
  function openCreateSheet() {
    setSheetEditor(null);
    setSheetName("");
    setSheetMuscleGroups([]);
    setSheetExercises(
      exercises.length === 0 ? [] : [createSheetExercise(exercises[0].id)],
    );
  }
  function openEditSheet(sheet: WorkoutSheet) {
    setSheetEditor(sheet);
    setSheetName(sheet.name);
    setSheetMuscleGroups(sheet.muscleGroups);
    setSheetExercises(
      sheet.exercises.map((exercise) => ({
        exerciseId: exercise.exerciseId,
        sets: exercise.sets.map((set) => String(set.targetRepetitions)),
      })),
    );
  }
  async function saveSheet() {
    const name = sheetName.trim();
    const requestExercises = toSheetRequestExercises(sheetExercises);
    if (!name || requestExercises === null) {
      setError(
        "Informe um nome, exercícios sem repetição e pelo menos uma série por exercício.",
      );
      return;
    }
    setProcessingId("sheet-editor");
    try {
      const request = {
        name,
        muscleGroups: sheetMuscleGroups,
        exercises: requestExercises,
      };
      if (sheetEditor) await workoutsApi.updateSheet(sheetEditor.id, request);
      else await workoutsApi.createSheet(request);
      setSheetEditor(null);
      await loadWorkouts();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setProcessingId(null);
    }
  }
  async function archiveSheet(sheet: WorkoutSheet) {
    setProcessingId(sheet.id);
    try {
      await workoutsApi.archiveSheet(sheet.id);
      await loadWorkouts();
    } catch (archiveError) {
      setError(getErrorMessage(archiveError));
    } finally {
      setProcessingId(null);
    }
  }
  async function startFromSheet(sheet: WorkoutSheet) {
    setProcessingId(sheet.id);
    try {
      const session = await workoutsApi.startSession({
        workoutSheetId: sheet.id,
      });
      setSessionExercises(toSessionEditor(session));
      setSessionEditor(session);
      await loadWorkouts();
    } catch (startError) {
      setError(getErrorMessage(startError));
    } finally {
      setProcessingId(null);
    }
  }
  async function startFreeWorkout() {
    setProcessingId("new-session");
    try {
      const session = await workoutsApi.startSession({
        exercises: [
          {
            exerciseName: "Exercício livre",
            sets: [{}],
          },
        ],
      });
      setSessionExercises(toSessionEditor(session));
      setSessionEditor(session);
      await loadWorkouts();
    } catch (startError) {
      setError(getErrorMessage(startError));
    } finally {
      setProcessingId(null);
    }
  }
  async function openSession(sessionId: string) {
    setProcessingId(sessionId);
    try {
      const session = await workoutsApi.getSession(sessionId);
      setSessionExercises(toSessionEditor(session));
      setSessionEditor(session);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setProcessingId(null);
    }
  }
  async function saveSession() {
    if (!sessionEditor) return;
    const requestExercises = toSessionRequestExercises(sessionExercises);
    if (requestExercises === null) {
      setError(
        "Cada exercício precisa de nome e ao menos uma série com valores válidos.",
      );
      return;
    }
    setProcessingId("session-editor");
    try {
      const session = await workoutsApi.updateSession(sessionEditor.id, {
        exercises: requestExercises,
      });
      setSessionEditor(session);
      setSessionExercises(toSessionEditor(session));
      await loadWorkouts();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setProcessingId(null);
    }
  }
  async function finishSession() {
    if (!sessionEditor) return;
    const requestExercises = toSessionRequestExercises(sessionExercises);
    if (requestExercises === null) {
      setError(
        "Cada exercício precisa de nome e ao menos uma série com valores válidos.",
      );
      return;
    }
    setProcessingId("session-editor");
    try {
      await workoutsApi.updateSession(sessionEditor.id, {
        exercises: requestExercises,
      });
      await workoutsApi.completeSession(sessionEditor.id);
      setSessionEditor(null);
      await loadWorkouts();
    } catch (completeError) {
      setError(getErrorMessage(completeError));
    } finally {
      setProcessingId(null);
    }
  }
  async function cancelSession(session: WorkoutSession) {
    setProcessingId(session.id);
    try {
      await workoutsApi.cancelSession(session.id);
      setSessionEditor(null);
      await loadWorkouts();
    } catch (cancelError) {
      setError(getErrorMessage(cancelError));
    } finally {
      setProcessingId(null);
    }
  }
  async function deleteSession(session: WorkoutSession) {
    setProcessingId(session.id);
    try {
      await workoutsApi.deleteSession(session.id);
      await loadWorkouts();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setProcessingId(null);
    }
  }
  async function openProgress(exercise: Exercise) {
    setProcessingId(exercise.id);
    try {
      setProgress(await workoutsApi.getExerciseProgress(exercise.id));
    } catch (progressError) {
      setError(getErrorMessage(progressError));
    } finally {
      setProcessingId(null);
    }
  }
  function requestConfirmation(confirmation: Confirmation) {
    setConfirmation(confirmation);
  }
  return (
    <div className="workouts-page">
      <main className="workouts-main">
        <section className="workouts-heading" aria-labelledby="workouts-title">
          <div>
            <p>FORÇA E EVOLUÇÃO</p>
            <h1 id="workouts-title">Treinos</h1>
            <span>Registre cada série e acompanhe sua progressão.</span>
          </div>
          <button
            className="workouts-create"
            disabled={processingId === "new-session"}
            onClick={() => void startFreeWorkout()}
            type="button"
          >
            <Plus aria-hidden="true" />
            Treino avulso
          </button>
        </section>

        {error ? (
          <div className="workouts-error" role="alert">
            <span>{error}</span>
            <button onClick={() => void loadWorkouts()} type="button">
              Tentar novamente
            </button>
          </div>
        ) : null}

        {isLoading ? (
          <section className="workouts-loading" aria-live="polite">
            CARREGANDO TREINOS
          </section>
        ) : (
          <>
            <section
              className="workouts-section"
              aria-labelledby="sheets-title"
            >
              <div className="workouts-section-heading">
                <div>
                  <p>FICHAS PRONTAS</p>
                  <h2 id="sheets-title">Começar treino</h2>
                </div>
                <button onClick={openCreateSheet} type="button">
                  Gerenciar fichas
                </button>
              </div>
              {sheets.length === 0 ? (
                <div className="workouts-empty compact">
                  <Zap aria-hidden="true" />
                  <p>Crie uma ficha para começar com um treino planejado.</p>
                  <button onClick={openCreateSheet} type="button">
                    Criar ficha
                  </button>
                </div>
              ) : (
                <div className="workout-sheet-grid">
                  {sheets.map((sheet) => (
                    <article className="workout-sheet-card" key={sheet.id}>
                      <span>FICHA</span>
                      <h3>{sheet.name}</h3>
                      <p>
                        {sheet.exercises.length} exercício
                        {sheet.exercises.length === 1 ? "" : "s"} ·{" "}
                        {sheet.exercises.reduce(
                          (total, item) => total + item.sets.length,
                          0,
                        )}{" "}
                        séries
                      </p>
                      <div>
                        <button
                          className="start-workout"
                          disabled={processingId === sheet.id}
                          onClick={() => void startFromSheet(sheet)}
                          type="button"
                        >
                          Iniciar
                        </button>
                        <button
                          onClick={() => openEditSheet(sheet)}
                          type="button"
                        >
                          Editar
                        </button>
                        <button
                          className="danger"
                          onClick={() =>
                            requestConfirmation({
                              confirmLabel: "Arquivar ficha",
                              description: `O histórico da ficha “${sheet.name}” será preservado.`,
                              onConfirm: () => archiveSheet(sheet),
                              title: "Arquivar ficha?",
                            })
                          }
                          type="button"
                        >
                          Arquivar
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section
              className="workouts-section"
              aria-labelledby="history-title"
            >
              <div className="workouts-section-heading">
                <div>
                  <p>REGISTROS RECENTES</p>
                  <h2 id="history-title">Histórico</h2>
                </div>
                <span>
                  {totalSessions} treino{totalSessions === 1 ? "" : "s"}
                </span>
              </div>
              {sessions.length === 0 ? (
                <div className="workouts-empty compact">
                  Nenhum treino registrado ainda.
                </div>
              ) : (
                <div className="workout-session-list">
                  {sessions.map((session) => (
                    <article key={session.id}>
                      <div>
                        <strong>{getSessionName(session, sheets)}</strong>
                        <span>
                          {formatDateTime(
                            session.completedAt ?? session.startedAt,
                          )}{" "}
                          · {session.exercises.length} exercício
                          {session.exercises.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      <span
                        className={`workout-status ${session.status.toLowerCase()}`}
                      >
                        {getSessionStatus(session.status)}
                      </span>
                      <div>
                        {session.status !== "Cancelled" ? (
                          <button
                            disabled={processingId === session.id}
                            onClick={() => void openSession(session.id)}
                            type="button"
                          >
                            {session.status === "Draft"
                              ? "Continuar"
                              : "Ver e editar"}
                          </button>
                        ) : null}
                        <button
                          className="danger"
                          disabled={processingId === session.id}
                          onClick={() =>
                            requestConfirmation({
                              confirmLabel: "Excluir treino",
                              description:
                                "O efeito deste registro em histórico, progresso e XP será revertido.",
                              onConfirm: () => deleteSession(session),
                              title: "Excluir treino?",
                            })
                          }
                          type="button"
                        >
                          Excluir
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              <div className="workouts-pagination">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  type="button"
                >
                  Anterior
                </button>
                <span>
                  Página {page} de {pageCount}
                </span>
                <button
                  disabled={page === pageCount}
                  onClick={() => setPage(page + 1)}
                  type="button"
                >
                  Próxima
                </button>
              </div>
            </section>

            <section
              className="workouts-section"
              aria-labelledby="catalog-title"
            >
              <div className="workouts-section-heading">
                <div>
                  <p>BASE DE MOVIMENTOS</p>
                  <h2 id="catalog-title">Exercícios</h2>
                </div>
                <button
                  className="workouts-create compact"
                  onClick={openCreateExercise}
                  type="button"
                >
                  <Plus aria-hidden="true" />
                  Novo exercício
                </button>
              </div>
              {exercises.length === 0 ? (
                <div className="workouts-empty compact">
                  Crie exercícios para montar fichas e acompanhar sua evolução.
                </div>
              ) : (
                <div className="exercise-catalog">
                  {exercises.map((exercise) => (
                    <article key={exercise.id}>
                      <div className="exercise-catalog-details">
                        <strong>{exercise.name}</strong>
                        <span>
                          {getMuscleGroupLabel(exercise.primaryMuscleGroup)}
                          {exercise.secondaryMuscleGroup
                            ? ` · ${getMuscleGroupLabel(exercise.secondaryMuscleGroup)}`
                            : ""}
                        </span>
                      </div>
                      <div>
                        <button
                          disabled={processingId === exercise.id}
                          onClick={() => void openProgress(exercise)}
                          type="button"
                        >
                          <Chart aria-hidden="true" />
                          Progresso
                        </button>
                        <button
                          onClick={() => openEditExercise(exercise)}
                          type="button"
                        >
                          Editar
                        </button>
                        <button
                          className="danger"
                          disabled={processingId === exercise.id}
                          onClick={() =>
                            requestConfirmation({
                              confirmLabel: "Arquivar exercício",
                              description: `Fichas e sessões existentes de “${exercise.name}” serão preservadas.`,
                              onConfirm: () => archiveExercise(exercise),
                              title: "Arquivar exercício?",
                            })
                          }
                          type="button"
                        >
                          Arquivar
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {exerciseEditor !== undefined ? (
        <ExerciseModal
          name={exerciseName}
          primaryMuscleGroup={primaryMuscleGroup}
          secondaryMuscleGroup={secondaryMuscleGroup}
          isSaving={processingId === "exercise-editor"}
          onCancel={() => setExerciseEditor(undefined)}
          onChange={setExerciseName}
          onChangePrimaryMuscleGroup={setPrimaryMuscleGroup}
          onChangeSecondaryMuscleGroup={setSecondaryMuscleGroup}
          onSave={() => void saveExercise()}
          title={exerciseEditor ? "Editar exercício" : "Novo exercício"}
        />
      ) : null}
      {sheetEditor !== undefined ? (
        <SheetModal
          exercises={exercises}
          isSaving={processingId === "sheet-editor"}
          name={sheetName}
          muscleGroups={sheetMuscleGroups}
          onCancel={() => {
            setSheetEditor(undefined);
            setSheetName("");
            setSheetMuscleGroups([]);
          }}
          onChangeExercises={setSheetExercises}
          onChangeName={setSheetName}
          onChangeMuscleGroups={setSheetMuscleGroups}
          onSave={() => void saveSheet()}
          sheetExercises={sheetExercises}
          title={sheetEditor ? "Editar ficha" : "Nova ficha"}
        />
      ) : null}
      {sessionEditor ? (
        <SessionModal
          exercises={exercises}
          isSaving={processingId === "session-editor"}
          onCancel={() => setSessionEditor(null)}
          onCancelSession={() =>
            requestConfirmation({
              confirmLabel: "Cancelar treino",
              description:
                "Este treino não contará no histórico, progresso ou XP.",
              onConfirm: () => cancelSession(sessionEditor),
              title: "Cancelar treino?",
            })
          }
          onChange={setSessionExercises}
          onComplete={() => void finishSession()}
          onSave={() => void saveSession()}
          preferredWeightUnit={preferredWeightUnit}
          session={sessionEditor}
          sessionExercises={sessionExercises}
        />
      ) : null}
      {progress ? (
        <ProgressModal progress={progress} onClose={() => setProgress(null)} />
      ) : null}
      {confirmation ? (
        <ConfirmationModal
          confirmation={confirmation}
          onCancel={() => setConfirmation(null)}
        />
      ) : null}
    </div>
  );
}
function ExerciseModal({
  isSaving,
  name,
  onCancel,
  onChange,
  onSave,
  primaryMuscleGroup,
  secondaryMuscleGroup,
  onChangePrimaryMuscleGroup,
  onChangeSecondaryMuscleGroup,
  title,
}: Readonly<{
  isSaving: boolean;
  name: string;
  onCancel: () => void;
  onChange: (name: string) => void;
  onSave: () => void;
  primaryMuscleGroup: MuscleGroup | "";
  secondaryMuscleGroup: MuscleGroup | "";
  onChangePrimaryMuscleGroup: (value: MuscleGroup | "") => void;
  onChangeSecondaryMuscleGroup: (value: MuscleGroup | "") => void;
  title: string;
}>) {
  return (
    <Modal onClose={onCancel} title={title}>
      <div className="workout-form">
        <label>
          <span>Nome do exercício</span>
          <input
            autoFocus
            onChange={(event) => onChange(event.target.value)}
            value={name}
          />
        </label>
        <label>
          <span>Grupo muscular primário</span>
          <select
            onChange={(event) =>
              onChangePrimaryMuscleGroup(event.target.value as MuscleGroup | "")
            }
            value={primaryMuscleGroup}
          >
            <option value="">Selecione</option>
            {muscleGroups.map((group) => (
              <option key={group.value} value={group.value}>
                {group.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Grupo muscular secundário</span>
          <select
            onChange={(event) =>
              onChangeSecondaryMuscleGroup(
                event.target.value as MuscleGroup | "",
              )
            }
            value={secondaryMuscleGroup}
          >
            <option value="">Nenhum</option>
            {muscleGroups
              .filter((group) => group.value !== primaryMuscleGroup)
              .map((group) => (
                <option key={group.value} value={group.value}>
                  {group.label}
                </option>
              ))}
          </select>
        </label>
        <ModalActions
          isSaving={isSaving}
          label="Salvar exercício"
          onCancel={onCancel}
          onSave={onSave}
        />
      </div>
    </Modal>
  );
}
function SheetModal({
  exercises,
  isSaving,
  muscleGroups: selectedMuscleGroups,
  name,
  onCancel,
  onChangeExercises,
  onChangeMuscleGroups,
  onChangeName,
  onSave,
  sheetExercises,
  title,
}: Readonly<{
  exercises: Exercise[];
  isSaving: boolean;
  muscleGroups: MuscleGroup[];
  name: string;
  onCancel: () => void;
  onChangeExercises: (items: SheetExerciseEditor[]) => void;
  onChangeMuscleGroups: (groups: MuscleGroup[]) => void;
  onChangeName: (name: string) => void;
  onSave: () => void;
  sheetExercises: SheetExerciseEditor[];
  title: string;
}>) {
  function updateExercise(index: number, next: SheetExerciseEditor) {
    onChangeExercises(
      sheetExercises.map((item, itemIndex) =>
        itemIndex === index ? next : item,
      ),
    );
  }
  function toggleMuscleGroup(group: MuscleGroup) {
    if (selectedMuscleGroups.includes(group)) {
      onChangeMuscleGroups(
        selectedMuscleGroups.filter((item) => item !== group),
      );
    } else if (selectedMuscleGroups.length < 2) {
      onChangeMuscleGroups([...selectedMuscleGroups, group]);
    }
  }
  const filteredExercises = exercises.filter(
    (exercise) =>
      selectedMuscleGroups.length === 0 ||
      selectedMuscleGroups.includes(exercise.primaryMuscleGroup) ||
      selectedMuscleGroups.includes(exercise.secondaryMuscleGroup ?? "Other"),
  );
  return (
    <Modal onClose={onCancel} title={title}>
      <div className="workout-form">
        <label>
          <span>Nome da ficha</span>
          <input
            autoFocus
            onChange={(event) => onChangeName(event.target.value)}
            value={name}
          />
        </label>
        <fieldset className="workout-muscle-groups">
          <legend>Grupos musculares da ficha</legend>
          <span>Opcional. Selecione até dois para filtrar os exercícios.</span>
          <div>
            {muscleGroups.map((group) => (
              <button
                className={
                  selectedMuscleGroups.includes(group.value) ? "selected" : ""
                }
                disabled={
                  !selectedMuscleGroups.includes(group.value) &&
                  selectedMuscleGroups.length === 2
                }
                key={group.value}
                onClick={() => toggleMuscleGroup(group.value)}
                type="button"
              >
                {group.label}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="workout-builder">
          <span>EXERCÍCIOS E SÉRIES</span>
          {sheetExercises.map((item, index) => (
            <div
              className="sheet-exercise-editor"
              key={`${item.exerciseId}-${index}`}
            >
              <select
                onChange={(event) =>
                  updateExercise(index, {
                    ...item,
                    exerciseId: event.target.value,
                  })
                }
                value={item.exerciseId}
              >
                <option value="">Selecione</option>
                {filteredExercises
                  .filter(
                    (exercise) =>
                      exercise.id === item.exerciseId ||
                      (!sheetExercises.some(
                        (other, otherIndex) =>
                          otherIndex !== index &&
                          other.exerciseId === exercise.id,
                      ) &&
                        (selectedMuscleGroups.length === 0 ||
                          selectedMuscleGroups.includes(
                            exercise.primaryMuscleGroup,
                          ) ||
                          selectedMuscleGroups.includes(
                            exercise.secondaryMuscleGroup ?? "Other",
                          ))),
                  )
                  .map((exercise) => (
                    <option key={exercise.id} value={exercise.id}>
                      {exercise.name}
                    </option>
                  ))}
              </select>
              <div className="set-targets">
                {item.sets.map((repetitions, setIndex) => (
                  <label key={setIndex}>
                    <span>{setIndex + 1}ª série</span>
                    <input
                      min="1"
                      onChange={(event) =>
                        updateExercise(index, {
                          ...item,
                          sets: item.sets.map((value, valueIndex) =>
                            valueIndex === setIndex
                              ? event.target.value
                              : value,
                          ),
                        })
                      }
                      type="number"
                      value={repetitions}
                    />
                  </label>
                ))}
                <button
                  onClick={() =>
                    updateExercise(index, {
                      ...item,
                      sets: [...item.sets, "10"],
                    })
                  }
                  type="button"
                >
                  + série
                </button>
              </div>
              <div className="editor-links">
                <button
                  disabled={item.sets.length === 1}
                  onClick={() =>
                    updateExercise(index, {
                      ...item,
                      sets: item.sets.slice(0, -1),
                    })
                  }
                  type="button"
                >
                  Remover série
                </button>
                <button
                  className="danger"
                  onClick={() =>
                    onChangeExercises(
                      sheetExercises.filter(
                        (_, itemIndex) => itemIndex !== index,
                      ),
                    )
                  }
                  type="button"
                >
                  Remover exercício
                </button>
              </div>
            </div>
          ))}
          <button
            className="workout-add"
            disabled={filteredExercises.length <= sheetExercises.length}
            onClick={() => {
              onChangeExercises([
                ...sheetExercises,
                { exerciseId: "", sets: ["10"] },
              ]);
            }}
            type="button"
          >
            <Plus aria-hidden="true" />
            Adicionar exercício
          </button>
        </div>
        <ModalActions
          isSaving={isSaving}
          label="Salvar ficha"
          onCancel={onCancel}
          onSave={onSave}
        />
      </div>
    </Modal>
  );
}
function SessionModal({
  exercises,
  isSaving,
  onCancel,
  onCancelSession,
  onChange,
  onComplete,
  onSave,
  preferredWeightUnit,
  session,
  sessionExercises,
}: Readonly<{
  exercises: Exercise[];
  isSaving: boolean;
  onCancel: () => void;
  onCancelSession: () => void;
  onChange: (items: SessionExerciseEditor[]) => void;
  onComplete: () => void;
  onSave: () => void;
  preferredWeightUnit: WeightUnit;
  session: WorkoutSession;
  sessionExercises: SessionExerciseEditor[];
}>) {
  const isCompleted = session.status === "Completed";
  function updateExercise(index: number, next: SessionExerciseEditor) {
    onChange(
      sessionExercises.map((item, itemIndex) =>
        itemIndex === index ? next : item,
      ),
    );
  }
  return (
    <Modal
      onClose={onCancel}
      title={isCompleted ? "Editar treino concluído" : "Treino em andamento"}
    >
      <div className="workout-form session-form">
        <p className="workout-form-note">
          Registre o realizado em cada série. Carga e unidade são opcionais, mas
          devem ser preenchidas juntas.
        </p>
        <div className="session-exercises">
          {sessionExercises.map((item, index) => (
            <div
              className="session-exercise-editor"
              key={`${item.exerciseId}-${item.exerciseName}-${index}`}
            >
              <div className="session-exercise-heading">
                <strong>EXERCÍCIO {index + 1}</strong>
                <button
                  className="danger"
                  disabled={sessionExercises.length === 1}
                  onClick={() =>
                    onChange(
                      sessionExercises.filter(
                        (_, itemIndex) => itemIndex !== index,
                      ),
                    )
                  }
                  type="button"
                >
                  Remover
                </button>
              </div>
              <select
                onChange={(event) => {
                  const exercise = exercises.find(
                    (value) => value.id === event.target.value,
                  );
                  updateExercise(index, {
                    ...item,
                    exerciseId: exercise?.id ?? "",
                    exerciseName: exercise?.name ?? item.exerciseName,
                  });
                }}
                value={item.exerciseId}
              >
                {item.exerciseId ? null : (
                  <option value="">Exercício livre</option>
                )}
                {exercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </option>
                ))}
              </select>
              {!item.exerciseId ? (
                <label>
                  <span>Nome do exercício</span>
                  <input
                    onChange={(event) =>
                      updateExercise(index, {
                        ...item,
                        exerciseName: event.target.value,
                      })
                    }
                    value={item.exerciseName}
                  />
                </label>
              ) : null}
              <div className="session-sets">
                {item.sets.map((set, setIndex) => (
                  <div className="session-set" key={setIndex}>
                    <strong>{setIndex + 1}</strong>
                    <label>
                      <span>Carga</span>
                      <input
                        inputMode="decimal"
                        onChange={(event) =>
                          updateExercise(index, {
                            ...item,
                            sets: item.sets.map((value, valueIndex) =>
                              valueIndex === setIndex
                                ? {
                                    ...value,
                                    weight: event.target.value,
                                  }
                                : value,
                            ),
                          })
                        }
                        value={set.weight}
                      />
                    </label>
                    <label>
                      <span>Unidade</span>
                      <select
                        onChange={(event) =>
                          updateExercise(index, {
                            ...item,
                            sets: item.sets.map((value, valueIndex) =>
                              valueIndex === setIndex
                                ? {
                                    ...value,
                                    weightUnit: event.target
                                      .value as WeightUnit,
                                  }
                                : value,
                            ),
                          })
                        }
                        value={set.weightUnit}
                      >
                        <option value="Kilograms">kg</option>
                        <option value="Pounds">lb</option>
                      </select>
                    </label>
                    <label>
                      <span>Repetições</span>
                      <input
                        min="1"
                        onChange={(event) =>
                          updateExercise(index, {
                            ...item,
                            sets: item.sets.map((value, valueIndex) =>
                              valueIndex === setIndex
                                ? {
                                    ...value,
                                    repetitions: event.target.value,
                                  }
                                : value,
                            ),
                          })
                        }
                        type="number"
                        value={set.repetitions}
                      />
                    </label>
                    <button
                      aria-label="Remover série"
                      disabled={item.sets.length === 1}
                      onClick={() =>
                        updateExercise(index, {
                          ...item,
                          sets: item.sets.filter(
                            (_, valueIndex) => valueIndex !== setIndex,
                          ),
                        })
                      }
                      type="button"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button
                className="workout-add small"
                onClick={() =>
                  updateExercise(index, {
                    ...item,
                    sets: [
                      ...item.sets,
                      {
                        repetitions: "",
                        weight: "",
                        weightUnit: preferredWeightUnit,
                      },
                    ],
                  })
                }
                type="button"
              >
                + série
              </button>
            </div>
          ))}
          <button
            className="workout-add"
            onClick={() =>
              onChange([
                ...sessionExercises,
                {
                  exerciseId: "",
                  exerciseName: "",
                  sets: [
                    {
                      repetitions: "",
                      weight: "",
                      weightUnit: preferredWeightUnit,
                    },
                  ],
                },
              ])
            }
            type="button"
          >
            <Plus aria-hidden="true" />
            Adicionar exercício
          </button>
        </div>
        <div className="workout-modal-actions">
          <button
            className="danger"
            disabled={isSaving || isCompleted}
            onClick={onCancelSession}
            type="button"
          >
            Cancelar treino
          </button>
          <button onClick={onCancel} type="button">
            Fechar
          </button>
          <button disabled={isSaving} onClick={onSave} type="button">
            {isSaving ? "Salvando..." : "Salvar"}
          </button>
          {!isCompleted ? (
            <button
              className="primary"
              disabled={isSaving}
              onClick={onComplete}
              type="button"
            >
              <Check aria-hidden="true" />
              Concluir treino
            </button>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
function ProgressModal({
  onClose,
  progress,
}: Readonly<{
  onClose: () => void;
  progress: ExerciseProgress;
}>) {
  return (
    <Modal onClose={onClose} title={`Progressão: ${progress.exerciseName}`}>
      <div className="workout-form">
        <p className="workout-form-note">
          Cargas em kg e lb são apresentadas separadamente.
        </p>
        {progress.items.length === 0 ? (
          <div className="workouts-empty compact">
            Ainda não há séries concluídas com carga para este exercício.
          </div>
        ) : (
          <div className="progress-list">
            {progress.items.map((item) => (
              <article key={`${item.sessionId}-${item.weightUnit}`}>
                <span>
                  {formatDateTime(item.completedAt)} ·{" "}
                  {item.weightUnit === "Kilograms" ? "kg" : "lb"}
                </span>
                <div>
                  <strong>
                    {formatNumber(item.maxWeight)}{" "}
                    {item.weightUnit === "Kilograms" ? "kg" : "lb"}
                  </strong>
                  <small>carga máxima</small>
                </div>
                <div>
                  <strong>
                    {formatNumber(item.bestSetWeight)} ×{" "}
                    {item.bestSetRepetitions}
                  </strong>
                  <small>melhor série</small>
                </div>
                <div>
                  <strong>{formatNumber(item.totalVolume)}</strong>
                  <small>volume total</small>
                </div>
              </article>
            ))}
          </div>
        )}
        <ModalActions
          isSaving={false}
          label="Fechar"
          onCancel={onClose}
          onSave={onClose}
        />
      </div>
    </Modal>
  );
}
function Modal({
  children,
  onClose,
  title,
}: Readonly<{
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}>) {
  return (
    <div className="workout-modal-backdrop" role="presentation">
      <section
        aria-labelledby="workout-modal-title"
        aria-modal="true"
        className="workout-modal"
        role="dialog"
      >
        <header>
          <span id="workout-modal-title">{title.toUpperCase()}</span>
          <button aria-label="Fechar" onClick={onClose} type="button">
            ×
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
function ModalActions({
  isSaving,
  label,
  onCancel,
  onSave,
}: Readonly<{
  isSaving: boolean;
  label: string;
  onCancel: () => void;
  onSave: () => void;
}>) {
  return (
    <div className="workout-modal-actions">
      <button onClick={onCancel} type="button">
        Cancelar
      </button>
      <button
        className="primary"
        disabled={isSaving}
        onClick={onSave}
        type="button"
      >
        {isSaving ? "Salvando..." : label}
      </button>
    </div>
  );
}
function createSheetExercise(exerciseId: string): SheetExerciseEditor {
  return {
    exerciseId,
    sets: ["10"],
  };
}
function toSheetRequestExercises(
  items: SheetExerciseEditor[],
): WorkoutSheetExerciseRequest[] | null {
  if (
    items.length === 0 ||
    items.some((item) => !item.exerciseId || item.sets.length === 0)
  )
    return null;
  const values = items.map((item) => ({
    exerciseId: item.exerciseId,
    sets: item.sets.map((repetitions) => ({
      targetRepetitions: Number(repetitions),
    })),
  }));
  return values.some((item) =>
    item.sets.some(
      (set) =>
        !Number.isInteger(set.targetRepetitions) || set.targetRepetitions < 1,
    ),
  )
    ? null
    : values;
}
function toSessionEditor(session: WorkoutSession): SessionExerciseEditor[] {
  return session.exercises.map((exercise) => ({
    exerciseId: exercise.exerciseId ?? "",
    exerciseName: exercise.exerciseName,
    sets: exercise.sets.map((set) => ({
      repetitions: set.repetitions === null ? "" : String(set.repetitions),
      weight: set.weight === null ? "" : String(set.weight),
      weightUnit: set.weightUnit ?? "Kilograms",
    })),
  }));
}
function toSessionRequestExercises(
  items: SessionExerciseEditor[],
): WorkoutSessionExerciseRequest[] | null {
  if (items.length === 0) return null;
  const values = items.map((item) => ({
    exerciseId: item.exerciseId || null,
    exerciseName: item.exerciseId ? null : item.exerciseName.trim() || null,
    sets: item.sets.map((set) => ({
      repetitions: set.repetitions ? Number(set.repetitions) : null,
      weight: set.weight ? Number(set.weight.replace(",", ".")) : null,
      weightUnit: set.weight ? set.weightUnit : null,
    })),
  }));
  if (
    values.some(
      (item) =>
        (!item.exerciseId && !item.exerciseName) ||
        item.sets.length === 0 ||
        item.sets.some(
          (set) =>
            (set.weight === null) !== (set.weightUnit === null) ||
            (set.weight !== null &&
              (!Number.isFinite(set.weight) || set.weight <= 0)) ||
            (set.repetitions !== null &&
              (!Number.isInteger(set.repetitions) || set.repetitions < 1)),
        ),
    )
  )
    return null;
  return values;
}
function getSessionName(
  session: WorkoutSession,
  sheets: WorkoutSheet[],
): string {
  return (
    sheets.find((sheet) => sheet.id === session.workoutSheetId)?.name ??
    session.exercises[0]?.exerciseName ??
    "Treino livre"
  );
}
function getSessionStatus(status: WorkoutSession["status"]): string {
  return {
    Cancelled: "Cancelado",
    Completed: "Concluído",
    Draft: "Rascunho",
  }[status];
}
function getMuscleGroupLabel(group: MuscleGroup): string {
  return muscleGroups.find((item) => item.value === group)?.label ?? "Outros";
}
function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}
function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
  }).format(value);
}
function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Não foi possível concluir esta ação.";
}

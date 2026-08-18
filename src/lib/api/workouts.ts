import { apiRequest } from "./client";
import type {
  Exercise,
  ExerciseProgress,
  ExerciseRequest,
  Id,
  PagedResponse,
  StartWorkoutSessionRequest,
  UpdateWorkoutSessionRequest,
  WorkoutSession,
  WorkoutSessionQuery,
  WorkoutSheet,
  WorkoutSheetRequest,
} from "./contracts";

export const workoutsApi = {
  getExercises: (includeArchived = false, signal?: AbortSignal) =>
    apiRequest<Exercise[]>("workouts/exercises", { query: { includeArchived }, signal }),
  createExercise: (request: ExerciseRequest, signal?: AbortSignal) =>
    apiRequest<Exercise>("workouts/exercises", { method: "POST", body: request, signal }),
  updateExercise: (exerciseId: Id, request: ExerciseRequest, signal?: AbortSignal) =>
    apiRequest<Exercise>(`workouts/exercises/${exerciseId}`, { method: "PUT", body: request, signal }),
  archiveExercise: (exerciseId: Id, signal?: AbortSignal) =>
    apiRequest<void>(`workouts/exercises/${exerciseId}`, { method: "DELETE", signal }),
  getSheets: (includeArchived = false, signal?: AbortSignal) =>
    apiRequest<WorkoutSheet[]>("workouts/sheets", { query: { includeArchived }, signal }),
  createSheet: (request: WorkoutSheetRequest, signal?: AbortSignal) =>
    apiRequest<WorkoutSheet>("workouts/sheets", { method: "POST", body: request, signal }),
  getSheet: (sheetId: Id, signal?: AbortSignal) => apiRequest<WorkoutSheet>(`workouts/sheets/${sheetId}`, { signal }),
  updateSheet: (sheetId: Id, request: WorkoutSheetRequest, signal?: AbortSignal) =>
    apiRequest<WorkoutSheet>(`workouts/sheets/${sheetId}`, { method: "PUT", body: request, signal }),
  archiveSheet: (sheetId: Id, signal?: AbortSignal) =>
    apiRequest<void>(`workouts/sheets/${sheetId}`, { method: "DELETE", signal }),
  getSessions: (query: WorkoutSessionQuery = {}, signal?: AbortSignal) =>
    apiRequest<PagedResponse<WorkoutSession>>("workouts/sessions", { query, signal }),
  startSession: (request: StartWorkoutSessionRequest, signal?: AbortSignal) =>
    apiRequest<WorkoutSession>("workouts/sessions", { method: "POST", body: request, signal }),
  getSession: (sessionId: Id, signal?: AbortSignal) =>
    apiRequest<WorkoutSession>(`workouts/sessions/${sessionId}`, { signal }),
  updateSession: (sessionId: Id, request: UpdateWorkoutSessionRequest, signal?: AbortSignal) =>
    apiRequest<WorkoutSession>(`workouts/sessions/${sessionId}`, { method: "PUT", body: request, signal }),
  completeSession: (sessionId: Id, signal?: AbortSignal) =>
    apiRequest<WorkoutSession>(`workouts/sessions/${sessionId}/complete`, { method: "POST", signal }),
  cancelSession: (sessionId: Id, signal?: AbortSignal) =>
    apiRequest<void>(`workouts/sessions/${sessionId}/cancel`, { method: "POST", signal }),
  deleteSession: (sessionId: Id, signal?: AbortSignal) =>
    apiRequest<void>(`workouts/sessions/${sessionId}`, { method: "DELETE", signal }),
  getExerciseProgress: (exerciseId: Id, signal?: AbortSignal) =>
    apiRequest<ExerciseProgress>(`workouts/progress/exercises/${exerciseId}`, { signal }),
};

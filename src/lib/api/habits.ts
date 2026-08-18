import { apiRequest } from "./client";
import type {
  BusinessDate,
  Habit,
  HabitCompletion,
  HabitProgress,
  HabitQuery,
  HabitReminder,
  HabitRequest,
  Id,
  PagedResponse,
} from "./contracts";

export const habitsApi = {
  getAll: (query: HabitQuery = {}, signal?: AbortSignal) =>
    apiRequest<PagedResponse<Habit>>("habits", { query, signal }),
  create: (request: HabitRequest, signal?: AbortSignal) =>
    apiRequest<Habit>("habits", { method: "POST", body: request, signal }),
  get: (habitId: Id, signal?: AbortSignal) => apiRequest<Habit>(`habits/${habitId}`, { signal }),
  update: (habitId: Id, request: HabitRequest, signal?: AbortSignal) =>
    apiRequest<Habit>(`habits/${habitId}`, { method: "PUT", body: request, signal }),
  pause: (habitId: Id, signal?: AbortSignal) =>
    apiRequest<void>(`habits/${habitId}/pause`, { method: "POST", signal }),
  resume: (habitId: Id, signal?: AbortSignal) =>
    apiRequest<void>(`habits/${habitId}/resume`, { method: "POST", signal }),
  archive: (habitId: Id, signal?: AbortSignal) =>
    apiRequest<void>(`habits/${habitId}`, { method: "DELETE", signal }),
  getCompletions: (habitId: Id, from: BusinessDate, to: BusinessDate, signal?: AbortSignal) =>
    apiRequest<HabitCompletion[]>(`habits/${habitId}/completions`, { query: { from, to }, signal }),
  createCompletion: (habitId: Id, completedOn: BusinessDate, signal?: AbortSignal) =>
    apiRequest<HabitCompletion>(`habits/${habitId}/completions`, {
      method: "POST",
      body: { completedOn },
      signal,
    }),
  deleteCompletion: (habitId: Id, completionId: Id, signal?: AbortSignal) =>
    apiRequest<void>(`habits/${habitId}/completions/${completionId}`, { method: "DELETE", signal }),
  getProgress: (habitId: Id, date: BusinessDate, signal?: AbortSignal) =>
    apiRequest<HabitProgress>(`habits/${habitId}/progress`, { query: { date }, signal }),
  getPending: (date: BusinessDate, signal?: AbortSignal) =>
    apiRequest<HabitProgress[]>("habits/pending", { query: { date }, signal }),
  getReminders: (date: BusinessDate, signal?: AbortSignal) =>
    apiRequest<HabitReminder[]>("habits/reminders", { query: { date }, signal }),
};

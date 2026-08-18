import { apiRequest } from "./client";
import type {
  Badge,
  BadgeRequest,
  GamificationProfile,
  Goal,
  GoalQuery,
  GoalRequest,
  Id,
  IsoDateTime,
  LevelProgressionRule,
  PagedResponse,
  XpEventType,
  XpLedgerEntry,
  XpRule,
} from "./contracts";

export const gamificationApi = {
  getProfile: (signal?: AbortSignal) => apiRequest<GamificationProfile>("gamification/profile", { signal }),
  getLedger: (
    query: { page?: number; pageSize?: number; eventType?: XpEventType; from?: IsoDateTime; to?: IsoDateTime } = {},
    signal?: AbortSignal,
  ) => apiRequest<PagedResponse<XpLedgerEntry>>("gamification/ledger", { query, signal }),
  getGoals: (query: GoalQuery = {}, signal?: AbortSignal) =>
    apiRequest<PagedResponse<Goal>>("gamification/goals", { query, signal }),
  createGoal: (request: GoalRequest, signal?: AbortSignal) =>
    apiRequest<Goal>("gamification/goals", { method: "POST", body: request, signal }),
  getGoal: (goalId: Id, signal?: AbortSignal) => apiRequest<Goal>(`gamification/goals/${goalId}`, { signal }),
  updateGoal: (goalId: Id, request: GoalRequest, signal?: AbortSignal) =>
    apiRequest<Goal>(`gamification/goals/${goalId}`, { method: "PUT", body: request, signal }),
  updateGoalProgress: (goalId: Id, progress: number, signal?: AbortSignal) =>
    apiRequest<Goal>(`gamification/goals/${goalId}/progress`, { method: "PUT", body: { progress }, signal }),
  cancelGoal: (goalId: Id, signal?: AbortSignal) =>
    apiRequest<void>(`gamification/goals/${goalId}/cancel`, { method: "POST", signal }),
  archiveGoal: (goalId: Id, signal?: AbortSignal) =>
    apiRequest<void>(`gamification/goals/${goalId}`, { method: "DELETE", signal }),
  getXpRules: (signal?: AbortSignal) => apiRequest<XpRule[]>("gamification/xp-rules", { signal }),
  updateXpRules: (request: XpRule[], signal?: AbortSignal) =>
    apiRequest<XpRule[]>("gamification/xp-rules", { method: "PUT", body: request, signal }),
  getLevelProgression: (signal?: AbortSignal) =>
    apiRequest<LevelProgressionRule>("gamification/level-progression", { signal }),
  updateLevelProgression: (request: LevelProgressionRule, signal?: AbortSignal) =>
    apiRequest<LevelProgressionRule>("gamification/level-progression", { method: "PUT", body: request, signal }),
  getBadges: (includeArchived = false, signal?: AbortSignal) =>
    apiRequest<Badge[]>("gamification/badges", { query: { includeArchived }, signal }),
  createBadge: (request: BadgeRequest, signal?: AbortSignal) =>
    apiRequest<Badge>("gamification/badges", { method: "POST", body: request, signal }),
  updateBadge: (badgeId: Id, request: BadgeRequest, signal?: AbortSignal) =>
    apiRequest<Badge>(`gamification/badges/${badgeId}`, { method: "PUT", body: request, signal }),
  archiveBadge: (badgeId: Id, signal?: AbortSignal) =>
    apiRequest<void>(`gamification/badges/${badgeId}`, { method: "DELETE", signal }),
};

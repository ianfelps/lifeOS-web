import { apiRequest } from "./client";
import type { ChangePasswordRequest, RevokedSessionsResponse, UserPreference } from "./contracts";

export const usersApi = {
  getPreferences: (signal?: AbortSignal) =>
    apiRequest<UserPreference>("users/me/preferences", { signal }),
  updatePreferences: (request: UserPreference, signal?: AbortSignal) =>
    apiRequest<UserPreference>("users/me/preferences", { method: "PUT", body: request, signal }),
  changePassword: (request: ChangePasswordRequest, signal?: AbortSignal) =>
    apiRequest<void>("users/me/password", { method: "PUT", body: request, signal }),
  revokeOtherSessions: (signal?: AbortSignal) =>
    apiRequest<RevokedSessionsResponse>("users/me/sessions/others", { method: "DELETE", signal }),
};

import { apiRequest } from "./client";
import type {
  ChangePasswordRequest,
  RevokedSessionsResponse,
  UpdateUserIdentityRequest,
  User,
  UserPreference,
} from "./contracts";

export const usersApi = {
  updateIdentity: (request: UpdateUserIdentityRequest, signal?: AbortSignal) =>
    apiRequest<User>("users/me/identity", { method: "PUT", body: request, signal }),
  getPreferences: (signal?: AbortSignal) =>
    apiRequest<UserPreference>("users/me/preferences", { signal }),
  updatePreferences: (request: UserPreference, signal?: AbortSignal) =>
    apiRequest<UserPreference>("users/me/preferences", { method: "PUT", body: request, signal }),
  changePassword: (request: ChangePasswordRequest, signal?: AbortSignal) =>
    apiRequest<void>("users/me/password", { method: "PUT", body: request, signal }),
  revokeOtherSessions: (signal?: AbortSignal) =>
    apiRequest<RevokedSessionsResponse>("users/me/sessions/others", { method: "DELETE", signal }),
};

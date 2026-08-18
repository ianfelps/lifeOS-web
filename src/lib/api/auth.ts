import { apiRequest } from "./client";
import type { LoginRequest, PublicAuthResponse, User } from "./contracts";

export const authApi = {
  login: (request: LoginRequest, signal?: AbortSignal) =>
    apiRequest<PublicAuthResponse>("auth/login", { method: "POST", body: request, signal }),
  logout: (signal?: AbortSignal) =>
    apiRequest<void>("auth/logout", { method: "POST", signal }),
  me: (signal?: AbortSignal) => apiRequest<User>("auth/me", { signal }),
};

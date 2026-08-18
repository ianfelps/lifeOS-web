import { apiRequest } from "./client";
import type { Dashboard } from "./contracts";

export const dashboardApi = {
  get: (signal?: AbortSignal) => apiRequest<Dashboard>("dashboard", { signal }),
};

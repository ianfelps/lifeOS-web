import { apiRequest } from "./client";
import type { AuditAction, AuditLog, IsoDateTime, PagedResponse } from "./contracts";

export const operationsApi = {
  getAuditLogs: (
    query: {
      page?: number;
      pageSize?: number;
      action?: AuditAction;
      resourceType?: string;
      createdFrom?: IsoDateTime;
      createdTo?: IsoDateTime;
    } = {},
    signal?: AbortSignal,
  ) => apiRequest<PagedResponse<AuditLog>>("operations/audit-logs", { query, signal }),
};

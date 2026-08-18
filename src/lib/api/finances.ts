import { apiRequest } from "./client";
import type {
  Budget,
  BudgetRequest,
  BusinessDate,
  CategorySpending,
  FinancialCategory,
  FinancialCategoryRequest,
  Id,
  InstallmentPurchase,
  InstallmentPurchaseRequest,
  MonthlySummary,
  PagedResponse,
  Recurrence,
  RecurrenceRequest,
  Transaction,
  TransactionQuery,
  TransactionRequest,
} from "./contracts";

export const financesApi = {
  getCategories: (includeArchived = false, signal?: AbortSignal) =>
    apiRequest<FinancialCategory[]>("finances/categories", { query: { includeArchived }, signal }),
  createCategory: (request: FinancialCategoryRequest, signal?: AbortSignal) =>
    apiRequest<FinancialCategory>("finances/categories", { method: "POST", body: request, signal }),
  updateCategory: (categoryId: Id, request: FinancialCategoryRequest, signal?: AbortSignal) =>
    apiRequest<FinancialCategory>(`finances/categories/${categoryId}`, { method: "PUT", body: request, signal }),
  archiveCategory: (categoryId: Id, signal?: AbortSignal) =>
    apiRequest<void>(`finances/categories/${categoryId}`, { method: "DELETE", signal }),
  getBudget: (categoryId: Id, month: BusinessDate, signal?: AbortSignal) =>
    apiRequest<Budget | null>(`finances/categories/${categoryId}/budget`, { query: { month }, signal }),
  setBudget: (categoryId: Id, request: BudgetRequest, signal?: AbortSignal) =>
    apiRequest<Budget>(`finances/categories/${categoryId}/budget`, { method: "PUT", body: request, signal }),
  setBudgetOverride: (categoryId: Id, month: BusinessDate, request: BudgetRequest, signal?: AbortSignal) =>
    apiRequest<Budget>(`finances/categories/${categoryId}/budget-overrides/${month}`, {
      method: "PUT",
      body: request,
      signal,
    }),
  deleteBudgetOverride: (categoryId: Id, month: BusinessDate, signal?: AbortSignal) =>
    apiRequest<void>(`finances/categories/${categoryId}/budget-overrides/${month}`, { method: "DELETE", signal }),
  getTransactions: (query: TransactionQuery = {}, signal?: AbortSignal) =>
    apiRequest<PagedResponse<Transaction>>("finances/transactions", { query, signal }),
  createTransaction: (request: TransactionRequest, signal?: AbortSignal) =>
    apiRequest<Transaction>("finances/transactions", { method: "POST", body: request, signal }),
  updateTransaction: (transactionId: Id, request: TransactionRequest, signal?: AbortSignal) =>
    apiRequest<Transaction>(`finances/transactions/${transactionId}`, { method: "PUT", body: request, signal }),
  confirmTransaction: (transactionId: Id, signal?: AbortSignal) =>
    apiRequest<Transaction>(`finances/transactions/${transactionId}/confirm`, { method: "POST", signal }),
  deleteTransaction: (transactionId: Id, signal?: AbortSignal) =>
    apiRequest<void>(`finances/transactions/${transactionId}`, { method: "DELETE", signal }),
  getRecurrences: (signal?: AbortSignal) => apiRequest<Recurrence[]>("finances/recurrences", { signal }),
  createRecurrence: (request: RecurrenceRequest, signal?: AbortSignal) =>
    apiRequest<Recurrence>("finances/recurrences", { method: "POST", body: request, signal }),
  updateRecurrence: (recurrenceId: Id, request: RecurrenceRequest, signal?: AbortSignal) =>
    apiRequest<Recurrence>(`finances/recurrences/${recurrenceId}`, { method: "PUT", body: request, signal }),
  endRecurrence: (recurrenceId: Id, signal?: AbortSignal) =>
    apiRequest<void>(`finances/recurrences/${recurrenceId}/end`, { method: "POST", signal }),
  createInstallmentPurchase: (request: InstallmentPurchaseRequest, signal?: AbortSignal) =>
    apiRequest<InstallmentPurchase>("finances/installment-purchases", { method: "POST", body: request, signal }),
  getInstallmentPurchase: (purchaseId: Id, signal?: AbortSignal) =>
    apiRequest<InstallmentPurchase>(`finances/installment-purchases/${purchaseId}`, { signal }),
  updateInstallmentPurchase: (purchaseId: Id, request: InstallmentPurchaseRequest, signal?: AbortSignal) =>
    apiRequest<InstallmentPurchase>(`finances/installment-purchases/${purchaseId}`, {
      method: "PUT",
      body: request,
      signal,
    }),
  getMonthlySummary: (month: BusinessDate, signal?: AbortSignal) =>
    apiRequest<MonthlySummary>("finances/reports/monthly-summary", { query: { month }, signal }),
  getMonthlyComparison: (from: BusinessDate, to: BusinessDate, signal?: AbortSignal) =>
    apiRequest<{ items: MonthlySummary[] }>("finances/reports/monthly-comparison", { query: { from, to }, signal }),
  getCashFlowProjection: (from: BusinessDate, to: BusinessDate, signal?: AbortSignal) =>
    apiRequest<{ items: MonthlySummary[] }>("finances/reports/cash-flow-projection", { query: { from, to }, signal }),
  getCategorySpending: (month: BusinessDate, signal?: AbortSignal) =>
    apiRequest<CategorySpending[]>("finances/reports/category-spending", { query: { month }, signal }),
};

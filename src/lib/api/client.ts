import type { ApiErrorResponse } from "./contracts";

type QueryValue = string | number | boolean | null | undefined;

export interface ApiRequestOptions {
  method?: "DELETE" | "GET" | "POST" | "PUT";
  body?: object;
  query?: object;
  signal?: AbortSignal;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiRequest<T>(
  path: string,
  { method = "GET", body, query, signal }: ApiRequestOptions = {},
): Promise<T> {
  const response = await fetch(createUrl(path, query), {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    credentials: "same-origin",
    signal,
  });

  if (!response.ok) {
    throw new ApiError(response.status, await getErrorMessage(response));
  }
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function createUrl(path: string, query?: object): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (isQueryValue(value) && value !== null && value !== undefined) {
      searchParams.set(key, String(value));
    }
  }
  const suffix = searchParams.size === 0 ? "" : `?${searchParams.toString()}`;
  return `/bff/${path.replace(/^\//, "")}${suffix}`;
}

function isQueryValue(value: unknown): value is QueryValue {
  return value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean";
}

async function getErrorMessage(response: Response): Promise<string> {
  const payload: unknown = await response.json().catch(() => null);
  if (isApiErrorResponse(payload)) {
    return localizeApiMessage(payload.message);
  }
  return "Não foi possível concluir a solicitação.";
}

export function localizeApiMessage(message: string): string {
  const translations: Record<string, string> = {
    "Authentication is required.": "Sua sessão expirou. Entre novamente.",
    "Habit completion was not found.": "A conclusão do hábito não foi encontrada.",
    "Habit completions must be within the last seven days.":
      "As conclusões só podem ser alteradas entre hoje e os sete dias anteriores.",
    "Habit is invalid.": "Os dados do hábito são inválidos.",
    "Habit was not found.": "O hábito não foi encontrado.",
    "Habit query is invalid.": "A consulta de hábitos é inválida.",
    "Habit schedule is invalid.": "A agenda do hábito é inválida.",
    "Habit schedule was not found.": "A agenda do hábito não foi encontrada.",
    "Habit target count must be greater than zero.": "A meta do hábito precisa ser maior que zero.",
    "Only active habits can be completed.": "Apenas hábitos ativos podem ser concluídos.",
    "Only weekday schedules accept weekdays.": "Apenas agendas por dias da semana aceitam dias selecionados.",
    "The completion is outside the schedule or exceeds its target.":
      "A conclusão está fora da agenda ou já atingiu a meta do período.",
    "Weekday schedules require at least one weekday.":
      "Agendas por dias da semana exigem ao menos um dia selecionado.",
    "Invalid credentials.": "Nome de usuário ou senha inválidos.",
    "Username and password are required.": "Informe seu nome de usuário e senha.",
  };

  return translations[message] ?? "Não foi possível concluir a solicitação.";
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof value.message === "string";
}

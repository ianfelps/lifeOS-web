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
    "Budgets are only available for expense categories.":
      "Orçamentos estão disponíveis apenas para categorias de despesa.",
    "Category budget override was not found.": "A exceção mensal de orçamento não foi encontrada.",
    "Ended recurrences cannot be edited.": "Recorrências encerradas não podem ser editadas.",
    "Installments must be edited through their purchase.":
      "Parcelas devem ser editadas pela compra parcelada.",
    "The start month must be before the end month.":
      "O mês inicial precisa ser anterior ao mês final.",
    "The updated purchase cannot be less than its confirmed installments.":
      "A compra atualizada não pode ser menor que suas parcelas confirmadas.",
    "A workout session must use either a sheet or exercises.":
      "Um treino deve usar uma ficha ou conter exercícios.",
    "Archived exercises cannot be used in workout sheets.":
      "Exercícios arquivados não podem ser usados em fichas.",
    "Archived workout sheets cannot be used.": "Fichas arquivadas não podem iniciar treinos.",
    "Cancelled workout sessions cannot be edited.":
      "Treinos cancelados não podem ser editados.",
    "Exercise was not found.": "O exercício não foi encontrado.",
    "Only draft workout sessions can be completed.":
      "Apenas treinos em andamento podem ser concluídos.",
    "Workout session exercises are invalid.": "Os exercícios do treino são inválidos.",
    "Workout sessions require at least one exercise.":
      "O treino precisa de pelo menos um exercício.",
    "Workout session sets are invalid.": "As séries do treino são inválidas.",
    "Workout sheet exercises are invalid.": "Os exercícios da ficha são inválidos.",
    "Exercise muscle groups are invalid.": "Os grupos musculares do exercício são inválidos.",
    "Workout sheet muscle groups are invalid.": "Os grupos musculares da ficha são inválidos.",
    "Workout sheet was not found.": "A ficha não foi encontrada.",
    "Cancelled goals cannot be updated.": "Metas canceladas não podem ser atualizadas.",
    "Exercise source was not found.": "O exercício vinculado não foi encontrado.",
    "Goal is invalid.": "Os dados da meta são inválidos.",
    "Goal progress cannot be negative.": "O progresso da meta não pode ser negativo.",
    "Goal sources are invalid for its type.": "As fontes da meta não são válidas para esse tipo.",
    "Goal type cannot be changed.": "O tipo da meta não pode ser alterado.",
    "Goal was not found.": "A meta não foi encontrada.",
    "Habit source was not found.": "O hábito vinculado não foi encontrado.",
    "Only free-form goals accept manual progress.": "Apenas metas livres aceitam progresso manual.",
    "Pagination is invalid.": "A paginação informada é inválida.",
    "Workout sheet source was not found.": "A ficha vinculada não foi encontrada.",
    "Badge is invalid.": "Os dados da conquista são inválidos.",
    "Badge was not found.": "A conquista não foi encontrada.",
    "Current password is invalid.": "A senha atual está incorreta.",
    "Password is invalid.": "A nova senha não atende aos requisitos de segurança.",
    "Password must meet the minimum length requirement.":
      "A nova senha não atende ao tamanho mínimo exigido.",
    "User preference is invalid.": "A preferência de unidade informada é inválida.",
    "User preference was not found.": "A preferência de unidade não foi encontrada.",
    "User name and display name are required.":
      "Informe o nome de usuário e o nome de exibição.",
    "User name or display name is too long.":
      "O nome de usuário ou o nome de exibição é muito longo.",
    "User name is already in use.": "Este nome de usuário já está em uso.",
    "XP rules are invalid.": "As regras de XP informadas são inválidas.",
    "Level progression is invalid.": "A progressão de níveis informada é inválida.",
  };

  return translations[message] ?? "Não foi possível concluir a solicitação.";
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof value.message === "string";
}

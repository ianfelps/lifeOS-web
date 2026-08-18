export type Id = string;
export type BusinessDate = string;
export type IsoDateTime = string;

export type FinancialCategoryType = "Income" | "Expense";
export type PaymentMethod = "Pix" | "Credit" | "Debit" | "InstallmentCredit";
export type TransactionStatus = "Planned" | "Confirmed" | "Overdue";
export type BudgetAlert = "None" | "EightyPercent" | "AtLimit" | "Exceeded";
export type HabitPriority = "Low" | "Medium" | "High";
export type HabitScheduleType = "Daily" | "Weekdays" | "WeeklyCount" | "DailyCount";
export type HabitStatus = "Active" | "Paused" | "Archived";
export type Weekday =
  | "Sunday"
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday";
export type WeightUnit = "Kilograms" | "Pounds";
export type WorkoutSessionStatus = "Draft" | "Completed" | "Cancelled";
export type GoalType = "Financial" | "Habit" | "Training" | "FreeForm";
export type GoalStatus = "Active" | "Completed" | "Cancelled";
export type GoalSourceType = "Category" | "Habit" | "Exercise" | "WorkoutSheet";
export type XpEventType =
  | "HabitCompletion"
  | "WeeklyHabitGoal"
  | "WorkoutCompleted"
  | "TransactionConfirmed"
  | "PositiveMonth"
  | "GoalCompleted";
export type XpLedgerEntryType = "Grant" | "Reversal" | "Adjustment";
export type BadgeCriterionType =
  | "Xp"
  | "Level"
  | "HabitCompletionCount"
  | "WeeklyHabitGoalCount"
  | "WorkoutCompletionCount"
  | "TransactionConfirmationCount"
  | "GoalCompletionCount"
  | "PositiveMonthCount";
export type AuditAction =
  | "Login"
  | "Created"
  | "Updated"
  | "Archived"
  | "Deleted"
  | "PasswordChanged"
  | "SessionsRevoked";

export interface ApiErrorResponse {
  message: string;
}

export interface PagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface User {
  userId: string;
  userName: string;
  displayName: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: IsoDateTime;
  user: User;
}

export interface PublicAuthResponse {
  expiresAt: IsoDateTime;
  user: User;
}

export interface LoginRequest {
  userName: string;
  password: string;
}

export interface UserPreference {
  preferredWeightUnit: WeightUnit;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface RevokedSessionsResponse {
  revokedSessionCount: number;
}

export interface FinancialCategoryRequest {
  name: string;
  type: FinancialCategoryType;
}

export interface FinancialCategory extends FinancialCategoryRequest {
  id: Id;
  archived: boolean;
}

export interface BudgetRequest {
  amount: number;
}

export interface Budget {
  categoryId: Id;
  amount: number;
  overrideMonth: BusinessDate | null;
}

export interface TransactionRequest {
  categoryId: Id;
  amount: number;
  transactionDate: BusinessDate;
  type: FinancialCategoryType;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  description?: string;
}

export interface Transaction extends TransactionRequest {
  id: Id;
  installmentNumber: number | null;
  installmentPurchaseId: Id | null;
  recurringTransactionId: Id | null;
}

export interface TransactionQuery {
  page?: number;
  pageSize?: number;
  from?: BusinessDate;
  to?: BusinessDate;
  categoryId?: Id;
  type?: FinancialCategoryType;
  status?: TransactionStatus;
  paymentMethod?: PaymentMethod;
  sort?: "date-desc" | "date-asc" | "amount-desc" | "amount-asc";
}

export interface RecurrenceRequest {
  categoryId: Id;
  amount: number;
  type: FinancialCategoryType;
  paymentMethod: PaymentMethod;
  firstOccurrenceDate: BusinessDate;
  description?: string;
}

export interface Recurrence extends RecurrenceRequest {
  id: Id;
  endedAt: IsoDateTime | null;
}

export interface InstallmentPurchaseRequest {
  categoryId: Id;
  totalAmount: number;
  installmentCount: number;
  firstInstallmentDate: BusinessDate;
  status: TransactionStatus;
  description?: string;
}

export interface InstallmentPurchase extends InstallmentPurchaseRequest {
  id: Id;
  installments: Transaction[];
}

export interface MonthlySummary {
  month: BusinessDate;
  confirmedIncome: number;
  confirmedExpense: number;
  confirmedBalance: number;
  projectedIncome: number;
  projectedExpense: number;
  projectedBalance: number;
}

export interface CategorySpending {
  categoryId: Id;
  categoryName: string;
  spent: number;
  budget: number | null;
  remaining: number | null;
  percentage: number | null;
  alert: BudgetAlert;
}

export interface HabitScheduleRequest {
  type: HabitScheduleType;
  targetCount?: number;
  weekdays?: Weekday[];
}

export interface HabitRequest {
  title: string;
  priority: HabitPriority;
  schedule: HabitScheduleRequest;
}

export interface HabitSchedule {
  type: HabitScheduleType;
  targetCount: number;
  weekdays: Weekday[];
}

export interface Habit extends Omit<HabitRequest, "schedule"> {
  id: Id;
  status: HabitStatus;
  schedule: HabitSchedule;
}

export interface HabitQuery {
  page?: number;
  pageSize?: number;
  includeArchived?: boolean;
  status?: HabitStatus;
}

export interface HabitCompletion {
  id: Id;
  habitId: Id;
  completedOn: BusinessDate;
}

export interface HabitProgress {
  habitId: Id;
  periodStart: BusinessDate;
  periodEnd: BusinessDate;
  completionCount: number;
  targetCount: number;
  isCompleted: boolean;
  streak: number;
}

export interface HabitReminder {
  habitId: Id;
  title: string;
  completionCount: number;
  targetCount: number;
}

export interface ExerciseRequest {
  name: string;
}

export interface Exercise extends ExerciseRequest {
  id: Id;
  archived: boolean;
}

export interface WorkoutSheetSetRequest {
  targetRepetitions: number;
}

export interface WorkoutSheetExerciseRequest {
  exerciseId: Id;
  sets: WorkoutSheetSetRequest[];
}

export interface WorkoutSheetRequest {
  name: string;
  exercises: WorkoutSheetExerciseRequest[];
}

export interface WorkoutSheetSet extends WorkoutSheetSetRequest {
  id: Id;
  position: number;
}

export interface WorkoutSheetExercise {
  id: Id;
  exerciseId: Id;
  exerciseName: string;
  position: number;
  sets: WorkoutSheetSet[];
}

export interface WorkoutSheet {
  id: Id;
  name: string;
  archived: boolean;
  exercises: WorkoutSheetExercise[];
}

export interface WorkoutSessionSetRequest {
  weight?: number | null;
  weightUnit?: WeightUnit | null;
  repetitions?: number | null;
}

export interface WorkoutSessionExerciseRequest {
  exerciseId?: Id | null;
  exerciseName?: string | null;
  sets: WorkoutSessionSetRequest[];
}

export interface StartWorkoutSessionRequest {
  workoutSheetId?: Id | null;
  exercises?: WorkoutSessionExerciseRequest[];
}

export interface UpdateWorkoutSessionRequest {
  exercises: WorkoutSessionExerciseRequest[];
}

export interface WorkoutSessionSet extends WorkoutSessionSetRequest {
  id: Id;
  position: number;
}

export interface WorkoutSessionExercise {
  id: Id;
  exerciseId: Id | null;
  exerciseName: string;
  position: number;
  sets: WorkoutSessionSet[];
}

export interface WorkoutSession {
  id: Id;
  workoutSheetId: Id | null;
  status: WorkoutSessionStatus;
  startedAt: IsoDateTime;
  completedAt: IsoDateTime | null;
  cancelledAt: IsoDateTime | null;
  exercises: WorkoutSessionExercise[];
}

export interface WorkoutSessionQuery {
  page?: number;
  pageSize?: number;
  from?: IsoDateTime;
  to?: IsoDateTime;
  workoutSheetId?: Id;
  status?: WorkoutSessionStatus;
}

export interface ExerciseProgressItem {
  sessionId: Id;
  completedAt: IsoDateTime;
  weightUnit: WeightUnit;
  maxWeight: number;
  bestSetWeight: number;
  bestSetRepetitions: number;
  totalVolume: number;
}

export interface ExerciseProgress {
  exerciseId: Id;
  exerciseName: string;
  items: ExerciseProgressItem[];
}

export interface GoalSource {
  sourceType: GoalSourceType;
  sourceId: Id;
}

export interface GoalRequest {
  type: GoalType;
  title: string;
  description?: string;
  targetValue: number;
  unit: string;
  dueDate?: BusinessDate | null;
  sources?: GoalSource[];
}

export interface Goal extends GoalRequest {
  id: Id;
  status: GoalStatus;
  progress: number;
  archived: boolean;
  sources: GoalSource[];
}

export interface GoalQuery {
  page?: number;
  pageSize?: number;
  includeArchived?: boolean;
  status?: GoalStatus;
}

export interface XpLedgerEntry {
  id: Id;
  type: XpLedgerEntryType;
  amount: number;
  eventType: XpEventType | null;
  sourceType: string | null;
  sourceId: Id | null;
  reversedEntryId: Id | null;
  createdAt: IsoDateTime;
}

export interface XpRule {
  eventType: XpEventType;
  amount: number;
}

export interface LevelProgressionRule {
  baseXp: number;
  incrementPerLevel: number;
}

export interface BadgeCriterion {
  type: BadgeCriterionType;
  targetValue: number;
  habitId?: Id | null;
  exerciseId?: Id | null;
  financialCategoryId?: Id | null;
  goalId?: Id | null;
}

export interface BadgeRequest {
  name: string;
  description: string;
  criteria: BadgeCriterion[];
}

export interface Badge extends BadgeRequest {
  id: Id;
  archived: boolean;
  unlockedAt: IsoDateTime | null;
}

export interface GamificationProfile {
  totalXp: number;
  level: number;
  currentLevelXp: number;
  nextLevelXp: number | null;
  badges: Badge[];
}

export interface AuditLog {
  id: Id;
  action: AuditAction;
  resourceType: string;
  resourceId: Id | null;
  previousValues: string | null;
  currentValues: string | null;
  createdAt: IsoDateTime;
}

export interface Dashboard {
  finance: MonthlySummary;
  pendingHabits: HabitProgress[];
  recentWorkouts: WorkoutSession[];
  gamification: GamificationProfile;
}

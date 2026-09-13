"use client";

import { useEffect, useState } from "react";
import type {
  CategorySpending,
  FinancialCategory,
  FinancialCategoryType,
  InstallmentPurchase,
  MonthlySummary,
  PaymentMethod,
  Recurrence,
  Transaction,
  TransactionStatus,
} from "@/lib/api/contracts";
import { financesApi } from "@/lib/api/finances";
import {
  ConfirmationModal,
  type Confirmation,
} from "@/components/confirmation-modal";

type TransactionEditor = {
  amount: string;
  categoryId: string;
  date: string;
  description: string;
  paymentMethod: PaymentMethod;
  status: "Planned" | "Confirmed";
  type: FinancialCategoryType;
};

type RecurrenceEditor = Omit<TransactionEditor, "date" | "status"> & {
  firstOccurrenceDate: string;
};

type InstallmentEditor = {
  categoryId: string;
  description: string;
  firstInstallmentDate: string;
  installmentCount: string;
  status: "Planned" | "Confirmed";
  totalAmount: string;
};

type TransactionFilters = {
  categoryId: string;
  paymentMethod: "" | PaymentMethod;
  sort: "date-desc" | "date-asc" | "amount-desc" | "amount-asc";
  status: "" | TransactionStatus;
  type: "" | FinancialCategoryType;
};

const initialFilters: TransactionFilters = {
  categoryId: "",
  paymentMethod: "",
  sort: "date-desc",
  status: "",
  type: "",
};

function createTransactionEditor(date: string): TransactionEditor {
  return {
    amount: "",
    categoryId: "",
    date,
    description: "",
    paymentMethod: "Pix",
    status: "Confirmed",
    type: "Expense",
  };
}

function createRecurrenceEditor(date: string): RecurrenceEditor {
  return {
    ...createTransactionEditor(date),
    firstOccurrenceDate: date,
  };
}

function createInstallmentEditor(date: string): InstallmentEditor {
  return {
    categoryId: "",
    description: "",
    firstInstallmentDate: date,
    installmentCount: "2",
    status: "Planned",
    totalAmount: "",
  };
}

export default function FinancesPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [spending, setSpending] = useState<CategorySpending[]>([]);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<TransactionFilters>(initialFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [transactionEditor, setTransactionEditor] =
    useState<TransactionEditor | null>(null);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [recurrenceEditor, setRecurrenceEditor] =
    useState<RecurrenceEditor | null>(null);
  const [editingRecurrence, setEditingRecurrence] = useState<Recurrence | null>(
    null,
  );
  const [installmentEditor, setInstallmentEditor] =
    useState<InstallmentEditor | null>(null);
  const [editingPurchase, setEditingPurchase] =
    useState<InstallmentPurchase | null>(null);
  const [categoryEditor, setCategoryEditor] = useState<{
    id: string | null;
    name: string;
    type: FinancialCategoryType;
  } | null>(null);
  const [budgetCategory, setBudgetCategory] = useState<CategorySpending | null>(
    null,
  );
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetMode, setBudgetMode] = useState<"recurring" | "override">(
    "recurring",
  );
  const [hasBudgetOverride, setHasBudgetOverride] = useState(false);
  const [recurrences, setRecurrences] = useState<Recurrence[] | null>(null);
  const [report, setReport] = useState<{
    comparison: MonthlySummary[];
    projection: MonthlySummary[];
  } | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const monthDate = `${month}-01`;
  const pageSize = 12;
  const pageCount = Math.max(1, Math.ceil(totalTransactions / pageSize));

  async function loadFinance(signal?: AbortSignal) {
    const query = {
      categoryId: filters.categoryId || undefined,
      from: monthDate,
      page,
      pageSize,
      paymentMethod: filters.paymentMethod || undefined,
      sort: filters.sort,
      status: filters.status || undefined,
      to: getLastDayOfMonth(monthDate),
      type: filters.type || undefined,
    };
    try {
      const [nextCategories, nextSummary, nextSpending, nextTransactions] =
        await Promise.all([
          financesApi.getCategories(false, signal),
          financesApi.getMonthlySummary(monthDate, signal),
          financesApi.getCategorySpending(monthDate, signal),
          financesApi.getTransactions(query, signal),
        ]);
      if (signal?.aborted) return;
      setCategories(nextCategories);
      setSummary(nextSummary);
      setSpending(nextSpending);
      setTransactions(nextTransactions.items);
      setTotalTransactions(nextTransactions.totalCount);
      setError(null);
    } catch (loadError) {
      if (!signal?.aborted) setError(getErrorMessage(loadError));
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    const query = {
      categoryId: filters.categoryId || undefined,
      from: monthDate,
      page,
      pageSize,
      paymentMethod: filters.paymentMethod || undefined,
      sort: filters.sort,
      status: filters.status || undefined,
      to: getLastDayOfMonth(monthDate),
      type: filters.type || undefined,
    };
    void Promise.all([
      financesApi.getCategories(false, controller.signal),
      financesApi.getMonthlySummary(monthDate, controller.signal),
      financesApi.getCategorySpending(monthDate, controller.signal),
      financesApi.getTransactions(query, controller.signal),
    ])
      .then(([nextCategories, nextSummary, nextSpending, nextTransactions]) => {
        if (controller.signal.aborted) return;
        setCategories(nextCategories);
        setSummary(nextSummary);
        setSpending(nextSpending);
        setTransactions(nextTransactions.items);
        setTotalTransactions(nextTransactions.totalCount);
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) setError(getErrorMessage(loadError));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [monthDate, page, filters]);

  function updateMonth(nextMonth: string) {
    setMonth(nextMonth);
    setPage(1);
    setReport(null);
  }

  function updateFilters(nextFilters: TransactionFilters) {
    setFilters(nextFilters);
    setPage(1);
  }

  function openNewTransaction() {
    setEditingTransaction(null);
    setTransactionEditor(createTransactionEditor(getToday()));
  }

  function openTransactionEditor(transaction: Transaction) {
    if (transaction.installmentPurchaseId) {
      void openPurchaseEditor(transaction.installmentPurchaseId);
      return;
    }
    setEditingTransaction(transaction);
    setTransactionEditor({
      amount: String(transaction.amount),
      categoryId: transaction.categoryId,
      date: transaction.transactionDate,
      description: transaction.description ?? "",
      paymentMethod: transaction.paymentMethod,
      status: transaction.status === "Confirmed" ? "Confirmed" : "Planned",
      type: transaction.type,
    });
  }

  async function saveTransaction() {
    if (!transactionEditor) return;
    const amount = Number(transactionEditor.amount.replace(",", "."));
    if (
      !transactionEditor.categoryId ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !transactionEditor.date
    ) {
      setError("Informe categoria, valor positivo e data para o lançamento.");
      return;
    }
    setProcessingId("transaction-editor");
    try {
      const request = {
        amount,
        categoryId: transactionEditor.categoryId,
        description: transactionEditor.description.trim() || undefined,
        paymentMethod: transactionEditor.paymentMethod,
        status: transactionEditor.status,
        transactionDate: transactionEditor.date,
        type: transactionEditor.type,
      };
      if (editingTransaction)
        await financesApi.updateTransaction(editingTransaction.id, request);
      else await financesApi.createTransaction(request);
      setTransactionEditor(null);
      await loadFinance();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setProcessingId(null);
    }
  }

  async function confirmTransaction(transaction: Transaction) {
    setProcessingId(transaction.id);
    try {
      await financesApi.confirmTransaction(transaction.id);
      await loadFinance();
    } catch (confirmError) {
      setError(getErrorMessage(confirmError));
    } finally {
      setProcessingId(null);
    }
  }

  async function deleteTransaction(transaction: Transaction) {
    setProcessingId(transaction.id);
    try {
      await financesApi.deleteTransaction(transaction.id);
      await loadFinance();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setProcessingId(null);
    }
  }

  async function saveCategory() {
    if (!categoryEditor) return;
    const name = categoryEditor.name.trim();
    if (!name) {
      setError("Informe um nome para a categoria.");
      return;
    }
    setProcessingId("category-editor");
    try {
      if (categoryEditor.id)
        await financesApi.updateCategory(categoryEditor.id, {
          name,
          type: categoryEditor.type,
        });
      else
        await financesApi.createCategory({ name, type: categoryEditor.type });
      setCategoryEditor(null);
      await loadFinance();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setProcessingId(null);
    }
  }

  async function archiveCategory(category: FinancialCategory) {
    setProcessingId(category.id);
    try {
      await financesApi.archiveCategory(category.id);
      await loadFinance();
    } catch (archiveError) {
      setError(getErrorMessage(archiveError));
    } finally {
      setProcessingId(null);
    }
  }

  async function openBudgetEditor(item: CategorySpending) {
    setBudgetCategory(item);
    setBudgetAmount(item.budget === null ? "" : String(item.budget));
    setBudgetMode("recurring");
    setHasBudgetOverride(false);
    try {
      const budget = await financesApi.getBudget(item.categoryId, monthDate);
      if (budget?.overrideMonth) {
        setBudgetMode("override");
        setHasBudgetOverride(true);
      }
    } catch (budgetError) {
      setError(getErrorMessage(budgetError));
    }
  }

  async function saveBudget() {
    if (!budgetCategory) return;
    const amount = Number(budgetAmount.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Informe um teto mensal positivo.");
      return;
    }
    setProcessingId("budget-editor");
    try {
      if (budgetMode === "override")
        await financesApi.setBudgetOverride(
          budgetCategory.categoryId,
          monthDate,
          { amount },
        );
      else await financesApi.setBudget(budgetCategory.categoryId, { amount });
      setBudgetCategory(null);
      await loadFinance();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setProcessingId(null);
    }
  }

  async function removeBudgetOverride() {
    if (!budgetCategory) return;
    setProcessingId("budget-editor");
    try {
      await financesApi.deleteBudgetOverride(
        budgetCategory.categoryId,
        monthDate,
      );
      setBudgetCategory(null);
      await loadFinance();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setProcessingId(null);
    }
  }

  async function openRecurrences() {
    try {
      setRecurrences(await financesApi.getRecurrences());
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    }
  }

  function openNewRecurrence() {
    setEditingRecurrence(null);
    setRecurrenceEditor(createRecurrenceEditor(getToday()));
  }

  function openRecurrenceEditor(recurrence: Recurrence) {
    setEditingRecurrence(recurrence);
    setRecurrenceEditor({
      amount: String(recurrence.amount),
      categoryId: recurrence.categoryId,
      description: recurrence.description ?? "",
      firstOccurrenceDate: recurrence.firstOccurrenceDate,
      paymentMethod: recurrence.paymentMethod,
      type: recurrence.type,
    });
  }

  async function saveRecurrence() {
    if (!recurrenceEditor) return;
    const amount = Number(recurrenceEditor.amount.replace(",", "."));
    if (
      !recurrenceEditor.categoryId ||
      !recurrenceEditor.firstOccurrenceDate ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setError("Informe categoria, valor positivo e início da recorrência.");
      return;
    }
    setProcessingId("recurrence-editor");
    try {
      const request = {
        amount,
        categoryId: recurrenceEditor.categoryId,
        description: recurrenceEditor.description.trim() || undefined,
        firstOccurrenceDate: recurrenceEditor.firstOccurrenceDate,
        paymentMethod: recurrenceEditor.paymentMethod,
        type: recurrenceEditor.type,
      };
      if (editingRecurrence)
        await financesApi.updateRecurrence(editingRecurrence.id, request);
      else await financesApi.createRecurrence(request);
      setRecurrenceEditor(null);
      await openRecurrences();
      await loadFinance();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setProcessingId(null);
    }
  }

  async function endRecurrence(recurrence: Recurrence) {
    setProcessingId(recurrence.id);
    try {
      await financesApi.endRecurrence(recurrence.id);
      await openRecurrences();
      await loadFinance();
    } catch (endError) {
      setError(getErrorMessage(endError));
    } finally {
      setProcessingId(null);
    }
  }

  function openNewInstallment() {
    setEditingPurchase(null);
    setInstallmentEditor(createInstallmentEditor(getToday()));
  }

  async function openPurchaseEditor(purchaseId: string) {
    setProcessingId(purchaseId);
    try {
      const purchase = await financesApi.getInstallmentPurchase(purchaseId);
      const nextInstallment = purchase.installments.find(
        (item) => item.status !== "Confirmed",
      );
      setEditingPurchase(purchase);
      setInstallmentEditor({
        categoryId: purchase.categoryId,
        description: purchase.description ?? "",
        firstInstallmentDate: nextInstallment?.transactionDate ?? getToday(),
        installmentCount: String(purchase.installmentCount),
        status:
          nextInstallment?.status === "Confirmed" ? "Confirmed" : "Planned",
        totalAmount: String(purchase.totalAmount),
      });
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setProcessingId(null);
    }
  }

  async function saveInstallment() {
    if (!installmentEditor) return;
    const installmentCount = Number(installmentEditor.installmentCount);
    const totalAmount = Number(installmentEditor.totalAmount.replace(",", "."));
    if (
      !installmentEditor.categoryId ||
      !installmentEditor.firstInstallmentDate ||
      !Number.isInteger(installmentCount) ||
      installmentCount < 2 ||
      !Number.isFinite(totalAmount) ||
      totalAmount <= 0
    ) {
      setError(
        "Informe categoria, valor positivo, ao menos duas parcelas e a primeira data.",
      );
      return;
    }
    setProcessingId("installment-editor");
    try {
      const request = {
        categoryId: installmentEditor.categoryId,
        description: installmentEditor.description.trim() || undefined,
        firstInstallmentDate: installmentEditor.firstInstallmentDate,
        installmentCount,
        status: installmentEditor.status,
        totalAmount,
      };
      if (editingPurchase)
        await financesApi.updateInstallmentPurchase(
          editingPurchase.id,
          request,
        );
      else await financesApi.createInstallmentPurchase(request);
      setInstallmentEditor(null);
      await loadFinance();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setProcessingId(null);
    }
  }

  async function loadReports() {
    const from = getMonthOffset(monthDate, -5);
    setProcessingId("reports");
    try {
      const [comparison, projection] = await Promise.all([
        financesApi.getMonthlyComparison(from, monthDate),
        financesApi.getCashFlowProjection(from, monthDate),
      ]);
      setReport({ comparison: comparison.items, projection: projection.items });
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="finances-page">
      <main className="finances-main">
        <section className="finances-heading" aria-labelledby="finances-title">
          <div>
            <p>FLUXO E PLANEJAMENTO</p>
            <h1 id="finances-title">Finanças</h1>
            <span>Registre o presente e acompanhe o que vem pela frente.</span>
          </div>
          <div className="finances-heading-actions">
            <button
              className="finance-secondary-button"
              onClick={openNewInstallment}
              type="button"
            >
              Compra parcelada
            </button>
            <button
              className="finance-create"
              onClick={openNewTransaction}
              type="button"
            >
              <span aria-hidden="true">+</span>Novo lançamento
            </button>
          </div>
        </section>

        {error ? (
          <div className="finances-error" role="alert">
            <span>{error}</span>
            <button onClick={() => void loadFinance()} type="button">
              Tentar novamente
            </button>
          </div>
        ) : null}

        <label className="finance-month-picker">
          <span>MÊS EM ANÁLISE</span>
          <input
            onChange={(event) => updateMonth(event.target.value)}
            type="month"
            value={month}
          />
        </label>

        {isLoading || !summary ? (
          <section className="finances-loading" aria-live="polite">
            CARREGANDO FINANÇAS
          </section>
        ) : (
          <>
            <section
              className="finance-overview"
              aria-label="Resumo financeiro mensal"
            >
              <article className="finance-balance-card">
                <span>SALDO REALIZADO</span>
                <strong>{formatCurrency(summary.confirmedBalance)}</strong>
                <small>{formatMonth(summary.month)}</small>
              </article>
              <article>
                <span>RECEITAS CONFIRMADAS</span>
                <strong className="finance-income">
                  {formatCurrency(summary.confirmedIncome)}
                </strong>
              </article>
              <article>
                <span>DESPESAS CONFIRMADAS</span>
                <strong className="finance-expense">
                  {formatCurrency(summary.confirmedExpense)}
                </strong>
              </article>
              <article>
                <span>SALDO PROJETADO</span>
                <strong>{formatCurrency(summary.projectedBalance)}</strong>
                <small>Inclui lançamentos planejados</small>
              </article>
            </section>

            <section
              className="finance-section"
              aria-labelledby="transactions-title"
            >
              <div className="finance-section-heading">
                <div>
                  <p>REGISTROS DO MÊS</p>
                  <h2 id="transactions-title">Lançamentos</h2>
                </div>
                <span>
                  {totalTransactions} registro
                  {totalTransactions === 1 ? "" : "s"}
                </span>
              </div>
              <TransactionFilters
                categories={categories}
                filters={filters}
                onChange={updateFilters}
              />
              <TransactionList
                categories={categories}
                onConfirm={(item) => void confirmTransaction(item)}
                onDelete={(item) =>
                  setConfirmation({
                    confirmLabel: "Excluir lançamento",
                    description: `O lançamento “${item.description || "sem descrição"}” será removido.`,
                    onConfirm: () => deleteTransaction(item),
                    title: "Excluir lançamento?",
                  })
                }
                onEdit={openTransactionEditor}
                processingId={processingId}
                transactions={transactions}
              />
              <div className="finance-pagination">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  type="button"
                >
                  Anterior
                </button>
                <span>
                  Página {page} de {pageCount}
                </span>
                <button
                  disabled={page === pageCount}
                  onClick={() => setPage(page + 1)}
                  type="button"
                >
                  Próxima
                </button>
              </div>
            </section>

            <section
              className="finance-section finance-budget-section"
              aria-labelledby="budgets-title"
            >
              <div className="finance-section-heading">
                <div>
                  <p>CONTROLE POR CATEGORIA</p>
                  <h2 id="budgets-title">Orçamentos</h2>
                </div>
                <button
                  className="finance-text-button"
                  onClick={() =>
                    setCategoryEditor({ id: null, name: "", type: "Expense" })
                  }
                  type="button"
                >
                  Gerenciar categorias
                </button>
              </div>
              <div className="finance-budget-list">
                {spending.map((item) => (
                  <BudgetCard
                    item={item}
                    key={item.categoryId}
                    onEdit={() => void openBudgetEditor(item)}
                  />
                ))}
              </div>
              <div
                className="finance-category-list"
                aria-label="Categorias ativas"
              >
                {categories.map((item) => (
                  <button
                    key={item.id}
                    onClick={() =>
                      setCategoryEditor({
                        id: item.id,
                        name: item.name,
                        type: item.type,
                      })
                    }
                    type="button"
                  >
                    {item.name}
                    <span>
                      {item.type === "Income" ? "Receita" : "Despesa"}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section
              className="finance-section finance-tools"
              aria-label="Configurações financeiras"
            >
              <article>
                <span>RECORRÊNCIAS MENSAIS</span>
                <p>Automatize receitas e despesas que se repetem.</p>
                <button onClick={() => void openRecurrences()} type="button">
                  Ver recorrências
                </button>
              </article>
              <article>
                <span>RELATÓRIOS</span>
                <p>Compare meses e acompanhe a projeção de caixa.</p>
                <button
                  disabled={processingId === "reports"}
                  onClick={() => void loadReports()}
                  type="button"
                >
                  {processingId === "reports"
                    ? "Carregando..."
                    : "Ver relatórios"}
                </button>
              </article>
            </section>

            {recurrences ? (
              <RecurrenceSection
                categories={categories}
                items={recurrences}
                onCreate={openNewRecurrence}
                onEdit={openRecurrenceEditor}
                onEnd={(item) =>
                  setConfirmation({
                    confirmLabel: "Encerrar recorrência",
                    description: "O histórico da recorrência será preservado.",
                    onConfirm: () => endRecurrence(item),
                    title: "Encerrar recorrência?",
                  })
                }
                processingId={processingId}
              />
            ) : null}
            {report ? <Reports report={report} /> : null}
          </>
        )}
      </main>

      {transactionEditor ? (
        <TransactionModal
          categories={categories}
          editor={transactionEditor}
          isSaving={processingId === "transaction-editor"}
          onCancel={() => setTransactionEditor(null)}
          onChange={setTransactionEditor}
          onSave={() => void saveTransaction()}
          title={editingTransaction ? "Editar lançamento" : "Novo lançamento"}
        />
      ) : null}
      {recurrenceEditor ? (
        <RecurrenceModal
          categories={categories}
          editor={recurrenceEditor}
          isSaving={processingId === "recurrence-editor"}
          onCancel={() => setRecurrenceEditor(null)}
          onChange={setRecurrenceEditor}
          onSave={() => void saveRecurrence()}
          title={editingRecurrence ? "Editar recorrência" : "Nova recorrência"}
        />
      ) : null}
      {installmentEditor ? (
        <InstallmentModal
          categories={categories}
          editor={installmentEditor}
          isSaving={processingId === "installment-editor"}
          onCancel={() => setInstallmentEditor(null)}
          onChange={setInstallmentEditor}
          onSave={() => void saveInstallment()}
          title={
            editingPurchase
              ? "Editar compra parcelada"
              : "Nova compra parcelada"
          }
        />
      ) : null}
      {categoryEditor ? (
        <CategoryModal
          editor={categoryEditor}
          isSaving={processingId === "category-editor"}
          onArchive={
            categoryEditor.id
              ? () => {
                  const category = categories.find(
                    (item) => item.id === categoryEditor.id,
                  );
                  if (category)
                    setConfirmation({
                      confirmLabel: "Arquivar categoria",
                      description: `Os lançamentos existentes de “${category.name}” serão preservados.`,
                      onConfirm: () => archiveCategory(category),
                      title: "Arquivar categoria?",
                    });
                }
              : undefined
          }
          onCancel={() => setCategoryEditor(null)}
          onChange={setCategoryEditor}
          onSave={() => void saveCategory()}
        />
      ) : null}
      {budgetCategory ? (
        <BudgetModal
          amount={budgetAmount}
          hasOverride={hasBudgetOverride}
          item={budgetCategory}
          isSaving={processingId === "budget-editor"}
          mode={budgetMode}
          onCancel={() => setBudgetCategory(null)}
          onChangeAmount={setBudgetAmount}
          onChangeMode={setBudgetMode}
          onDeleteOverride={() => void removeBudgetOverride()}
          onSave={() => void saveBudget()}
        />
      ) : null}
      {confirmation ? (
        <ConfirmationModal
          confirmation={confirmation}
          onCancel={() => setConfirmation(null)}
        />
      ) : null}
    </div>
  );
}

function TransactionFilters({
  categories,
  filters,
  onChange,
}: Readonly<{
  categories: FinancialCategory[];
  filters: TransactionFilters;
  onChange: (filters: TransactionFilters) => void;
}>) {
  const filteredCategories = filters.type
    ? categories.filter((item) => item.type === filters.type)
    : categories;
  return (
    <div className="finance-filters">
      <select
        aria-label="Tipo"
        onChange={(event) =>
          onChange({
            ...filters,
            categoryId: "",
            type: event.target.value as "" | FinancialCategoryType,
          })
        }
        value={filters.type}
      >
        <option value="">Todos os tipos</option>
        <option value="Income">Receitas</option>
        <option value="Expense">Despesas</option>
      </select>
      <select
        aria-label="Categoria"
        onChange={(event) =>
          onChange({ ...filters, categoryId: event.target.value })
        }
        value={filters.categoryId}
      >
        <option value="">Todas as categorias</option>
        {filteredCategories.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      <select
        aria-label="Situação"
        onChange={(event) =>
          onChange({
            ...filters,
            status: event.target.value as "" | TransactionStatus,
          })
        }
        value={filters.status}
      >
        <option value="">Todas as situações</option>
        <option value="Confirmed">Confirmados</option>
        <option value="Planned">Planejados</option>
        <option value="Overdue">Vencidos</option>
      </select>
      <select
        aria-label="Ordenação"
        onChange={(event) =>
          onChange({
            ...filters,
            sort: event.target.value as TransactionFilters["sort"],
          })
        }
        value={filters.sort}
      >
        <option value="date-desc">Data: recente</option>
        <option value="date-asc">Data: antiga</option>
        <option value="amount-desc">Maior valor</option>
        <option value="amount-asc">Menor valor</option>
      </select>
    </div>
  );
}

function TransactionList({
  categories,
  onConfirm,
  onDelete,
  onEdit,
  processingId,
  transactions,
}: Readonly<{
  categories: FinancialCategory[];
  onConfirm: (item: Transaction) => void;
  onDelete: (item: Transaction) => void;
  onEdit: (item: Transaction) => void;
  processingId: string | null;
  transactions: Transaction[];
}>) {
  if (transactions.length === 0)
    return (
      <div className="finance-empty">
        Nenhum lançamento encontrado neste período.
      </div>
    );
  return (
    <div className="transaction-list">
      {transactions.map((item) => (
        <article className="transaction-row" key={item.id}>
          <div>
            <strong>{item.description || "Sem descrição"}</strong>
            <span>
              {getCategoryName(categories, item.categoryId)} ·{" "}
              {formatDate(item.transactionDate)}
              {item.installmentNumber
                ? ` · ${item.installmentNumber}ª parcela`
                : ""}
            </span>
          </div>
          <div className="transaction-row-value">
            <strong
              className={
                item.type === "Income" ? "finance-income" : "finance-expense"
              }
            >
              {item.type === "Income" ? "+" : "-"}
              {formatCurrency(item.amount)}
            </strong>
            <span className={`transaction-status ${item.status.toLowerCase()}`}>
              {getStatusLabel(item.status)}
            </span>
          </div>
          <div className="transaction-actions">
            {item.status !== "Confirmed" ? (
              <button
                disabled={processingId === item.id}
                onClick={() => onConfirm(item)}
                type="button"
              >
                Confirmar
              </button>
            ) : null}
            <button
              disabled={processingId === item.id}
              onClick={() => onEdit(item)}
              type="button"
            >
              Editar
            </button>
            {!item.installmentPurchaseId ? (
              <button
                className="danger"
                disabled={processingId === item.id}
                onClick={() => onDelete(item)}
                type="button"
              >
                Excluir
              </button>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function BudgetCard({
  item,
  onEdit,
}: Readonly<{ item: CategorySpending; onEdit: () => void }>) {
  const percentage = Math.min(100, item.percentage ?? 0);
  return (
    <article className={`budget-card ${item.alert.toLowerCase()}`}>
      <div>
        <strong>{item.categoryName}</strong>
        <span>
          {item.budget === null
            ? "Sem teto definido"
            : `${formatCurrency(item.spent)} de ${formatCurrency(item.budget)}`}
        </span>
      </div>
      {item.budget !== null ? (
        <div
          className="budget-meter"
          aria-label={`${Math.round(item.percentage ?? 0)}% do orçamento utilizado`}
        >
          <span style={{ width: `${percentage}%` }} />
        </div>
      ) : null}
      <div className="budget-card-footer">
        <span>{getBudgetLabel(item)}</span>
        <button onClick={onEdit} type="button">
          {item.budget === null ? "Definir teto" : "Ajustar teto"}
        </button>
      </div>
    </article>
  );
}

function RecurrenceSection({
  categories,
  items,
  onCreate,
  onEdit,
  onEnd,
  processingId,
}: Readonly<{
  categories: FinancialCategory[];
  items: Recurrence[];
  onCreate: () => void;
  onEdit: (item: Recurrence) => void;
  onEnd: (item: Recurrence) => void;
  processingId: string | null;
}>) {
  return (
    <section
      className="finance-section recurrence-section"
      aria-labelledby="recurrences-title"
    >
      <div className="finance-section-heading">
        <div>
          <p>LANÇAMENTOS AUTOMÁTICOS</p>
          <h2 id="recurrences-title">Recorrências</h2>
        </div>
        <button
          className="finance-create compact"
          onClick={onCreate}
          type="button"
        >
          Nova recorrência
        </button>
      </div>
      {items.length === 0 ? (
        <div className="finance-empty">Nenhuma recorrência cadastrada.</div>
      ) : (
        <div className="recurrence-list">
          {items.map((item) => (
            <article key={item.id}>
              <div>
                <strong>
                  {item.description ||
                    getCategoryName(categories, item.categoryId)}
                </strong>
                <span>
                  {formatCurrency(item.amount)} · Início em{" "}
                  {formatDate(item.firstOccurrenceDate)}
                </span>
              </div>
              <span>{item.endedAt ? "Encerrada" : "Ativa"}</span>
              {!item.endedAt ? (
                <div>
                  <button
                    disabled={processingId === item.id}
                    onClick={() => onEdit(item)}
                    type="button"
                  >
                    Editar
                  </button>
                  <button
                    className="danger"
                    disabled={processingId === item.id}
                    onClick={() => onEnd(item)}
                    type="button"
                  >
                    Encerrar
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function Reports({
  report,
}: Readonly<{
  report: { comparison: MonthlySummary[]; projection: MonthlySummary[] };
}>) {
  const maximum = Math.max(
    1,
    ...report.comparison.flatMap((item) => [
      item.confirmedIncome,
      item.confirmedExpense,
    ]),
    ...report.projection.map((item) => Math.abs(item.projectedBalance)),
  );
  return (
    <section
      className="finance-section reports-section"
      aria-labelledby="reports-title"
    >
      <div className="finance-section-heading">
        <div>
          <p>ÚLTIMOS SEIS MESES</p>
          <h2 id="reports-title">Relatórios</h2>
        </div>
      </div>
      <div className="report-grid">
        <article>
          <h3>Receitas e despesas realizadas</h3>
          {report.comparison.map((item) => (
            <div className="report-row" key={item.month}>
              <span>{formatShortMonth(item.month)}</span>
              <div>
                <i
                  className="income-bar"
                  style={{
                    width: `${(item.confirmedIncome / maximum) * 100}%`,
                  }}
                />
                <i
                  className="expense-bar"
                  style={{
                    width: `${(item.confirmedExpense / maximum) * 100}%`,
                  }}
                />
              </div>
              <strong>{formatCurrency(item.confirmedBalance)}</strong>
            </div>
          ))}
        </article>
        <article>
          <h3>Saldo projetado</h3>
          {report.projection.map((item) => (
            <div className="report-row" key={item.month}>
              <span>{formatShortMonth(item.month)}</span>
              <div>
                <i
                  className={
                    item.projectedBalance < 0 ? "negative-bar" : "projected-bar"
                  }
                  style={{
                    width: `${(Math.abs(item.projectedBalance) / maximum) * 100}%`,
                  }}
                />
              </div>
              <strong>{formatCurrency(item.projectedBalance)}</strong>
            </div>
          ))}
        </article>
      </div>
    </section>
  );
}

function Modal({
  children,
  onCancel,
  title,
}: Readonly<{
  children: React.ReactNode;
  onCancel: () => void;
  title: string;
}>) {
  return (
    <div className="finance-modal-backdrop" role="presentation">
      <section
        aria-labelledby="finance-modal-title"
        aria-modal="true"
        className="finance-modal"
        role="dialog"
      >
        <header>
          <span id="finance-modal-title">{title.toUpperCase()}</span>
          <button aria-label="Fechar" onClick={onCancel} type="button">
            ×
          </button>
        </header>
        <div>{children}</div>
      </section>
    </div>
  );
}

function TransactionModal({
  categories,
  editor,
  isSaving,
  onCancel,
  onChange,
  onSave,
  title,
}: Readonly<{
  categories: FinancialCategory[];
  editor: TransactionEditor;
  isSaving: boolean;
  onCancel: () => void;
  onChange: (value: TransactionEditor) => void;
  onSave: () => void;
  title: string;
}>) {
  const availableCategories = categories.filter(
    (item) => item.type === editor.type,
  );
  return (
    <Modal onCancel={onCancel} title={title}>
      <div className="finance-form">
        <TypeButtons
          type={editor.type}
          onChange={(type) => onChange({ ...editor, categoryId: "", type })}
        />
        <FinanceFields
          categories={availableCategories}
          categoryId={editor.categoryId}
          onCategoryChange={(categoryId) => onChange({ ...editor, categoryId })}
          amount={editor.amount}
          onAmountChange={(amount) => onChange({ ...editor, amount })}
          description={editor.description}
          onDescriptionChange={(description) =>
            onChange({ ...editor, description })
          }
          paymentMethod={editor.paymentMethod}
          onPaymentMethodChange={(paymentMethod) =>
            onChange({ ...editor, paymentMethod })
          }
          date={editor.date}
          onDateChange={(date) => onChange({ ...editor, date })}
        />
        <StatusButtons
          status={editor.status}
          onChange={(status) => onChange({ ...editor, status })}
        />
        <ModalActions
          isSaving={isSaving}
          onCancel={onCancel}
          onSave={onSave}
          label="Salvar lançamento"
        />
      </div>
    </Modal>
  );
}

function RecurrenceModal({
  categories,
  editor,
  isSaving,
  onCancel,
  onChange,
  onSave,
  title,
}: Readonly<{
  categories: FinancialCategory[];
  editor: RecurrenceEditor;
  isSaving: boolean;
  onCancel: () => void;
  onChange: (value: RecurrenceEditor) => void;
  onSave: () => void;
  title: string;
}>) {
  const availableCategories = categories.filter(
    (item) => item.type === editor.type,
  );
  return (
    <Modal onCancel={onCancel} title={title}>
      <div className="finance-form">
        <p className="finance-form-note">
          A alteração encerra a regra atual e cria uma sucessora para os
          próximos lançamentos.
        </p>
        <TypeButtons
          type={editor.type}
          onChange={(type) => onChange({ ...editor, categoryId: "", type })}
        />
        <FinanceFields
          categories={availableCategories}
          categoryId={editor.categoryId}
          onCategoryChange={(categoryId) => onChange({ ...editor, categoryId })}
          amount={editor.amount}
          onAmountChange={(amount) => onChange({ ...editor, amount })}
          description={editor.description}
          onDescriptionChange={(description) =>
            onChange({ ...editor, description })
          }
          paymentMethod={editor.paymentMethod}
          onPaymentMethodChange={(paymentMethod) =>
            onChange({ ...editor, paymentMethod })
          }
          date={editor.firstOccurrenceDate}
          onDateChange={(firstOccurrenceDate) =>
            onChange({ ...editor, firstOccurrenceDate })
          }
          dateLabel="Primeira ocorrência"
        />
        <ModalActions
          isSaving={isSaving}
          onCancel={onCancel}
          onSave={onSave}
          label="Salvar recorrência"
        />
      </div>
    </Modal>
  );
}

function InstallmentModal({
  categories,
  editor,
  isSaving,
  onCancel,
  onChange,
  onSave,
  title,
}: Readonly<{
  categories: FinancialCategory[];
  editor: InstallmentEditor;
  isSaving: boolean;
  onCancel: () => void;
  onChange: (value: InstallmentEditor) => void;
  onSave: () => void;
  title: string;
}>) {
  return (
    <Modal onCancel={onCancel} title={title}>
      <div className="finance-form">
        <p className="finance-form-note">
          A primeira parcela absorve eventuais centavos do arredondamento.
        </p>
        <label>
          <span>Categoria de despesa</span>
          <select
            onChange={(event) =>
              onChange({ ...editor, categoryId: event.target.value })
            }
            value={editor.categoryId}
          >
            <option value="">Selecione</option>
            {categories
              .filter((item) => item.type === "Expense")
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </select>
        </label>
        <div className="finance-form-grid">
          <label>
            <span>Valor total</span>
            <input
              inputMode="decimal"
              onChange={(event) =>
                onChange({ ...editor, totalAmount: event.target.value })
              }
              value={editor.totalAmount}
            />
          </label>
          <label>
            <span>Parcelas</span>
            <input
              min="2"
              onChange={(event) =>
                onChange({ ...editor, installmentCount: event.target.value })
              }
              type="number"
              value={editor.installmentCount}
            />
          </label>
        </div>
        <label>
          <span>Primeira parcela</span>
          <input
            onChange={(event) =>
              onChange({ ...editor, firstInstallmentDate: event.target.value })
            }
            type="date"
            value={editor.firstInstallmentDate}
          />
        </label>
        <label>
          <span>Descrição</span>
          <input
            onChange={(event) =>
              onChange({ ...editor, description: event.target.value })
            }
            value={editor.description}
          />
        </label>
        <StatusButtons
          status={editor.status}
          onChange={(status) => onChange({ ...editor, status })}
        />
        <ModalActions
          isSaving={isSaving}
          onCancel={onCancel}
          onSave={onSave}
          label="Salvar compra"
        />
      </div>
    </Modal>
  );
}

function CategoryModal({
  editor,
  isSaving,
  onArchive,
  onCancel,
  onChange,
  onSave,
}: Readonly<{
  editor: { id: string | null; name: string; type: FinancialCategoryType };
  isSaving: boolean;
  onArchive?: () => void;
  onCancel: () => void;
  onChange: (value: {
    id: string | null;
    name: string;
    type: FinancialCategoryType;
  }) => void;
  onSave: () => void;
}>) {
  return (
    <Modal
      onCancel={onCancel}
      title={editor.id ? "Editar categoria" : "Nova categoria"}
    >
      <div className="finance-form">
        <label>
          <span>Nome</span>
          <input
            autoFocus
            onChange={(event) =>
              onChange({ ...editor, name: event.target.value })
            }
            value={editor.name}
          />
        </label>
        <TypeButtons
          type={editor.type}
          onChange={(type) => onChange({ ...editor, type })}
        />
        <div className="finance-modal-actions">
          {onArchive ? (
            <button className="danger" onClick={onArchive} type="button">
              Arquivar
            </button>
          ) : null}
          <button onClick={onCancel} type="button">
            Cancelar
          </button>
          <button
            className="primary"
            disabled={isSaving}
            onClick={onSave}
            type="button"
          >
            {isSaving ? "Salvando..." : "Salvar categoria"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function BudgetModal({
  amount,
  hasOverride,
  item,
  isSaving,
  mode,
  onCancel,
  onChangeAmount,
  onChangeMode,
  onDeleteOverride,
  onSave,
}: Readonly<{
  amount: string;
  hasOverride: boolean;
  item: CategorySpending;
  isSaving: boolean;
  mode: "recurring" | "override";
  onCancel: () => void;
  onChangeAmount: (value: string) => void;
  onChangeMode: (value: "recurring" | "override") => void;
  onDeleteOverride: () => void;
  onSave: () => void;
}>) {
  return (
    <Modal onCancel={onCancel} title={`Teto de ${item.categoryName}`}>
      <div className="finance-form">
        <p className="finance-form-note">
          O teto recorrente passa a valer no mês atual. A exceção altera somente
          o mês em análise.
        </p>
        <div className="finance-choice-buttons">
          <button
            className={mode === "recurring" ? "selected" : ""}
            onClick={() => onChangeMode("recurring")}
            type="button"
          >
            Teto recorrente
          </button>
          <button
            className={mode === "override" ? "selected" : ""}
            onClick={() => onChangeMode("override")}
            type="button"
          >
            Exceção mensal
          </button>
        </div>
        <label>
          <span>Valor do teto</span>
          <input
            autoFocus
            inputMode="decimal"
            onChange={(event) => onChangeAmount(event.target.value)}
            value={amount}
          />
        </label>
        <div className="finance-modal-actions">
          {mode === "override" && hasOverride ? (
            <button
              className="danger"
              disabled={isSaving}
              onClick={onDeleteOverride}
              type="button"
            >
              Restaurar recorrente
            </button>
          ) : null}
          <button onClick={onCancel} type="button">
            Cancelar
          </button>
          <button
            className="primary"
            disabled={isSaving}
            onClick={onSave}
            type="button"
          >
            {isSaving ? "Salvando..." : "Salvar teto"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function FinanceFields({
  amount,
  categories,
  categoryId,
  date,
  dateLabel = "Data",
  description,
  onAmountChange,
  onCategoryChange,
  onDateChange,
  onDescriptionChange,
  onPaymentMethodChange,
  paymentMethod,
}: Readonly<{
  amount: string;
  categories: FinancialCategory[];
  categoryId: string;
  date: string;
  dateLabel?: string;
  description: string;
  onAmountChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onPaymentMethodChange: (value: PaymentMethod) => void;
  paymentMethod: PaymentMethod;
}>) {
  return (
    <>
      <label>
        <span>Categoria</span>
        <select
          onChange={(event) => onCategoryChange(event.target.value)}
          value={categoryId}
        >
          <option value="">Selecione</option>
          {categories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <div className="finance-form-grid">
        <label>
          <span>Valor</span>
          <input
            inputMode="decimal"
            onChange={(event) => onAmountChange(event.target.value)}
            value={amount}
          />
        </label>
        <label>
          <span>{dateLabel}</span>
          <input
            onChange={(event) => onDateChange(event.target.value)}
            type="date"
            value={date}
          />
        </label>
      </div>
      <label>
        <span>Pagamento</span>
        <select
          onChange={(event) =>
            onPaymentMethodChange(event.target.value as PaymentMethod)
          }
          value={paymentMethod}
        >
          <option value="Pix">PIX</option>
          <option value="Credit">Crédito</option>
          <option value="Debit">Débito</option>
        </select>
      </label>
      <label>
        <span>Descrição</span>
        <input
          onChange={(event) => onDescriptionChange(event.target.value)}
          value={description}
        />
      </label>
    </>
  );
}

function TypeButtons({
  onChange,
  type,
}: Readonly<{
  onChange: (type: FinancialCategoryType) => void;
  type: FinancialCategoryType;
}>) {
  return (
    <fieldset className="finance-fieldset">
      <legend>Tipo</legend>
      <div className="finance-choice-buttons">
        <button
          className={type === "Expense" ? "selected expense" : ""}
          onClick={() => onChange("Expense")}
          type="button"
        >
          Despesa
        </button>
        <button
          className={type === "Income" ? "selected income" : ""}
          onClick={() => onChange("Income")}
          type="button"
        >
          Receita
        </button>
      </div>
    </fieldset>
  );
}

function StatusButtons({
  onChange,
  status,
}: Readonly<{
  onChange: (status: "Planned" | "Confirmed") => void;
  status: "Planned" | "Confirmed";
}>) {
  return (
    <fieldset className="finance-fieldset">
      <legend>Situação</legend>
      <div className="finance-choice-buttons">
        <button
          className={status === "Confirmed" ? "selected" : ""}
          onClick={() => onChange("Confirmed")}
          type="button"
        >
          Confirmado
        </button>
        <button
          className={status === "Planned" ? "selected" : ""}
          onClick={() => onChange("Planned")}
          type="button"
        >
          Planejado
        </button>
      </div>
    </fieldset>
  );
}

function ModalActions({
  isSaving,
  label,
  onCancel,
  onSave,
}: Readonly<{
  isSaving: boolean;
  label: string;
  onCancel: () => void;
  onSave: () => void;
}>) {
  return (
    <div className="finance-modal-actions">
      <button onClick={onCancel} type="button">
        Cancelar
      </button>
      <button
        className="primary"
        disabled={isSaving}
        onClick={onSave}
        type="button"
      >
        {isSaving ? "Salvando..." : label}
      </button>
    </div>
  );
}

function getCurrentMonth(): string {
  return getToday().slice(0, 7);
}
function getToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).formatToParts();
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
function getLastDayOfMonth(month: string): string {
  const date = new Date(`${month}T12:00:00Z`);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0))
    .toISOString()
    .slice(0, 10);
}
function getMonthOffset(month: string, offset: number): string {
  const date = new Date(`${month}T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
}
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(value);
}
function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(`${value}T12:00:00`));
}
function formatMonth(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}
function formatShortMonth(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    timeZone: "America/Sao_Paulo",
  })
    .format(new Date(`${value}T12:00:00`))
    .replace(".", "");
}
function getCategoryName(
  categories: FinancialCategory[],
  categoryId: string,
): string {
  return (
    categories.find((item) => item.id === categoryId)?.name ??
    "Categoria arquivada"
  );
}
function getStatusLabel(status: TransactionStatus): string {
  return { Confirmed: "Confirmado", Overdue: "Vencido", Planned: "Planejado" }[
    status
  ];
}
function getBudgetLabel(item: CategorySpending): string {
  if (item.budget === null) return "Defina um teto para acompanhar";
  if (item.alert === "Exceeded")
    return `Excedido em ${formatCurrency(Math.abs(item.remaining ?? 0))}`;
  if (item.alert === "AtLimit") return "Teto atingido";
  if (item.alert === "EightyPercent")
    return `${Math.round(item.percentage ?? 0)}% utilizado`;
  return `Restam ${formatCurrency(item.remaining ?? 0)}`;
}
function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Não foi possível concluir esta ação.";
}

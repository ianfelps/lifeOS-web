"use client";

import { useState } from "react";

export type Confirmation = {
  confirmLabel: string;
  description: string;
  onConfirm: () => Promise<void>;
  secondaryAction?: {
    label: string;
    onConfirm: () => Promise<void>;
  };
  title: string;
};

export function ConfirmationModal({
  confirmation,
  onCancel,
}: Readonly<{ confirmation: Confirmation; onCancel: () => void }>) {
  const [confirmingAction, setConfirmingAction] = useState<
    "primary" | "secondary" | null
  >(null);
  const isConfirming = confirmingAction !== null;

  async function confirm(
    action: "primary" | "secondary",
    handler: () => Promise<void>,
  ) {
    setConfirmingAction(action);
    try {
      await handler();
      onCancel();
    } finally {
      setConfirmingAction(null);
    }
  }

  const { secondaryAction } = confirmation;

  return (
    <div className="confirmation-modal-backdrop" role="presentation">
      <section
        aria-labelledby="confirmation-modal-title"
        aria-modal="true"
        className="confirmation-modal"
        role="dialog"
      >
        <header>
          <span id="confirmation-modal-title">
            {confirmation.title.toUpperCase()}
          </span>
          <button
            aria-label="Fechar"
            disabled={isConfirming}
            onClick={onCancel}
            type="button"
          >
            ×
          </button>
        </header>
        <div>
          <p>{confirmation.description}</p>
          <div className="confirmation-modal-actions">
            <button disabled={isConfirming} onClick={onCancel} type="button">
              Voltar
            </button>
            {secondaryAction ? (
              <button
                className="danger"
                disabled={isConfirming}
                onClick={() =>
                  void confirm("secondary", secondaryAction.onConfirm)
                }
                type="button"
              >
                {confirmingAction === "secondary"
                  ? "Confirmando..."
                  : secondaryAction.label}
              </button>
            ) : null}
            <button
              className="danger"
              disabled={isConfirming}
              onClick={() => void confirm("primary", confirmation.onConfirm)}
              type="button"
            >
              {confirmingAction === "primary"
                ? "Confirmando..."
                : confirmation.confirmLabel}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

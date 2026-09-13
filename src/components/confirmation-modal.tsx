"use client";

import { useState } from "react";

export type Confirmation = {
  confirmLabel: string;
  description: string;
  onConfirm: () => Promise<void>;
  title: string;
};

export function ConfirmationModal({
  confirmation,
  onCancel,
}: Readonly<{ confirmation: Confirmation; onCancel: () => void }>) {
  const [isConfirming, setIsConfirming] = useState(false);

  async function confirm() {
    setIsConfirming(true);
    try {
      await confirmation.onConfirm();
      onCancel();
    } finally {
      setIsConfirming(false);
    }
  }

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
            <button
              className="danger"
              disabled={isConfirming}
              onClick={() => void confirm()}
              type="button"
            >
              {isConfirming ? "Confirmando..." : confirmation.confirmLabel}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

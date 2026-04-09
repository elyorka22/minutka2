"use client";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

export function ConfirmActionDialog({
  open,
  title,
  message,
  confirmLabel = "Tasdiqlash",
  cancelLabel = "Bekor qilish",
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;
  return (
    <div className="fd-admin-confirm-backdrop" onClick={onCancel} role="button" aria-label="Yopish">
      <div className="fd-admin-confirm-card" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p className="fd-checkout-meta">{message}</p>
        <div className="fd-admin-confirm-actions">
          <button type="button" className="fd-btn" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="fd-btn fd-btn--secondary" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

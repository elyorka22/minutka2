"use client";

import { type AdminUiMessage } from "../../lib/admin.types";

export function AsyncStatusBar({ message }: { message: AdminUiMessage | null }) {
  if (!message?.text) return null;
  const color =
    message.kind === "success"
      ? "var(--color-success, #16a34a)"
      : message.kind === "error"
        ? "var(--color-orange)"
        : "var(--color-text-secondary)";
  return (
    <div className="fd-admin-status-bar" style={{ color }}>
      {message.text}
    </div>
  );
}

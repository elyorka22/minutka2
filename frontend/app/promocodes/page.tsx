"use client";

import Link from "next/link";
import { BackLink } from "../../components/BackLink";
import { getAccessToken } from "../../lib/auth-tokens";

const mockPromos = [
  { code: "MINUTKA10", description: "Birinchi buyurtmaga 10% chegirma", status: "Yaqinda" },
  { code: "FASTFOOD20", description: "Fast food bo‘limida 20 000 so‘mgacha chegirma", status: "Yaqinda" },
  { code: "CHUSTFREE", description: "Tanlangan hududlar uchun bepul yetkazib berish", status: "Yaqinda" },
];

export default function PromocodesPage() {
  const hasToken = typeof window !== "undefined" && !!getAccessToken();

  if (!hasToken) {
    return (
      <div className="fd-shell fd-section">
        <BackLink href="/profile" />
        <h1 className="fd-section-title">Promokodlar</h1>
        <p className="fd-card-desc">
          Promokodlardan foydalanish uchun tizimga kiring.
        </p>
        <Link className="fd-btn fd-btn-primary" href="/login?next=/promocodes">
          Kirish
        </Link>
      </div>
    );
  }

  return (
    <div className="fd-shell fd-section">
      <BackLink href="/profile" />
      <h1 className="fd-section-title">Promokodlar</h1>
      <p className="fd-card-desc">Hozircha bu bo‘lim vizual holatda. Tez orada faollashtiriladi.</p>
      <div className="fd-grid">
        {mockPromos.map((p) => (
          <div key={p.code} className="fd-card">
            <div className="fd-card-body">
              <h3 style={{ margin: 0 }}>{p.code}</h3>
              <p className="fd-card-desc" style={{ marginTop: 8 }}>{p.description}</p>
              <span className="fd-badge">{p.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

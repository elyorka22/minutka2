"use client";

import Link from "next/link";
import { type AdminTab, type TabId } from "../../lib/admin.types";

type Props = {
  tabs: AdminTab[];
  activeTab: TabId;
  tabsOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSelectTab: (id: TabId) => void;
  onLogout: () => Promise<void> | void;
};

export function AdminTabsNav({
  tabs,
  activeTab,
  tabsOpen,
  onOpen,
  onClose,
  onSelectTab,
  onLogout,
}: Props) {
  return (
    <>
      <header className="fd-admin-header">
        <button type="button" className="fd-btn fd-btn-primary" aria-label="Menyu" onClick={onOpen}>
          <span className="material-symbols-rounded" style={{ fontSize: 24 }}>
            menu
          </span>
          <span style={{ marginLeft: 6 }}>Menyu</span>
        </button>
      </header>

      {tabsOpen && (
        <>
          <div className="fd-admin-sidebar-backdrop" role="button" aria-label="Yopish" onClick={onClose} />
          <nav className="fd-admin-sidebar">
            <div className="fd-admin-sidebar-title">Bo‘limlar</div>
            <div className="fd-admin-mobile-tab-select-wrap">
              <label htmlFor="fd-admin-mobile-tab-select" className="fd-checkout-meta">
                Bo‘limni tanlang
              </label>
              <select
                id="fd-admin-mobile-tab-select"
                className="fd-admin-mobile-tab-select"
                value={activeTab}
                onChange={(e) => onSelectTab(e.target.value as TabId)}
              >
                {tabs.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`fd-admin-tab ${activeTab === t.id ? "fd-admin-tab-active" : ""}`}
                onClick={() => onSelectTab(t.id)}
              >
                {t.label}
              </button>
            ))}
            <div className="fd-admin-sidebar-footer">
              <button type="button" className="fd-admin-sidebar-back-link fd-admin-sidebar-logout" onClick={onLogout}>
                Chiqish
              </button>
              <Link href="/" className="fd-admin-sidebar-back-link" onClick={onClose}>
                Saytga qaytish
              </Link>
            </div>
          </nav>
        </>
      )}
    </>
  );
}

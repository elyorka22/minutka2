"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BackLink } from "../../components/BackLink";
import { SafeImage } from "../../components/SafeImage";
import { api, imageUrl } from "../../lib/api";

const POPULAR = ["Osh", "Burger", "Pizza", "Somsa", "Lag‘mon"];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .getRestaurants()
      .then((data) => {
        if (active) setList(Array.isArray(data) ? data.filter((r: any) => !r.isSupermarket) : []);
      })
      .catch(() => {
        if (active) setList([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return list.filter((r) => {
      const name = String(r?.name ?? "").toLowerCase();
      const desc = String(r?.description ?? "").toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [list, query]);

  return (
    <div className="fd-shell fd-page-listing">
      <BackLink href="/" />
      <section className="fd-section" style={{ paddingTop: 8 }}>
        <h1 className="fd-section-title" style={{ marginBottom: 16 }}>
          Qidiruv
        </h1>
        <label className="fd-label" htmlFor="search-field" style={{ display: "block", marginBottom: 8 }}>
          Restoran yoki taom
        </label>
        <div style={{ position: "relative", marginBottom: 20 }}>
          <span
            className="material-symbols-rounded"
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 22,
              color: "var(--color-text-secondary)",
              pointerEvents: "none",
            }}
            aria-hidden
          >
            search
          </span>
          <input
            id="search-field"
            className="fd-input"
            type="search"
            placeholder="Restoran yoki taom nomi..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ paddingLeft: 44, minHeight: 48, borderRadius: 14 }}
            autoComplete="off"
          />
        </div>

        <p className="fd-checkout-meta" style={{ marginBottom: 8, fontWeight: 600 }}>
          Mashhur qidiruvlar
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
          {POPULAR.map((tag) => (
            <button
              key={tag}
              type="button"
              className="fd-btn"
              style={{ borderRadius: 9999, fontSize: "0.9rem" }}
              onClick={() => setQuery(tag)}
            >
              {tag}
            </button>
          ))}
        </div>

        {loading && <p className="fd-checkout-meta">Yuklanmoqda…</p>}
        {!loading && query.trim() && filtered.length === 0 && (
          <p className="fd-empty">Natija topilmadi.</p>
        )}
        {!loading && query.trim() && filtered.length > 0 && (
          <div className="fd-grid fd-grid--barcha-home">
            {filtered.map((r: any) => (
              <Link key={r.id} href={`/restaurants/${r.id}`} className="fd-card">
                <SafeImage
                  src={(r.coverUrl || r.logoUrl) ? imageUrl(r.coverUrl || r.logoUrl) : ""}
                  alt=""
                  className="fd-card-image"
                  width={400}
                  height={300}
                  quality={76}
                  style={{ width: "100%", height: "auto", objectFit: "cover", aspectRatio: "4/3" }}
                  fallbackStyle={{ height: 140 }}
                  sizes="(max-width: 640px) 50vw, 400px"
                />
                <div className="fd-card-body">
                  <div className="fd-card-title-row">
                    <h3>{r.name}</h3>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

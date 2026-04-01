"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { FormEvent, useMemo, useState } from "react";
import { BackLink } from "../../components/BackLink";
import { getAccessToken } from "../../lib/auth-tokens";
import { getApproxCityCenter } from "../../lib/map-defaults";
import {
  addSavedAddressForCurrentUser,
  getSavedAddressesForCurrentUser,
  removeSavedAddressForCurrentUser,
} from "../../lib/saved-addresses";

const AddressMapPicker = dynamic(
  () => import("../../components/CheckoutMapPicker").then((m) => m.CheckoutMapPicker),
  {
    ssr: false,
    loading: () => <p className="fd-checkout-meta">Xarita yuklanmoqda…</p>,
  },
);

export default function AddressesPage() {
  const hasToken = typeof window !== "undefined" && !!getAccessToken();
  const [label, setLabel] = useState("");
  const [city, setCity] = useState("Chust");
  const [street, setStreet] = useState("");
  const [details, setDetails] = useState("");
  const [pickLat, setPickLat] = useState(() => getApproxCityCenter("Chust").lat);
  const [pickLng, setPickLng] = useState(() => getApproxCityCenter("Chust").lng);
  const [mapNonce, setMapNonce] = useState(0);
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const addresses = useMemo(() => {
    tick;
    return getSavedAddressesForCurrentUser();
  }, [tick]);

  function refresh() {
    setTick((x) => x + 1);
  }

  function applyCityCenterToMap() {
    const c = getApproxCityCenter(city);
    setPickLat(c.lat);
    setPickLng(c.lng);
    setMapNonce((n) => n + 1);
  }

  function setPickCoords(latitude: number, longitude: number) {
    setPickLat(latitude);
    setPickLng(longitude);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setNote(null);
    if (!label.trim() || !city.trim() || !street.trim()) {
      setNote("Nomi, shahar va ko‘cha to‘ldirilishi shart.");
      return;
    }
    if (!Number.isFinite(pickLat) || !Number.isFinite(pickLng)) {
      setNote("Xaritada yetkazib berish nuqtasini belgilang.");
      return;
    }
    const created = addSavedAddressForCurrentUser({
      label: label.trim(),
      city: city.trim(),
      street: street.trim(),
      details: details.trim() || undefined,
      latitude: pickLat,
      longitude: pickLng,
      phone: phone.trim() || undefined,
    });
    if (!created) {
      setNote("Manzilni saqlash uchun avval tizimga kiring.");
      return;
    }
    setLabel("");
    setStreet("");
    setDetails("");
    setPhone("");
    refresh();
    setNote("Manzil saqlandi.");
  }

  if (!hasToken) {
    return (
      <div className="fd-shell fd-section">
        <BackLink href="/profile" />
        <h1 className="fd-section-title">Mening manzillarim</h1>
        <p className="fd-card-desc">
          Manzillarni saqlash va checkoutda tez tanlash uchun tizimga kiring.
        </p>
        <Link className="fd-btn fd-btn-primary" href="/login?next=/addresses">
          Kirish
        </Link>
      </div>
    );
  }

  return (
    <div className="fd-shell fd-section">
      <BackLink href="/profile" />
      <h1 className="fd-section-title">Mening manzillarim</h1>
      <form onSubmit={handleSubmit} className="fd-form" style={{ marginBottom: 16 }}>
        <label className="fd-field">
          <span>Nomi (masalan, Uy)</span>
          <input value={label} onChange={(e) => setLabel(e.target.value)} required />
        </label>
        <label className="fd-field">
          <span>Shahar</span>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onBlur={applyCityCenterToMap}
            required
          />
        </label>
        <label className="fd-field">
          <span>Ko‘cha/manzil</span>
          <input value={street} onChange={(e) => setStreet(e.target.value)} required />
        </label>
        <label className="fd-field">
          <span>Qo‘shimcha</span>
          <input value={details} onChange={(e) => setDetails(e.target.value)} />
        </label>
        <div className="fd-field">
          <span>Yetkazib berish nuqtasi (xarita)</span>
          <p className="fd-checkout-meta" style={{ marginBottom: 8 }}>
            Shahar o‘zgarganda xarita markazi yangilanadi. Nuqtani bosing yoki belgini sudrang — joylashuv
            saqlanadi, raqamlarni kiritish shart emas.
          </p>
          <AddressMapPicker
            key={mapNonce}
            lat={pickLat}
            lng={pickLng}
            onChange={setPickCoords}
            height={280}
          />
        </div>
        <label className="fd-field">
          <span>Telefon (9 raqam, ixtiyoriy)</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 9))}
            inputMode="numeric"
            placeholder="901234567"
          />
        </label>
        {note && <p className="fd-checkout-meta">{note}</p>}
        <button className="fd-btn fd-btn-primary" type="submit">
          Manzilni saqlash
        </button>
      </form>

      <div className="fd-grid">
        {addresses.map((a) => (
          <div key={a.id} className="fd-checkout-item">
            <div>
              <strong>{a.label}</strong>
              <div className="fd-checkout-meta">
                {a.street}, {a.city}
              </div>
              {a.phone && <div className="fd-checkout-meta">+998{a.phone}</div>}
            </div>
            <button
              type="button"
              className="fd-btn"
              onClick={() => {
                removeSavedAddressForCurrentUser(a.id);
                refresh();
              }}
            >
              O‘chirish
            </button>
          </div>
        ))}
        {addresses.length === 0 && <p className="fd-empty">Hozircha saqlangan manzil yo‘q.</p>}
      </div>
    </div>
  );
}

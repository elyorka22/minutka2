"use client";

import { FormEvent, useState } from "react";
import { useCart } from "../../components/CartContext";
import { BackLink } from "../../components/BackLink";

export default function CheckoutPage() {
  const { items, total, clear, changeQuantity } = useCart();
  const [submitted, setSubmitted] = useState(false);

  const [street, setStreet] = useState("");
  const [phone, setPhone] = useState("");
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");
  const [paymentMethod] = useState<"CARD" | "CASH">("CASH");
  const [addressMode, setAddressMode] = useState<"manual" | "auto">("manual");
  const [autoAddressConfirmed, setAutoAddressConfirmed] = useState(false);
  const [geoStatus, setGeoStatus] = useState<"idle" | "success" | "error">("idle");

  function handleGeoClick() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoStatus("error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setAutoAddressConfirmed(true);
        setGeoStatus("success");
      },
      () => {
        setGeoStatus("error");
      },
    );
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // Здесь позже можно вызвать реальный бэкенд с JWT и
    // передать адрес, координаты и способ оплаты.
    setSubmitted(true);
    clear();
  }

  const hasCoords = lat && lng;
  const latNum = Number(lat);
  const lngNum = Number(lng);
  const bbox = hasCoords
    ? `${lngNum - 0.01},${latNum - 0.01},${lngNum + 0.01},${latNum + 0.01}`
    : "";

  return (
    <div className="fd-shell fd-checkout">
      <BackLink href="/" />
      <h1 className="fd-section-title">Buyurtmani rasmiylashtirish</h1>
      <div className="fd-checkout-layout">
        <section className="fd-checkout-cart">
          <h2>Savat</h2>
          {items.length === 0 && <p className="fd-empty">Savat bo‘sh.</p>}
          {items.map((item) => {
            const id = item.dish.id;
            const lineTotal = (item.dish.price * item.quantity).toFixed(0);

            return (
              <div key={id} className="fd-checkout-item">
                <div>
                  <div>{item.dish.name}</div>
                  <div className="fd-checkout-meta">
                    {item.dish.price.toFixed(0)} so&apos;m / dona
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div className="fd-qty">
                    <button
                      type="button"
                      className="fd-qty-btn"
                      onClick={() => changeQuantity(id, item.quantity - 1)}
                    >
                      −
                    </button>
                    <span className="fd-qty-value">{item.quantity}</span>
                    <button
                      type="button"
                      className="fd-qty-btn"
                      onClick={() => changeQuantity(id, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                  <div className="fd-price">{lineTotal} so&apos;m</div>
                </div>
              </div>
            );
          })}
          {items.length > 0 && (
            <div className="fd-checkout-total">
              <span>Jami:</span>
              <span className="fd-price">{total.toFixed(0)} so&apos;m</span>
            </div>
          )}
        </section>

        <section className="fd-checkout-form">
          <h2>Manzil, geolokatsiya va to‘lov</h2>
          {submitted ? (
            <p className="fd-success">
              Buyurtma yuborildi (demo). Real loyihada bu yerda buyurtma holati bo‘ladi.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="fd-form">
              <fieldset className="fd-field">
                <span>Manzilni ko‘rsatish usuli</span>
                <div className="fd-radio-group">
                  <label>
                    <input
                      type="radio"
                      checked={addressMode === "manual"}
                      onChange={() => setAddressMode("manual")}
                    />
                    <span>Manzilni qo‘lda kiritaman</span>
                  </label>
                  <label>
                    <input
                      type="radio"
                      checked={addressMode === "auto"}
                      onChange={() => setAddressMode("auto")}
                    />
                    <span>Manzilni geolokatsiya orqali aniqlash</span>
                  </label>
                </div>
              </fieldset>

              {addressMode === "manual" && (
                <>
                  <label className="fd-field">
                    <span>Ko‘cha va uy</span>
                    <input
                      required
                      placeholder="Masalan: Chilonzor, 1"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                    />
                  </label>
                </>
              )}

              {addressMode === "auto" && (
                <div className="fd-field">
                  <span>Geolokatsiya</span>
                  <button
                    type="button"
                    className="fd-btn fd-geo-btn"
                    style={
                      geoStatus === "success"
                        ? { backgroundColor: "#16a34a", borderColor: "#16a34a" }
                        : geoStatus === "error"
                          ? { backgroundColor: "#dc2626", borderColor: "#dc2626" }
                          : undefined
                    }
                    onClick={handleGeoClick}
                  >
                    {geoStatus === "success"
                      ? "Geolokatsiya aniqlangan"
                      : geoStatus === "error"
                        ? "Geolokatsiya xatosi"
                        : "Mening geolokatsiyamni ishlatish"}
                  </button>
                  {autoAddressConfirmed && (
                    <p className="fd-checkout-meta">
                      Manzilingiz geolokatsiya orqali aniqlanadi va kuryer bilan aniqlashtiriladi.
                    </p>
                  )}
                  {geoStatus === "error" && (
                    <p className="fd-checkout-meta">
                      Geolokatsiyani aniqlashning imkoni bo‘lmadi. Manzilni qo‘lda kiriting.
                    </p>
                  )}
                </div>
              )}

              {addressMode === "manual" && hasCoords && (
                <div className="fd-map-wrap">
                  <iframe
                    title="Карта доставки"
                    loading="lazy"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latNum},${lngNum}`}
                  />
                </div>
              )}

              <label className="fd-field">
                <span>Telefon raqami *</span>
                <input
                  required
                  placeholder="+998 90 123 45 67"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                />
              </label>

              <button
                className="fd-btn fd-btn-primary"
                type="submit"
                disabled={items.length === 0}
              >
                Buyurtmani tasdiqlash
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}

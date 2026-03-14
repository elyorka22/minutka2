"use client";

import { FormEvent, useState, useEffect } from "react";
import { useCart } from "../../components/CartContext";
import { BackLink } from "../../components/BackLink";
import { api } from "../../lib/api";

export default function CheckoutPage() {
  const { items, total, clear, changeQuantity, restaurantId } = useCart();
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [street, setStreet] = useState("");
  const [phone, setPhone] = useState("");
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");
  const [paymentMethod] = useState<"CARD" | "CASH">("CASH");
  const [addressMode, setAddressMode] = useState<"manual" | "auto">("manual");
  const [autoAddressConfirmed, setAutoAddressConfirmed] = useState(false);
  const [geoStatus, setGeoStatus] = useState<"idle" | "success" | "error">("idle");

  const needRestaurant = items.length > 0 && !restaurantId;

  useEffect(() => {
    if (needRestaurant && items.length > 0) {
      clear();
    }
  }, [needRestaurant, items.length, clear]);

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!restaurantId || items.length === 0) {
      setSubmitError("Savat bo‘sh yoki restoran aniqlanmadi. Taomlarni qayta qo‘shing.");
      return;
    }
    const streetVal = addressMode === "auto" ? "Geolokatsiya orqali" : street.trim();
    if (!streetVal) {
      setSubmitError("Manzilni kiriting yoki geolokatsiyani ishlating.");
      return;
    }
    setLoading(true);
    try {
      await api.createOrder({
        restaurantId,
        address: {
          street: streetVal,
          city: "Toshkent",
          details: phone.trim() ? `Tel: ${phone.trim()}` : undefined,
          latitude: lat ? Number(lat) : 0,
          longitude: lng ? Number(lng) : 0,
        },
        items: items.map((i) => ({ dishId: i.dish.id, quantity: i.quantity })),
        comment: phone.trim() ? `Tel: ${phone.trim()}` : undefined,
        paymentMethod,
      });
      clear();
      setSubmitted(true);
    } catch (err: any) {
      setSubmitError(err?.message ?? "Buyurtma yuborilmadi. Qayta urinib ko‘ring.");
    } finally {
      setLoading(false);
    }
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
              Buyurtma qabul qilindi. Restoran tez orada siz bilan bog‘lanadi.
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

              {submitError && (
                <p style={{ color: "var(--color-orange)", fontSize: "0.875rem", marginBottom: 8 }}>
                  {submitError}
                </p>
              )}

              <button
                className="fd-btn fd-btn-primary"
                type="submit"
                disabled={items.length === 0 || loading}
              >
                {loading ? "Yuborilmoqda..." : "Buyurtmani tasdiqlash"}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}

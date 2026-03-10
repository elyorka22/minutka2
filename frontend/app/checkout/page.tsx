"use client";

import { FormEvent, useState } from "react";
import { useCart } from "../../components/CartContext";

export default function CheckoutPage() {
  const { items, total, clear } = useCart();
  const [submitted, setSubmitted] = useState(false);

  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [comment, setComment] = useState("");
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"CARD" | "CASH">("CASH");

  function handleGeoClick() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      alert("Геолокация не поддерживается в этом браузере.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
      },
      () => {
        alert("Не удалось получить геолокацию.");
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
      <h1 className="fd-section-title">Buyurtmani rasmiylashtirish</h1>
      <div className="fd-checkout-layout">
        <section className="fd-checkout-cart">
          <h2>Savat</h2>
          {items.length === 0 && <p className="fd-empty">Savat bo‘sh.</p>}
          {items.map((item) => (
            <div key={item.dish.id} className="fd-checkout-item">
              <div>
                <div>{item.dish.name}</div>
                <div className="fd-checkout-meta">
                  {item.quantity} × {item.dish.price.toFixed(0)} so&apos;m
                </div>
              </div>
              <div className="fd-price">
                {(item.dish.price * item.quantity).toFixed(0)} so&apos;m
              </div>
            </div>
          ))}
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
              <label className="fd-field">
                <span>Ko‘cha va uy</span>
                <input
                  required
                  placeholder="Masalan: Chilonzor, 1"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                />
              </label>
              <label className="fd-field">
                <span>Shahar</span>
                <input
                  required
                  placeholder="Toshkent"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </label>

              <div className="fd-field">
                <span>Geolokatsiya (kenglik va uzunlik)</span>
                <div className="fd-geo-inputs">
                  <input placeholder="Kenglik" value={lat} onChange={(e) => setLat(e.target.value)} />
                  <input placeholder="Uzunlik" value={lng} onChange={(e) => setLng(e.target.value)} />
                </div>
                <button type="button" className="fd-btn fd-geo-btn" onClick={handleGeoClick}>
                  Mening geolokatsiyamni ishlatish
                </button>
              </div>

              {hasCoords && (
                <div className="fd-map-wrap">
                  <iframe
                    title="Карта доставки"
                    loading="lazy"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latNum},${lngNum}`}
                  />
                </div>
              )}

              <fieldset className="fd-field">
                <span>To‘lov usuli</span>
                <div className="fd-radio-group">
                  <label>
                    <input
                      type="radio"
                      checked={paymentMethod === "CASH"}
                      onChange={() => setPaymentMethod("CASH")}
                    />
                    <span>Kuryerga naqd</span>
                  </label>
                  <label>
                    <input
                      type="radio"
                      checked={paymentMethod === "CARD"}
                      onChange={() => setPaymentMethod("CARD")}
                    />
                    <span>Onlayn karta (demo)</span>
                  </label>
                </div>
              </fieldset>

              <label className="fd-field">
                <span>Izoh</span>
                <textarea
                  placeholder="Masalan: piyozsiz, yetkazilganda qo‘ng‘iroq qiling"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
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

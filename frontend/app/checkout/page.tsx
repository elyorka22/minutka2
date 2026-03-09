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
      <h1 className="fd-section-title">Оформление заказа</h1>
      <div className="fd-checkout-layout">
        <section className="fd-checkout-cart">
          <h2>Корзина</h2>
          {items.length === 0 && <p className="fd-empty">Корзина пуста.</p>}
          {items.map((item) => (
            <div key={item.dish.id} className="fd-checkout-item">
              <div>
                <div>{item.dish.name}</div>
                <div className="fd-checkout-meta">
                  {item.quantity} × {item.dish.price.toFixed(0)} ₽
                </div>
              </div>
              <div className="fd-price">
                {(item.dish.price * item.quantity).toFixed(0)} ₽
              </div>
            </div>
          ))}
          {items.length > 0 && (
            <div className="fd-checkout-total">
              <span>Итого:</span>
              <span className="fd-price">{total.toFixed(0)} ₽</span>
            </div>
          )}
        </section>

        <section className="fd-checkout-form">
          <h2>Адрес, геолокация и оплата</h2>
          {submitted ? (
            <p className="fd-success">
              Заказ отправлен (демо). В реальном проекте здесь будет статус заказа.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="fd-form">
              <label className="fd-field">
                <span>Улица и дом</span>
                <input
                  required
                  placeholder="ул. Пример, 1"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                />
              </label>
              <label className="fd-field">
                <span>Город</span>
                <input
                  required
                  placeholder="Москва"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </label>

              <div className="fd-field">
                <span>Геолокация (широта и долгота)</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    style={{ flex: 1 }}
                    placeholder="Широта"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                  />
                  <input
                    style={{ flex: 1 }}
                    placeholder="Долгота"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="fd-btn"
                  style={{ marginTop: 8, alignSelf: "flex-start" }}
                  onClick={handleGeoClick}
                >
                  Использовать мою геопозицию
                </button>
              </div>

              {hasCoords && (
                <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.15)" }}>
                  <iframe
                    title="Карта доставки"
                    width="100%"
                    height="220"
                    style={{ border: 0 }}
                    loading="lazy"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latNum},${lngNum}`}
                  />
                </div>
              )}

              <fieldset className="fd-field" style={{ border: "none", padding: 0 }}>
                <span>Способ оплаты</span>
                <div style={{ display: "flex", gap: 12 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <input
                      type="radio"
                      checked={paymentMethod === "CASH"}
                      onChange={() => setPaymentMethod("CASH")}
                    />
                    <span>Наличными курьеру</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <input
                      type="radio"
                      checked={paymentMethod === "CARD"}
                      onChange={() => setPaymentMethod("CARD")}
                    />
                    <span>Картой онлайн (демо)</span>
                  </label>
                </div>
              </fieldset>

              <label className="fd-field">
                <span>Комментарий</span>
                <textarea
                  placeholder="Например: без лука, позвонить при доставке"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </label>

              <button
                className="fd-btn fd-btn-primary"
                type="submit"
                disabled={items.length === 0}
              >
                Подтвердить заказ
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}

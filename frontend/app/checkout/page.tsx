"use client";

import { FormEvent, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useCart } from "../../components/CartContext";
import { BackLink } from "../../components/BackLink";
import { api } from "../../lib/api";
import { CHUST_DEFAULT_COORDS } from "../../lib/map-defaults";
import { getAccessToken } from "../../lib/auth-tokens";
import { getSavedAddressesForCurrentUser, type SavedAddress } from "../../lib/saved-addresses";
import { isOpenNowByWorkingHours } from "../../lib/workingHours";
import { adminApi } from "../../lib/adminApi";
import { useOrderTracking } from "../../components/OrderTrackingContext";
import { OrderTrackingCartPanel } from "../../components/OrderTrackingCartPanel";

const CheckoutMapPicker = dynamic(
  () => import("../../components/CheckoutMapPicker").then((m) => m.CheckoutMapPicker),
  {
    ssr: false,
    loading: () => <p className="fd-checkout-meta">Xarita yuklanmoqda…</p>,
  },
);

const STREET_FROM_MAP = "Xaritada belgilangan nuqta";
const STREET_FROM_GEO = "Geolokatsiya orqali";
export default function CheckoutPage() {
  const { items, total, clear, changeQuantity, restaurantId } = useCart();
  const { setTrackingOrderId } = useOrderTracking();
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [phone, setPhone] = useState("");
  const [lat, setLat] = useState<string>(CHUST_DEFAULT_COORDS.lat.toFixed(6));
  const [lng, setLng] = useState<string>(CHUST_DEFAULT_COORDS.lng.toFixed(6));
  const [paymentMethod] = useState<"CARD" | "CASH">("CASH");
  /** map — xaritada belgi; geo — brauzer geolokatsiyasi */
  const [addressMode, setAddressMode] = useState<"map" | "geo">("geo");
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [geoLoadingDots, setGeoLoadingDots] = useState(0);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState("");
  const [restaurantWorkingHours, setRestaurantWorkingHours] = useState("");
  const [restaurantDeliveryFee, setRestaurantDeliveryFee] = useState(0);
  const [placedOrderTotal, setPlacedOrderTotal] = useState<number | null>(null);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [receivedBusy, setReceivedBusy] = useState(false);
  const [receivedDone, setReceivedDone] = useState(false);
  const [confirmModalText, setConfirmModalText] = useState<string | null>(null);

  const needRestaurant = items.length > 0 && !restaurantId;

  useEffect(() => {
    if (needRestaurant && items.length > 0) {
      clear();
    }
  }, [needRestaurant, items.length, clear]);

  function setCoords(latitude: number, longitude: number) {
    setLat(latitude.toFixed(6));
    setLng(longitude.toFixed(6));
  }

  function handleGeoClick() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoStatus("error");
      return;
    }
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords(pos.coords.latitude, pos.coords.longitude);
        setGeoStatus("success");
      },
      () => {
        setGeoStatus("error");
      },
    );
  }

  useEffect(() => {
    if (geoStatus !== "loading") {
      setGeoLoadingDots(0);
      return;
    }
    const t = setInterval(() => {
      setGeoLoadingDots((prev) => (prev + 1) % 4);
    }, 350);
    return () => clearInterval(t);
  }, [geoStatus]);

  useEffect(() => {
    if (addressMode === "geo") {
      setGeoStatus("idle");
    }
  }, [addressMode]);

  useEffect(() => {
    // By default, start in auto geolocation mode and request coordinates immediately.
    if (addressMode === "geo" && geoStatus === "idle") {
      handleGeoClick();
    }
  }, [addressMode, geoStatus]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!getAccessToken()) {
      setSavedAddresses([]);
      return;
    }
    setSavedAddresses(getSavedAddressesForCurrentUser());
  }, []);

  const selectedSavedAddress = savedAddresses.find((x) => x.id === selectedSavedAddressId) ?? null;

  useEffect(() => {
    if (!selectedSavedAddress) return;
    setCoords(selectedSavedAddress.latitude, selectedSavedAddress.longitude);
    if (selectedSavedAddress.phone) setPhone(selectedSavedAddress.phone);
  }, [selectedSavedAddressId]);

  useEffect(() => {
    let active = true;
    if (!restaurantId) {
      setRestaurantWorkingHours("");
      setRestaurantDeliveryFee(0);
      return;
    }
    api
      .getRestaurant(restaurantId)
      .then((r: any) => {
        if (!active) return;
        setRestaurantWorkingHours(String(r?.workingHours ?? ""));
        const fee = Number(r?.deliveryFee);
        setRestaurantDeliveryFee(Number.isFinite(fee) ? Math.max(0, fee) : 0);
      })
      .catch(() => {
        if (!active) return;
        setRestaurantWorkingHours("");
        setRestaurantDeliveryFee(0);
      });
    return () => {
      active = false;
    };
  }, [restaurantId]);

  const isRestaurantOpenNow = isOpenNowByWorkingHours(restaurantWorkingHours);
  const subtotal = total;
  const grandTotal = subtotal + restaurantDeliveryFee;

  /** «Xaritada belgi» — saqlangan manzil tanlanmagan bo‘lsa, Chust markaziga qaytadi */
  useEffect(() => {
    if (addressMode !== "map") return;
    if (selectedSavedAddress) return;
    setCoords(CHUST_DEFAULT_COORDS.lat, CHUST_DEFAULT_COORDS.lng);
  }, [addressMode, selectedSavedAddress]);

  async function submitOrder(skipMapConfirm: boolean) {
    setSubmitError(null);
    if (!restaurantId || items.length === 0) {
      setSubmitError("Savat bo‘sh yoki restoran aniqlanmadi. Taomlarni qayta qo‘shing.");
      return;
    }
    if (!isRestaurantOpenNow) {
      setSubmitError("Restoran hozir yopiq. Ish vaqtida qayta urinib ko‘ring.");
      return;
    }
    if (addressMode === "geo" && geoStatus !== "success") {
      setSubmitError("Avval «Mening joylashuvim» tugmasi orqali geolokatsiyani aniqlang.");
      return;
    }
    if (!skipMapConfirm) {
      if (addressMode === "map") {
        setConfirmModalText("Xaritada nuqtani to‘g‘ri qo‘ydingizmi?");
        return;
      }
      if (addressMode === "geo") {
        setConfirmModalText("Buyurtmani tasdiqlaysizmi?");
        return;
      }
    }
    const streetVal = selectedSavedAddress
      ? selectedSavedAddress.street
      : addressMode === "map"
        ? STREET_FROM_MAP
        : STREET_FROM_GEO;
    const cityVal = selectedSavedAddress?.city || "Chust";
    const detailsVal = selectedSavedAddress?.details;
    const finalPhone = selectedSavedAddress?.phone || phone;
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      setSubmitError("Xaritada yoki geolokatsiya orqali yetkazib berish nuqtasini belgilang.");
      return;
    }
    if (finalPhone.length !== 9) {
      setSubmitError("Telefon raqami 9 ta raqamdan iborat bo‘lishi kerak (+998 dan keyin).");
      return;
    }
    setLoading(true);
    try {
      const created = await api.createOrder({
        restaurantId,
        address: {
          street: streetVal,
          city: cityVal,
          details:
            `${detailsVal ? `${detailsVal}. ` : ""}${finalPhone.length === 9 ? `Tel: +998${finalPhone}` : ""}`.trim() ||
            undefined,
          latitude: latNum,
          longitude: lngNum,
        },
        items: items.map((i) => ({ dishId: i.dish.id, quantity: i.quantity })),
        comment: finalPhone.length === 9 ? `Tel: +998${finalPhone}` : undefined,
        paymentMethod,
      });
      const orderId = typeof created?.id === "string" ? created.id : null;
      setPlacedOrderId(orderId);
      if (orderId) {
        setTrackingOrderId(orderId);
      }
      setPlacedOrderTotal(grandTotal);
      setReceivedDone(false);
      clear();
      setSubmitted(true);
    } catch (err: any) {
      setSubmitError(err?.message ?? "Buyurtma yuborilmadi. Qayta urinib ko‘ring.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await submitOrder(false);
  }

  const latNum = Number(lat);
  const lngNum = Number(lng);
  const coordsReady = Number.isFinite(latNum) && Number.isFinite(lngNum);

  async function handleMarkReceived() {
    if (!placedOrderId || receivedBusy || receivedDone) return;
    setReceivedBusy(true);
    setSubmitError(null);
    try {
      await adminApi.markOrderReceived(placedOrderId);
      setReceivedDone(true);
    } catch (err: any) {
      setSubmitError(err?.message ?? "Buyurtmani tasdiqlashda xatolik.");
    } finally {
      setReceivedBusy(false);
    }
  }

  return (
    <div className="fd-shell fd-checkout">
      <BackLink href="/" />
      <h1 className="fd-section-title">Buyurtmani rasmiylashtirish</h1>
      <div className="fd-checkout-layout">
        <section className="fd-checkout-cart">
          <h2>Savat</h2>
          <OrderTrackingCartPanel />
          {items.length === 0 && <p className="fd-empty">Savat bo‘sh.</p>}
          {items.map((item) => {
            const id = item.dish.id;
            const lineTotal = (item.dish.price * item.quantity).toFixed(0);

            const dishDesc =
              typeof item.dish.description === "string" ? item.dish.description.trim() : "";
            return (
              <div key={id} className="fd-checkout-item">
                <div>
                  <div>{item.dish.name}</div>
                  {dishDesc ? <div className="fd-checkout-meta">{dishDesc}</div> : null}
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
              <span>Taomlar:</span>
              <span className="fd-price">{subtotal.toFixed(0)} so&apos;m</span>
            </div>
          )}
          {items.length > 0 && (
            <div className="fd-checkout-total">
              <span>Yetkazib berish:</span>
              <span className="fd-price">{restaurantDeliveryFee.toFixed(0)} so&apos;m</span>
            </div>
          )}
          {items.length > 0 && (
            <div className="fd-checkout-total">
              <span>Jami:</span>
              <span className="fd-price">{grandTotal.toFixed(0)} so&apos;m</span>
            </div>
          )}
        </section>

        <section className="fd-checkout-form">
          <h2>Manzil, geolokatsiya va to‘lov</h2>
          {submitted ? (
            <div>
              <p className="fd-success">Buyurtma qabul qilindi. Restoran tez orada siz bilan bog‘lanadi.</p>
              <p className="fd-checkout-meta" style={{ marginTop: 10 }}>
                Umumiy summa:{" "}
                <strong>{Number.isFinite(Number(placedOrderTotal)) ? Number(placedOrderTotal).toFixed(0) : "0"} so&apos;m</strong>
              </p>
              {placedOrderId ? (
                <>
                  <p className="fd-checkout-meta" style={{ marginTop: 12 }}>
                    Buyurtma holati savat ustidagi blokda yangilanadi.
                  </p>
                  <button
                    type="button"
                    className="fd-btn fd-btn-primary"
                    onClick={handleMarkReceived}
                    disabled={receivedBusy || receivedDone}
                    style={{ marginTop: 10 }}
                  >
                    {receivedDone ? "Qabul qilindi" : receivedBusy ? "Tekshirilmoqda..." : "Qabul qildim"}
                  </button>
                </>
              ) : null}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="fd-form">
              <div className="fd-field">
                <span>Manzilni aniqlash</span>
                {savedAddresses.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <label className="fd-checkout-meta">Saqlangan manzil (tez tanlash)</label>
                    <select
                      value={selectedSavedAddressId}
                      onChange={(e) => setSelectedSavedAddressId(e.target.value)}
                      style={{ width: "100%", marginTop: 6 }}
                    >
                      <option value="">Tanlanmagan</option>
                      {savedAddresses.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.label} - {x.street}, {x.city}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <fieldset>
                  <div className="fd-radio-group">
                    <label>
                      <input
                        type="radio"
                        checked={addressMode === "map"}
                        onChange={() => setAddressMode("map")}
                      />
                      <span>Xaritada belgi qo‘yaman</span>
                    </label>
                    <label>
                      <input
                        type="radio"
                        checked={addressMode === "geo"}
                        onChange={() => setAddressMode("geo")}
                      />
                      <span>Geolokatsiya orqali (avtomatik)</span>
                    </label>
                  </div>
                </fieldset>
              </div>

              {addressMode === "map" && (
                <div className="fd-field">
                  <span>Yetkazib berish nuqtasi</span>
                  <p className="fd-checkout-meta" style={{ marginBottom: 8 }}>
                    Xaritada yetkazib berish joyingizni bosing yoki belgini sudrang. Joylashuv serverda
                    saqlanadi (koordinatalar alohida kiritilmaydi).
                  </p>
                  {coordsReady && (
                    <CheckoutMapPicker
                      lat={latNum}
                      lng={lngNum}
                      onChange={setCoords}
                      height={280}
                    />
                  )}
                </div>
              )}

              {addressMode === "geo" && (
                <div className="fd-field">
                  <span>Geolokatsiya</span>
                  <p className="fd-checkout-meta" style={{ marginBottom: 8 }}>
                    Qurilma joylashuvini aniqlash uchun tugmani bosing. Joylashuv serverda saqlanadi.
                  </p>
                  <button
                    type="button"
                    className="fd-btn fd-btn-primary fd-geo-btn"
                    disabled={geoStatus === "loading"}
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
                      : geoStatus === "loading"
                        ? `Aniqlanmoqda${".".repeat(geoLoadingDots)}`
                      : geoStatus === "error"
                        ? "Qayta urinib ko‘ring"
                        : "Mening joylashuvimni aniqlash"}
                  </button>
                  {geoStatus === "error" && (
                    <p className="fd-checkout-meta">
                      Ruxsat berilmadi yoki joylashuv aniqlanmadi. «Xaritada belgi» rejimiga
                      o‘ting.
                    </p>
                  )}
                  {geoStatus === "success" && (
                    <p className="fd-checkout-meta" style={{ marginTop: 12 }}>
                      Joylashuv aniqlangan. Buyurtmada ishlatiladi.
                    </p>
                  )}
                </div>
              )}

              <label className="fd-field">
                <span>Telefon raqami *</span>
                <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                  <span
                    style={{
                      padding: "10px 12px",
                      background: "var(--fd-bg-2)",
                      border: "1px solid var(--color-border)",
                      borderRight: "none",
                      borderRadius: "var(--radius-sm) 0 0 var(--radius-sm)",
                      fontSize: "1rem",
                      color: "var(--color-muted)",
                    }}
                  >
                    +998
                  </span>
                  <input
                    required
                    placeholder="90 123 45 67"
                    value={phone}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 9);
                      setPhone(digits);
                    }}
                    type="tel"
                    inputMode="numeric"
                    maxLength={9}
                    pattern="[0-9]{9}"
                    title="9 ta raqam kiriting"
                    style={{
                      flex: 1,
                      borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
                    }}
                  />
                </div>
                {phone.length > 0 && phone.length !== 9 && (
                  <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)", marginTop: 4 }}>
                    {phone.length} / 9 raqam
                  </p>
                )}
              </label>

              {submitError && (
                <p style={{ color: "var(--color-orange)", fontSize: "0.875rem", marginBottom: 8 }}>
                  {submitError}
                </p>
              )}
              {!isRestaurantOpenNow && (
                <p style={{ color: "var(--color-orange)", fontSize: "0.875rem", marginBottom: 8 }}>
                  Restoran hozir yopiq{restaurantWorkingHours.trim() ? ` (Ish vaqti: ${restaurantWorkingHours.trim()})` : ""}.
                </p>
              )}

              <button
                className="fd-btn fd-btn-primary"
                type="submit"
                disabled={items.length === 0 || loading || !isRestaurantOpenNow}
              >
                {loading ? "Yuborilmoqda..." : "Buyurtmani tasdiqlash"}
              </button>
            </form>
          )}
        </section>
      </div>
      {confirmModalText && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Buyurtmani tasdiqlash"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 420,
              background: "var(--color-surface, #fff)",
              borderRadius: 16,
              border: "1px solid var(--color-border, #e8e8e8)",
              boxShadow: "0 16px 40px rgba(0,0,0,0.2)",
              padding: 18,
            }}
          >
            <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Joylashuvni tasdiqlash</h3>
            <p className="fd-checkout-meta" style={{ marginTop: 10, marginBottom: 0 }}>
              {confirmModalText}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <button
                type="button"
                className="fd-btn"
                onClick={() => setConfirmModalText(null)}
              >
                Bekor qilish
              </button>
              <button
                type="button"
                className="fd-btn fd-btn-primary"
                onClick={async () => {
                  setConfirmModalText(null);
                  await submitOrder(true);
                }}
              >
                Tasdiqlash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

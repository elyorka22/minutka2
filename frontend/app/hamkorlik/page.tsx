"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { adminApi } from "../../lib/adminApi";

export default function HamkorlikPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [contactMethod, setContactMethod] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setResult(null);
    setError(null);
    if (!name.trim() || !phone.trim() || !businessName.trim()) {
      setError("Ism, telefon va biznes nomini kiriting.");
      return;
    }
    setSubmitting(true);
    try {
      await adminApi.createPartnershipApplication({
        name: name.trim(),
        phone: phone.trim(),
        businessName: businessName.trim(),
        businessType: businessType.trim() || undefined,
        contactMethod: contactMethod.trim() || undefined,
        details: details.trim() || undefined,
      });
      setResult("Arizangiz qabul qilindi. Tez orada siz bilan bog'lanamiz.");
      setName("");
      setPhone("");
      setBusinessName("");
      setBusinessType("");
      setContactMethod("");
      setDetails("");
    } catch (err: any) {
      setError(err?.message ?? "Ariza yuborishda xatolik.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fd-shell fd-section">
      <Link href="/profile" className="fd-btn" style={{ textDecoration: "none" }}>
        Profilga qaytish
      </Link>

      <h1 className="fd-section-title" style={{ marginTop: 14 }}>
        Hamkorlik
      </h1>

      <div className="fd-card" style={{ padding: 16 }}>
        <p className="fd-card-desc" style={{ marginTop: 0 }}>
          Minutka platformasiga restoran, kafe, do'kon yoki boshqa oziq-ovqat biznesingizni qo'shib,
          yangi mijozlarga tezroq chiqing.
        </p>
        <ul className="fd-card-desc" style={{ paddingLeft: 18, margin: "10px 0 0" }}>
          <li>Ko'proq buyurtma va yangi mijozlar oqimi</li>
          <li>Buyurtmalarni oddiy boshqarish uchun admin panel</li>
          <li>Kuryer va yetkazib berish jarayonini qulay kuzatish</li>
          <li>Aksiya, banner va mahsulotlarni markaziy boshqarish</li>
        </ul>
      </div>

      <div className="fd-form-block" style={{ marginTop: 16 }}>
        <h3>Ariza qoldirish</h3>
        <form onSubmit={handleSubmit} className="fd-form" style={{ maxWidth: 520 }}>
          <label className="fd-field">
            <span>Ismingiz *</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="fd-field">
            <span>Telefon *</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </label>
          <label className="fd-field">
            <span>Biznes nomi *</span>
            <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
          </label>
          <label className="fd-field">
            <span>Biznes turi</span>
            <input
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              placeholder="Masalan: Restoran, Fast food, Supermarket"
            />
          </label>
          <label className="fd-field">
            <span>Bog'lanish usuli</span>
            <input
              value={contactMethod}
              onChange={(e) => setContactMethod(e.target.value)}
              placeholder="Masalan: Telefon, Telegram"
            />
          </label>
          <label className="fd-field">
            <span>Qo'shimcha ma'lumot</span>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={4}
              placeholder="Filiallar soni, ish vaqti, manzil va h.k."
            />
          </label>
          {error && <p style={{ color: "var(--color-orange)" }}>{error}</p>}
          {result && <p className="fd-success">{result}</p>}
          <button type="submit" className="fd-btn fd-btn-primary" disabled={submitting}>
            {submitting ? "Yuborilmoqda..." : "Ariza qoldirish"}
          </button>
        </form>
      </div>
    </div>
  );
}

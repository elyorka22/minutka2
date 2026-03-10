"use client";

import { FormEvent, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) {
        throw new Error("Ro‘yxatdan o‘tishda xatolik yuz berdi");
      }
      setSuccess("Foydalanuvchi ro‘yxatdan o‘tkazildi. Kerak bo‘lsa, unga admin roli berilishi mumkin.");
      setName("");
      setEmail("");
      setPassword("");
    } catch (err: any) {
      setError(err.message ?? "Ro‘yxatdan o‘tishda xato yuz berdi");
    }
  }

  return (
    <div className="fd-shell fd-section">
      <h1 className="fd-section-title">Admin uchun ro‘yxatdan o‘tish</h1>
      <p className="fd-card-desc">
        Bu shakl orqali platforma yoki restoran administratorlari uchun akkaunt yaratiladi. Rolni
        keyinchalik platforma egasi belgilaydi.
      </p>
      <form onSubmit={handleSubmit} className="fd-form" style={{ maxWidth: 360, marginTop: 16 }}>
        <label className="fd-field">
          <span>Ism</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Masalan: Admin"
          />
        </label>
        <label className="fd-field">
          <span>Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            placeholder="admin@example.com"
          />
        </label>
        <label className="fd-field">
          <span>Parol</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />
        </label>
        {error && <p style={{ color: "#ff6a00" }}>{error}</p>}
        {success && <p className="fd-success">{success}</p>}
        <button className="fd-btn fd-btn-primary" type="submit">
          Ro‘yxatdan o‘tish
        </button>
      </form>
    </div>
  );
}


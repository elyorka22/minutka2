"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BackLink } from "../../components/BackLink";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(
    typeof window === "undefined" ? null : window.localStorage.getItem("token"),
  );
  const [next, setNext] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const value = params.get("next");
    if (value) setNext(value);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const loginTrimmed = (email ?? "").trim();
    const passwordTrimmed = (password ?? "").trim();
    if (!loginTrimmed || !passwordTrimmed) {
      setError("Login va parolni kiriting.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginTrimmed, password: passwordTrimmed }),
      });
      if (!res.ok) {
        throw new Error("Noto‘g‘ri maʼlumotlar");
      }
      const data = (await res.json()) as { accessToken: string };
      window.localStorage.setItem("token", data.accessToken);
      setToken(data.accessToken);

      if (next) {
        router.push(next);
      } else {
        router.push("/profile");
      }
    } catch (err: any) {
      setError(err.message ?? "Avtorizatsiya xatosi");
    }
  }

  return (
    <div className="fd-shell fd-section">
      <BackLink href="/" />
      <h1 className="fd-section-title">Admin uchun kirish</h1>
      {token && (
        <p className="fd-success">Token brauzerda saqlandi. Admin panellarini ochish mumkin.</p>
      )}
      <form onSubmit={handleSubmit} className="fd-form" style={{ maxWidth: 360 }}>
        <label className="fd-field">
          <span>Login</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="text"
            autoComplete="username"
            required
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
        <button className="fd-btn fd-btn-primary" type="submit">
          Kirish
        </button>
      </form>
      <p className="fd-checkout-meta" style={{ marginTop: 16, maxWidth: 360, fontSize: "0.875rem" }}>
        Agar brauzer &quot;parol oshkor bo‘lgan&quot; deb ogohlantirsa — bu Google xabari. Parolni <strong>OK</strong> dan keyin kirish ishlashi mumkin; yoki maxfiy rejimda / boshqa brauzerda kirib ko‘ring. Yangi parol o‘rnatish uchun platforma adminiga murojaat qiling.
      </p>
    </div>
  );
}

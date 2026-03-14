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
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
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
          Войти
        </button>
      </form>
    </div>
  );
}

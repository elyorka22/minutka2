"use client";

import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

function showSearchBar(pathname: string) {
  if (pathname.startsWith("/platform-admin")) return false;
  if (pathname.startsWith("/restaurant-admin")) return false;
  if (pathname.startsWith("/courier")) return false;
  return true;
}

export function HeaderSearchBar() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!pathname.startsWith("/search")) return;
    const params = new URLSearchParams(window.location.search);
    setQ(params.get("q") || "");
  }, [pathname]);

  if (!showSearchBar(pathname)) return null;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const t = q.trim();
    if (t) {
      router.push(`/search?q=${encodeURIComponent(t)}`);
    } else {
      router.push("/search");
    }
  }

  return (
    <div className="fd-header-search-wrap">
      <form className="fd-header-search" onSubmit={onSubmit} role="search">
        <span className="fd-header-search__icon material-symbols-rounded" aria-hidden>
          search
        </span>
        <input
          type="search"
          name="q"
          className="fd-header-search__input"
          placeholder="Restoran yoki taom qidiring…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoComplete="off"
          enterKeyHint="search"
          aria-label="Qidiruv"
        />
      </form>
    </div>
  );
}

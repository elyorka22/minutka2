"use client";

import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function HeaderSearchBar() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const [q, setQ] = useState("");

  /** Faqat bosh sahifada (/) */
  if (pathname !== "/") return null;

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

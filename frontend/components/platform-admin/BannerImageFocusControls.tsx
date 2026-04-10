"use client";

import { useEffect, useRef, useState } from "react";
import { imageUrl } from "../../lib/api";

type BannerSlice = {
  id: string;
  imageUrl?: string | null;
  imageFocusX?: number | null;
  imageFocusY?: number | null;
};

type Props = {
  banner: BannerSlice;
  onSave: (patch: { imageFocusX: number; imageFocusY: number }) => void;
};

export function BannerImageFocusControls({ banner, onSave }: Props) {
  const x0 = typeof banner.imageFocusX === "number" ? banner.imageFocusX : 50;
  const y0 = typeof banner.imageFocusY === "number" ? banner.imageFocusY : 50;
  const [x, setX] = useState(x0);
  const [y, setY] = useState(y0);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    setX(typeof banner.imageFocusX === "number" ? banner.imageFocusX : 50);
    setY(typeof banner.imageFocusY === "number" ? banner.imageFocusY : 50);
  }, [banner.id, banner.imageFocusX, banner.imageFocusY]);

  useEffect(() => {
    return () => {
      if (debounceRef.current != null) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, []);

  function scheduleSave(nx: number, ny: number) {
    if (debounceRef.current != null) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      onSave({ imageFocusX: nx, imageFocusY: ny });
      debounceRef.current = null;
    }, 450);
  }

  const img = banner.imageUrl?.trim();
  const pos = `${x}% ${y}%`;

  return (
    <div className="fd-banner-focus">
      <p className="fd-checkout-meta" style={{ margin: "0 0 8px", lineHeight: 1.45 }}>
        Rasm qirqilganda muhim qism ko‘rinsin: slayderlarni siljiting (bosh sahifadagi banner bilan bir xil
        proporsiya).
      </p>
      <div className="fd-banner-focus-preview">
        {img ? (
          <img
            src={imageUrl(img)}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: pos,
              display: "block",
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="fd-banner-focus-preview-empty">Rasm qo‘shilgandan keyin sozlang</div>
        )}
      </div>
      <label className="fd-field" style={{ marginTop: 0 }}>
        <span>Gorizontal fokus ({x}%)</span>
        <input
          type="range"
          min={0}
          max={100}
          value={x}
          disabled={!img}
          onChange={(e) => {
            const nx = Number(e.target.value);
            setX(nx);
            scheduleSave(nx, y);
          }}
        />
      </label>
      <label className="fd-field">
        <span>Vertikal fokus ({y}%)</span>
        <input
          type="range"
          min={0}
          max={100}
          value={y}
          disabled={!img}
          onChange={(e) => {
            const ny = Number(e.target.value);
            setY(ny);
            scheduleSave(x, ny);
          }}
        />
      </label>
    </div>
  );
}

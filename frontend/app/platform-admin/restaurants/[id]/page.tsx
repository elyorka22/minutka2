"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { adminApi } from "../../../../lib/adminApi";

export default function PlatformAdminRestaurantMenuPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [catName, setCatName] = useState("");
  const [catSort, setCatSort] = useState("");
  const [catSubmitting, setCatSubmitting] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);

  const [dishName, setDishName] = useState("");
  const [dishDesc, setDishDesc] = useState("");
  const [dishPrice, setDishPrice] = useState("");
  const [dishCategoryId, setDishCategoryId] = useState("");
  const [dishSubmitting, setDishSubmitting] = useState(false);
  const [dishError, setDishError] = useState<string | null>(null);

  const [editLogoUrl, setEditLogoUrl] = useState("");
  const [editCoverUrl, setEditCoverUrl] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editLogoUploading, setEditLogoUploading] = useState(false);
  const [editCoverUploading, setEditCoverUploading] = useState(false);

  async function handleUploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setEditLogoUploading(true);
    try {
      const { url } = await adminApi.uploadImage(file);
      setEditLogoUrl(url);
    } catch (err: any) {
      setEditError(err?.message ?? "Yuklashda xatolik");
    } finally {
      setEditLogoUploading(false);
    }
  }

  async function handleUploadCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setEditCoverUploading(true);
    try {
      const { url } = await adminApi.uploadImage(file);
      setEditCoverUrl(url);
    } catch (err: any) {
      setEditError(err?.message ?? "Yuklashda xatolik");
    } finally {
      setEditCoverUploading(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const data = await adminApi.getRestaurantFull(id);
        if (!active) return;
        setRestaurant(data);
        setEditLogoUrl(data?.logoUrl || "");
        setEditCoverUrl(data?.coverUrl || "");
        if (data?.categories?.length && !dishCategoryId) {
          setDishCategoryId(data.categories[0].id);
        }
      } catch (err: any) {
        if (!active) return;
        if (err?.message?.includes("401") || err?.message?.includes("403")) {
          if (typeof window !== "undefined") {
            window.localStorage.removeItem("token");
          }
          router.push("/login?next=/platform-admin/restaurants/" + id);
          return;
        }
        setError(err?.message ?? "Yuklashda xatolik");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [id, router]);

  useEffect(() => {
    if (restaurant?.categories?.length && !dishCategoryId) {
      setDishCategoryId(restaurant.categories[0].id);
    }
  }, [restaurant, dishCategoryId]);

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    setCatError(null);
    if (!catName.trim()) {
      setCatError("Kategoriya nomi kiritilishi shart");
      return;
    }
    setCatSubmitting(true);
    try {
      await adminApi.createCategory(id, {
        name: catName.trim(),
        sortOrder: catSort ? parseInt(catSort, 10) : undefined,
      });
      setCatName("");
      setCatSort("");
      const data = await adminApi.getRestaurantFull(id);
      setRestaurant(data);
    } catch (err: any) {
      setCatError(err?.message ?? "Kategoriya qo‘shishda xatolik");
    } finally {
      setCatSubmitting(false);
    }
  }

  async function handleAddDish(e: React.FormEvent) {
    e.preventDefault();
    setDishError(null);
    if (!dishName.trim()) {
      setDishError("Taom nomi kiritilishi shart");
      return;
    }
    const price = dishPrice ? parseFloat(dishPrice) : 0;
    if (isNaN(price) || price < 0) {
      setDishError("Narx noto‘g‘ri");
      return;
    }
    setDishSubmitting(true);
    try {
      await adminApi.createDish(id, {
        name: dishName.trim(),
        description: dishDesc.trim() || undefined,
        price,
        categoryId: dishCategoryId || undefined,
      });
      setDishName("");
      setDishDesc("");
      setDishPrice("");
      const data = await adminApi.getRestaurantFull(id);
      setRestaurant(data);
    } catch (err: any) {
      setDishError(err?.message ?? "Taom qo‘shishda xatolik");
    } finally {
      setDishSubmitting(false);
    }
  }

  async function handleUpdateRestaurant(e: React.FormEvent) {
    e.preventDefault();
    setEditError(null);
    setEditSubmitting(true);
    try {
      await adminApi.updateRestaurant(id, {
        logoUrl: editLogoUrl.trim() || undefined,
        coverUrl: editCoverUrl.trim() || undefined,
      });
      const data = await adminApi.getRestaurantFull(id);
      setRestaurant(data);
      setEditLogoUrl(data?.logoUrl || "");
      setEditCoverUrl(data?.coverUrl || "");
    } catch (err: any) {
      setEditError(err?.message ?? "Saqlashda xatolik");
    } finally {
      setEditSubmitting(false);
    }
  }

  if (!id) return null;
  if (loading) return <div className="fd-shell fd-section"><p>Yuklanmoqda...</p></div>;
  if (error) return <div className="fd-shell fd-section"><p className="fd-empty">{error}</p></div>;
  if (!restaurant) return <div className="fd-shell fd-section"><p className="fd-empty">Restoran topilmadi.</p></div>;

  return (
    <div className="fd-shell fd-section">
      <p style={{ marginBottom: 16 }}>
        <Link href="/platform-admin" className="fd-link">
          ← Platforma admin
        </Link>
      </p>
      <h1 className="fd-section-title">{restaurant.name} — menyu</h1>
      <p className="fd-checkout-meta">{restaurant.address || "—"}</p>

      <div className="fd-form-block" style={{ marginTop: 24 }}>
        <h3>Restoran rasmlari</h3>
        <form onSubmit={handleUpdateRestaurant} className="fd-form">
          <label className="fd-field">
            <span>Logo</span>
            <input
              type="url"
              value={editLogoUrl}
              onChange={(e) => setEditLogoUrl(e.target.value)}
              placeholder="URL yoki telefondan yuklang"
            />
            <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <input
                type="file"
                accept="image/*"
                id="edit-logo-file"
                style={{ display: "none" }}
                onChange={handleUploadLogo}
              />
              <label htmlFor="edit-logo-file" style={{ margin: 0 }}>
                <span className="fd-btn fd-btn-primary" style={{ cursor: "pointer", display: "inline-block" }}>
                  {editLogoUploading ? "Yuklanmoqda..." : "Telefondan yuklash"}
                </span>
              </label>
            </div>
            {editLogoUrl.trim() && (
              <img
                src={editLogoUrl.trim()}
                alt="Logo"
                style={{ marginTop: 8, maxWidth: 80, maxHeight: 80, objectFit: "contain", borderRadius: 8 }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
          </label>
          <label className="fd-field">
            <span>Banner / muqova</span>
            <input
              type="url"
              value={editCoverUrl}
              onChange={(e) => setEditCoverUrl(e.target.value)}
              placeholder="URL yoki telefondan yuklang"
            />
            <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <input
                type="file"
                accept="image/*"
                id="edit-cover-file"
                style={{ display: "none" }}
                onChange={handleUploadCover}
              />
              <label htmlFor="edit-cover-file" style={{ margin: 0 }}>
                <span className="fd-btn fd-btn-primary" style={{ cursor: "pointer", display: "inline-block" }}>
                  {editCoverUploading ? "Yuklanmoqda..." : "Telefondan yuklash"}
                </span>
              </label>
            </div>
            {editCoverUrl.trim() && (
              <img
                src={editCoverUrl.trim()}
                alt="Cover"
                style={{ marginTop: 8, maxWidth: "100%", maxHeight: 120, objectFit: "cover", borderRadius: 8 }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
          </label>
          {editError && <p style={{ color: "var(--color-orange)", fontSize: "0.875rem" }}>{editError}</p>}
          <button type="submit" className="fd-btn fd-btn-primary" disabled={editSubmitting}>
            {editSubmitting ? "Saqlanmoqda..." : "Rasmlarni saqlash"}
          </button>
        </form>
      </div>

      <div className="fd-form-block" style={{ marginTop: 24 }}>
        <h3>Kategoriya qo‘shish</h3>
        <form onSubmit={handleAddCategory} className="fd-form">
          <label className="fd-field">
            <span>Nomi *</span>
            <input
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="Masalan: Oshlar"
              required
            />
          </label>
          <label className="fd-field">
            <span>Tartib (ixtiyoriy)</span>
            <input
              type="number"
              value={catSort}
              onChange={(e) => setCatSort(e.target.value)}
              placeholder="0"
            />
          </label>
          {catError && <p style={{ color: "var(--color-orange)", fontSize: "0.875rem" }}>{catError}</p>}
          <button type="submit" className="fd-btn fd-btn-primary" disabled={catSubmitting}>
            {catSubmitting ? "Saqlanmoqda..." : "Kategoriya qo‘shish"}
          </button>
        </form>
      </div>

      <section style={{ marginTop: 24 }}>
        <h2>Kategoriyalar</h2>
        {restaurant.categories?.length ? (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {restaurant.categories.map((c: any) => (
              <li key={c.id} className="fd-checkout-item">
                <span>{c.name}</span>
                <span className="fd-checkout-meta">Tartib: {c.sortOrder}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="fd-empty">Kategoriyalar yo‘q. Yuqoridan qo‘shing.</p>
        )}
      </section>

      <div className="fd-form-block" style={{ marginTop: 24 }}>
        <h3>Taom qo‘shish</h3>
        <form onSubmit={handleAddDish} className="fd-form">
          <label className="fd-field">
            <span>Taom nomi *</span>
            <input
              value={dishName}
              onChange={(e) => setDishName(e.target.value)}
              placeholder="Masalan: Osh"
              required
            />
          </label>
          <label className="fd-field">
            <span>Tavsif</span>
            <input
              value={dishDesc}
              onChange={(e) => setDishDesc(e.target.value)}
              placeholder="Qisqacha tavsif"
            />
          </label>
          <label className="fd-field">
            <span>Narx (so‘m) *</span>
            <input
              type="number"
              min={0}
              step={100}
              value={dishPrice}
              onChange={(e) => setDishPrice(e.target.value)}
              placeholder="25000"
              required
            />
          </label>
          <label className="fd-field">
            <span>Kategoriya</span>
            <select
              value={dishCategoryId}
              onChange={(e) => setDishCategoryId(e.target.value)}
            >
              <option value="">— Tanlash —</option>
              {(restaurant.categories || []).map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          {dishError && <p style={{ color: "var(--color-orange)", fontSize: "0.875rem" }}>{dishError}</p>}
          <button type="submit" className="fd-btn fd-btn-primary" disabled={dishSubmitting}>
            {dishSubmitting ? "Saqlanmoqda..." : "Taom qo‘shish"}
          </button>
        </form>
      </div>

      <section style={{ marginTop: 24 }}>
        <h2>Taomlar</h2>
        {restaurant.dishes?.length ? (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {restaurant.dishes.map((d: any) => (
              <li key={d.id} className="fd-checkout-item">
                <div>
                  <div>{d.name}</div>
                  <div className="fd-checkout-meta">
                    {d.description || "—"} · {Number(d.price).toLocaleString()} so‘m
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="fd-empty">Taomlar yo‘q. Yuqoridagi formadan qo‘shing.</p>
        )}
      </section>
    </div>
  );
}

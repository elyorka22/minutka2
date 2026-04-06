import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { HomePageContent } from "./HomePageContent";
import { HomePageSkeleton } from "../components/HomePageSkeleton";

/** Static metadata avoids blocking the HTML stream on /homepage (faster TTFB / FCP). */
export const metadata: Metadata = {
  title: "Minutka — ovqat va oziq-ovqat mahsulotlarini yetkazib berish platformasi",
  description:
    "Tez ovqat yetkazib berish servis. Restoranlar va do‘konlardan qulay buyurtma berish, shahar bo‘ylab tez yetkazib berish. Minutka bilan hoziroq sinab ko‘ring.",
  openGraph: {
    title: "Minutka — ovqat va oziq-ovqat mahsulotlarini yetkazib berish platformasi",
    description:
      "O‘z shahringizdagi restoranlar va do‘konlardan ovqat buyurtma qiling. Minutka bilan tez yetkazib berish, qulay to‘lov va bir necha daqiqada buyurtma berish.",
    images: [{ url: "/web-app-manifest-512x512.png" }],
  },
};

export default function HomePage() {
  return (
    <div className="fd-shell">
      <section className="fd-home-top">
        <div className="fd-home-search">
          <input
            className="fd-home-search-input"
            placeholder="Taom, restoran yoki mahsulot izlash"
          />
        </div>

        <div className="fd-home-chips">
          <Link href="/restaurants" className="fd-chip fd-chip--active">
            Restoranlar
          </Link>
          <Link href="/supermarkets" className="fd-chip">
            Do‘konlar
          </Link>
        </div>
      </section>

      <Suspense fallback={<HomePageSkeleton />}>
        <HomePageContent />
      </Suspense>
    </div>
  );
}

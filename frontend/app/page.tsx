import type { Metadata } from "next";
import { Suspense } from "react";
import { HomePageContent } from "./HomePageContent";
import { HomePageSkeleton } from "../components/HomePageSkeleton";

/** ISR: HTML кэшируется на CDN (Vercel edge и т.д.) — повторные визиты без холодного /homepage. */
export const revalidate = 60;

/** Static metadata — без await к API (быстрее заголовок ответа). */
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
    <Suspense fallback={<HomePageSkeleton />}>
      <HomePageContent />
    </Suspense>
  );
}

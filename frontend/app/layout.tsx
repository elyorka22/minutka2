import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import ClientRootLayout from "../components/ClientRootLayout";
import "../globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://minut-ka.uz";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Minutka — Restoranlar va kafelardan ovqat yetkazib berish xizmati",
    template: "%s — Minutka",
  },
  description:
    "Minutka orqali shahringizdagi restoranlar va do‘konlardan tez buyurtma qiling. Eng yaxshi aksiyalar va qulay yetkazib berish xizmati.",
  openGraph: {
    title: "Minutka — Restoranlar va ovqat yetkazib berish xizmati",
    description: "Restoranlar va do‘konlardan tez buyurtma qiling. Eng yaxshi aksiyalar Minutka’da.",
    url: siteUrl,
    type: "website",
    images: [{ url: "/web-app-manifest-512x512.png", width: 512, height: 512 }],
  },
  appleWebApp: {
    capable: true,
  },
  manifest: "/manifest.json",
  icons: {
    apple: [{ url: "/icons/web-app-manifest-192x192.png", sizes: "192x192" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#ff6b00",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" className={plusJakarta.variable}>
      <body className={`fd-body ${plusJakarta.className}`}>
        <ClientRootLayout>{children}</ClientRootLayout>
      </body>
    </html>
  );
}

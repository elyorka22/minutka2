import type { Metadata } from "next";
import { ComingSoonPlaceholder } from "../../components/ComingSoonPlaceholder";

export const metadata: Metadata = {
  title: "Aksiyalar — Minutka",
  description: "Aksiyalar bo‘limi tez orada ochiladi.",
  openGraph: {
    title: "Aksiyalar — Minutka",
    description: "Aksiyalar bo‘limi tez orada ochiladi.",
  },
};

export default function PromocodesPage() {
  return <ComingSoonPlaceholder title="Aksiyalar" />;
}

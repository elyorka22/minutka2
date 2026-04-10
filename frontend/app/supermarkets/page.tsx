import type { Metadata } from "next";
import { ComingSoonPlaceholder } from "../../components/ComingSoonPlaceholder";

export const metadata: Metadata = {
  title: "Do‘konlar — Minutka",
  description: "Do‘konlar bo‘limi tez orada ochiladi.",
  openGraph: {
    title: "Do‘konlar — Minutka",
    description: "Do‘konlar bo‘limi tez orada ochiladi.",
  },
};

export default function SupermarketsPage() {
  return <ComingSoonPlaceholder title="Do‘konlar" />;
}

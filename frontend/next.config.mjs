/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Telemetriyani o‘chirish — birinchi ishga tushishni tezlashtirishi mumkin
  telemetry: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;


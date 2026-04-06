/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  images: {
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 120, 128, 256, 384, 400, 500, 600],
    /** 1 year cache for optimized images (CDN / Image Optimization API). */
    minimumCacheTTL: 31536000,
    qualities: [70, 75, 76, 78, 80, 85],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "4000",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "**.up.railway.app",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.railway.app",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "minut-ka.uz",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.minut-ka.uz",
        pathname: "/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/icons/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400" },
        ],
      },
    ];
  },
};

export default nextConfig;

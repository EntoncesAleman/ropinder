import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "i.pravatar.cc" },
      // Where uploaded listing photos actually live in production (see
      // app/api/upload/route.ts) — without this, next/image 500s on every
      // photo uploaded once BLOB_READ_WRITE_TOKEN is configured on Vercel.
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      // Google Sign-In profile picture (see app/api/auth/google/route.ts).
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), payment=()" },
          // Browsers ignore this over plain HTTP, so it's a no-op locally and
          // only takes effect once served over HTTPS (production).
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;

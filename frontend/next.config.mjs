/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Leaflet ships CommonJS and touches `window` at module scope. It is only
  // ever imported from a dynamic, ssr:false component (see CrimeMap.tsx), but
  // transpiling it keeps the Next bundler from tripping over its ESM interop.
  transpilePackages: ["react-leaflet", "leaflet"],

  eslint: {
    // Vercel's build should fail on type errors, not on lint opinions.
    ignoreDuringBuilds: true,
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

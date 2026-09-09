import analyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = analyzer({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "**.giphy.com",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
    staleTimes: {
      // Dynamic routes (every route here, due to cookies()/headers() use
      // in middleware/layout) must never be served from the client
      // Router Cache once stale -- topic/circle pages carry live data
      // (messages, membership) that a 30s-stale cached RSC payload would
      // silently paper over after navigating away and back.
      dynamic: 0,
    },
  },
};

export default withBundleAnalyzer(nextConfig);

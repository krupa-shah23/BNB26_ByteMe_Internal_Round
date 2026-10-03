/** @type {import('next').NextConfig} */
const nextConfig = {
  // NEXT_DIST_DIR lets two sessions (or a smoke test) build/run side by side without clobbering .next
  distDir: process.env.NEXT_DIST_DIR || ".next",
  reactStrictMode: true,
  images: { unoptimized: true },
  async redirects() {
    return [];
  },
};
export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Prisma harus dijalankan sebagai paket Node native (bukan di-bundle).
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  eslint: {
    // Linting dijalankan terpisah lewat `npm run lint` agar hasil build
    // tidak gagal hanya karena perbedaan preferensi gaya penulisan.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

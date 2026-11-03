/** @type {import('next').NextConfig} */
const nextConfig = {
  // Matikan strict mode kalau Leaflet double-init jadi masalah di dev
  reactStrictMode: false,

  // Izinkan gambar dari unpkg (marker icon Leaflet)
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'unpkg.com' },
    ],
  },
}

module.exports = nextConfig

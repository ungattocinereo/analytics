/** @type {import('next').NextConfig} */
const nextConfig = {
  // Убрали output: 'export' для поддержки динамических параметров
  images: {
    unoptimized: true,
  },
  trailingSlash: false,
};

module.exports = nextConfig;

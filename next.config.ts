import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // React Compiler
  reactCompiler: true,

  // Оптимизация изображений
  images: {
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Оптимизация скриптов
  reactStrictMode: true,

  // Настройки экспериментальных функций
  experimental: {},

  // Оптимизация загрузки страниц
  async headers() {
    return [
      {
        source: "/:all*(svg|jpg|png|webp|avif)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

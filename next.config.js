/** @type {import('next').NextConfig} */
const nextConfig = {
  // Оптимизация изображений
  images: {
    // Уменьшение размера изображений при сборке
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Оптимизация скриптов
  reactStrictMode: true,

  // Настройки экспериментальных функций для улучшения производительности
  experimental: {
    // Оптимизация серверных компонентов
    // serverExternalPackages: [], // Удалено из-за ошибки конфигурации
  },

  // Конфигурация Turbopack
  turbopack: {},

  // Настройки webpack для оптимизации сборки
  webpack: (config, { dev, isServer }) => {
    // Уменьшение размера бандла за счет исключения неиспользуемых модулей
    if (!dev) {
      config.optimization.minimize = true;
    }

    return config;
  },

  // Оптимизация загрузки страниц
  async headers() {
    return [
      {
        source: "/:all*(svg|jpg|png|webp|avif)",
        locale: false,
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

// Добавляем next-sitemap конфигурацию
const nextSitemapConfig = {
  siteUrl: process.env.SITE_URL || "https://mysites.ru",
  generateRobotsTxt: true,
  robotsTxtOptions: {
    policies: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
  },
};

module.exports = nextConfig;

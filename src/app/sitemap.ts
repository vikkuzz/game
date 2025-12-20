import { getServerSideSitemap } from "next-sitemap";

export async function GET(request: Request) {
  // Получаем URL сайта из переменной окружения или используем по умолчанию
  const siteUrl = process.env.SITE_URL || "https://mysites.ru";

  // Определяем статические страницы сайта
  const staticPages = ["", "/services"];

  // Создаем массив сitemap записей
  const sitemapFields = staticPages.map((path) => ({
    loc: `${siteUrl}${path}`,
    lastmod: new Date().toISOString(),
    changefreq: "daily" as const,
    priority: path === "" ? 1.0 : 0.8,
  }));

  // Возвращаем сгенерированный sitemap
  return getServerSideSitemap(sitemapFields);
}

export default function Sitemap() {
  // Этот компонент не будет отображаться, так как sitemap генерируется серверно
  return null;
}

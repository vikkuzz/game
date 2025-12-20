export default function Robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
      {
        userAgent: "*",
        disallow: "/private/",
      },
    ],
    sitemap: `${process.env.SITE_URL || "https://mysites.ru"}/sitemap.xml`,
    host: process.env.SITE_URL || "https://mysites.ru",
  };
}

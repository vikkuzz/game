import React from "react";
import type { Metadata } from "next";
// import localFont from "next/font/local"; // Закомментировано из-за отсутствующих файлов шрифтов
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ThemeProvider } from "@/context/ThemeContext";

// Закомментировано из-за отсутствующих файлов шрифтов
// const geistSans = localFont({
//   src: "./fonts/GeistVF.woff",
//   variable: "--font-geist-sans",
//   weight: "100 900",
// });
// const geistMono = localFont({
//   src: "./fonts/GeistMonoVF.woff",
//   variable: "--font-geist-mono",
//   weight: "100 900",
// });

export const metadata: Metadata = {
  title: {
    default: "Цифровое агентство - Создание современных веб-решений",
    template: "%s | Цифровое агентство",
  },
  description:
    "Мы создаем уникальные цифровые решения, которые помогают бизнесу расти и развиваться в онлайн-пространстве. Веб-дизайн, разработка, SEO оптимизация.",
  keywords: [
    "веб-дизайн",
    "разработка сайтов",
    "SEO оптимизация",
    "цифровое агентство",
    "Next.js",
    "React",
  ],
  authors: [{ name: "Цифровое агентство" }],
  creator: "Цифровое агентство",
  publisher: "Цифровое агентство",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: process.env.SITE_URL || "https://mysites.ru",
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: process.env.SITE_URL || "https://mysites.ru",
    title: "Цифровое агентство - Создание современных веб-решений",
    description:
      "Мы создаем уникальные цифровые решения, которые помогают бизнесу расти и развиваться в онлайн-пространстве.",
    siteName: "Цифровое агентство",
  },
  twitter: {
    card: "summary_large_image",
    title: "Цифровое агентство - Создание современных веб-решений",
    description:
      "Мы создаем уникальные цифровые решения, которые помогают бизнесу расти и развиваться в онлайн-пространстве.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Цифровое агентство",
              url: "https://mysites.ru",
              logo: "https://mysites.ru/logo.png",
              sameAs: [
                "https://vk.com/digitalagency",
                "https://t.me/digitalagency",
              ],
            }),
          }}
        />
      </head>
      <body className={`antialiased min-h-screen`}>
        <ThemeProvider>
          <Header />
          <main id="main-content" className="pt-16" role="main">
            {children}
          </main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}

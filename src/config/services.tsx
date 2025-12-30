import React from "react";

/**
 * Тип иконки услуги
 */
export type ServiceIconColor = "blue" | "green" | "purple" | "orange";

/**
 * Интерфейс услуги
 */
export interface Service {
  /** Название услуги */
  title: string;
  /** Описание услуги */
  description: string;
  /** Иконка услуги */
  icon: React.ReactNode;
  /** Цвет иконки */
  iconColor: ServiceIconColor;
}

/**
 * Функция для создания SVG иконки
 */
const createIcon = (
  path: string,
  ariaLabel: string,
  className: string = "h-12 w-12"
) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    role="img"
    aria-label={ariaLabel}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d={path}
    />
  </svg>
);

/**
 * Данные всех услуг
 */
export const services: Service[] = [
  {
    title: "Веб-дизайн",
    description:
      "Создаем современные и интуитивно понятные интерфейсы для вашего бизнеса, учитывая все современные тренды и лучшие практики UX/UI.",
    icon: createIcon(
      "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01",
      "Иконка веб-дизайна"
    ),
    iconColor: "blue",
  },
  {
    title: "Разработка",
    description:
      "Полный цикл разработки веб-приложений с использованием современных технологий, включая React, Next.js, Node.js и другие.",
    icon: createIcon(
      "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4",
      "Иконка разработки"
    ),
    iconColor: "green",
  },
  {
    title: "SEO оптимизация",
    description:
      "Повышаем видимость вашего сайта в поисковых системах, используя проверенные методы и стратегии.",
    icon: createIcon(
      "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
      "Иконка SEO оптимизации"
    ),
    iconColor: "purple",
  },
  {
    title: "Мобильная разработка",
    description:
      "Создание кроссплатформенных мобильных приложений для iOS и Android с использованием React Native.",
    icon: createIcon(
      "M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z",
      "Иконка мобильной разработки"
    ),
    iconColor: "orange",
  },
  {
    title: "Контент-маркетинг",
    description:
      "Разработка и реализация стратегий контент-маркетинга для привлечения и удержания вашей целевой аудитории.",
    icon: createIcon(
      "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
      "Иконка контент-маркетинга"
    ),
    iconColor: "blue",
  },
  {
    title: "Аналитика и отчетность",
    description:
      "Подробная аналитика и регулярная отчетность о результатах вашего цифрового присутствия и маркетинговых кампаний.",
    icon: createIcon(
      "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
      "Иконка аналитики"
    ),
    iconColor: "green",
  },
];

/**
 * Получить первые N услуг (для главной страницы)
 */
export const getFeaturedServices = (count: number = 3): Service[] => {
  return services.slice(0, count).map((service) => ({
    ...service,
    // Для главной страницы используем более короткое описание
    description: service.description.split(",")[0] + ".",
  }));
};


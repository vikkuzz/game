/**
 * Интерфейс проекта портфолио
 */
export interface PortfolioProject {
  /** Название проекта */
  title: string;
  /** Описание проекта */
  description: string;
  /** Категория проекта */
  category: string;
  /** Технологии, использованные в проекте */
  technologies: string[];
  /** Ссылка на проект (опционально) */
  url?: string;
  /** Ссылка на репозиторий (опционально) */
  repository?: string;
  /** Изображение проекта (путь или URL) */
  image?: string;
  /** Дата завершения проекта */
  date: string;
}

/**
 * Проекты портфолио
 */
export const portfolioProjects: PortfolioProject[] = [
  {
    title: "Корпоративный сайт для TechCorp",
    description:
      "Современный корпоративный сайт с адаптивным дизайном, интегрированной CRM-системой и панелью управления контентом.",
    category: "Веб-разработка",
    technologies: ["Next.js", "TypeScript", "Tailwind CSS", "Prisma"],
    url: "https://example.com",
    date: "2024-01-15",
    image: "/project1.jpg",
  },
  {
    title: "E-commerce платформа Fashion Store",
    description:
      "Полнофункциональный интернет-магазин с системой оплаты, управлением заказами и интеграцией с доставкой.",
    category: "E-commerce",
    technologies: ["React", "Node.js", "MongoDB", "Stripe"],
    url: "https://example.com",
    date: "2023-11-20",
    image: "/project2.jpg",
  },
  {
    title: "Мобильное приложение для фитнеса",
    description:
      "Кроссплатформенное мобильное приложение для отслеживания тренировок, питания и прогресса.",
    category: "Мобильная разработка",
    technologies: ["React Native", "Firebase", "Redux"],
    date: "2023-09-10",
    image: "/project3.jpg",
  },
  {
    title: "Дашборд аналитики для стартапа",
    description:
      "Веб-приложение для визуализации бизнес-метрик и аналитики с реальным временем обновления данных.",
    category: "Веб-разработка",
    technologies: ["Vue.js", "D3.js", "GraphQL", "PostgreSQL"],
    url: "https://example.com",
    date: "2023-07-05",
    image: "/project4.jpg",
  },
  {
    title: "Landing page для IT-конференции",
    description:
      "Яркий лендинг для технологической конференции с интерактивными элементами и формой регистрации.",
    category: "Веб-дизайн",
    technologies: ["Next.js", "Framer Motion", "Tailwind CSS"],
    url: "https://example.com",
    date: "2023-05-22",
    image: "/project5.jpg",
  },
  {
    title: "Система управления задачами",
    description:
      "Корпоративная система для управления проектами и задачами с командной работой и временным трекингом.",
    category: "Веб-разработка",
    technologies: ["Angular", "NestJS", "PostgreSQL", "WebSocket"],
    date: "2023-03-18",
    image: "/project6.jpg",
  },
];

/**
 * Получить проекты по категории
 */
export const getProjectsByCategory = (category: string): PortfolioProject[] => {
  return portfolioProjects.filter((project) => project.category === category);
};

/**
 * Получить все уникальные категории
 */
export const getCategories = (): string[] => {
  return Array.from(new Set(portfolioProjects.map((project) => project.category)));
};


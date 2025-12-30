import React from "react";
import { Section } from "@/components/Section";
import { Heading } from "@/components/Heading";
import { Text } from "@/components/Text";
import { PortfolioCard } from "@/components/PortfolioCard";
import { portfolioProjects, getCategories } from "@/config/portfolio";

export const metadata = {
  title: "Портфолио",
  description:
    "Посмотрите наши последние проекты в области веб-разработки, дизайна и мобильных приложений.",
};

export default function Portfolio() {
  const categories = getCategories();

  return (
    <div>
      <Section variant="primary" padding="xl" centerContent>
        <Heading level={1} className="text-4xl md:text-5xl mb-6">
          Наше портфолио
        </Heading>
        <Text size="lg" className="mb-8 max-w-2xl">
          Мы гордимся каждым проектом, который создали. Здесь представлены
          наши последние работы в различных областях цифровой разработки.
        </Text>
      </Section>

      <Section padding="xl" id="portfolio-list">
        {/* Категории (для информации) */}
        <div className="mb-8 flex flex-wrap justify-center gap-4">
          {categories.map((category) => (
            <span
              key={category}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg">
              {category}
            </span>
          ))}
        </div>

        {/* Проекты */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {portfolioProjects.map((project, index) => (
            <PortfolioCard key={index} project={project} />
          ))}
        </div>
      </Section>

      <Section variant="dark" padding="xl" centerContent>
        <Heading level={2} className="text-3xl mb-6 text-white">
          Хотите обсудить свой проект?
        </Heading>
        <Text size="lg" className="mb-8 max-w-2xl text-gray-300">
          Давайте обсудим, как мы можем помочь реализовать вашу идею в
          успешный цифровой продукт.
        </Text>
        <a href="/contact">
          <button
            className="px-6 py-3 bg-white text-gray-800 font-medium rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Связаться с нами">
            Связаться с нами
          </button>
        </a>
      </Section>
    </div>
  );
}


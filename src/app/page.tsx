import React from "react";
import { ServiceCard } from "@/components/ServiceCard";
import { Section } from "@/components/Section";
import { Heading } from "@/components/Heading";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";

export default function Home() {
  const services = [
    {
      title: "Веб-дизайн",
      description:
        "Создаем современные и интуитивно понятные интерфейсы для вашего бизнеса.",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          role="img"
          aria-label="Иконка веб-дизайна">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
          />
        </svg>
      ),
      iconColor: "blue" as const,
    },
    {
      title: "Разработка",
      description:
        "Полный цикл разработки веб-приложений с использованием современных технологий.",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          role="img"
          aria-label="Иконка разработки">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
          />
        </svg>
      ),
      iconColor: "green" as const,
    },
    {
      title: "SEO оптимизация",
      description: "Повышаем видимость вашего сайта в поисковых системах.",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          role="img"
          aria-label="Иконка SEO оптимизации">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      iconColor: "purple" as const,
    },
  ];

  return (
    <div>
      <Section variant="primary" padding="xl" centerContent>
        <Heading level={1} className="text-4xl md:text-5xl mb-6">
          Добро пожаловать в наше цифровое агентство
        </Heading>
        <Text size="lg" className="mb-8 max-w-2xl">
          Мы создаем уникальные цифровые решения, которые помогают бизнесу расти
          и развиваться в онлайн-пространстве.
        </Text>
        <Button size="lg" variant="primary" aria-label="Начать новый проект">
          Начать проект
        </Button>
      </Section>

      <Section padding="xl" id="services">
        <Heading level={2} className="text-3xl mb-12 text-center">
          Наши услуги
        </Heading>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <ServiceCard
              key={index}
              title={service.title}
              description={service.description}
              icon={service.icon}
              iconColor={service.iconColor}
              hover
            />
          ))}
        </div>
      </Section>

      <Section variant="dark" padding="xl" centerContent>
        <Heading level={2} className="text-3xl mb-6 text-white">
          Готовы начать проект?
        </Heading>
        <Text size="lg" className="mb-8 max-w-2xl text-gray-300">
          Свяжитесь с нами сегодня, чтобы обсудить, как мы можем помочь вашему
          бизнесу достичь новых высот.
        </Text>
        <Button size="lg" variant="secondary" aria-label="Связаться с нами">
          Связаться с нами
        </Button>
      </Section>
    </div>
  );
}

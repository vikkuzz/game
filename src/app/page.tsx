import React from "react";
import { ServiceCard } from "@/components/ServiceCard";
import { Section } from "@/components/Section";
import { Heading } from "@/components/Heading";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { getFeaturedServices } from "@/config/services";
import Link from "next/link";

export default function Home() {
  const services = getFeaturedServices(3);

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
        <Link href="/contact">
          <Button size="lg" variant="primary" aria-label="Начать новый проект">
            Начать проект
          </Button>
        </Link>
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
        <Link href="/contact">
          <Button size="lg" variant="secondary" aria-label="Связаться с нами">
            Связаться с нами
          </Button>
        </Link>
      </Section>
    </div>
  );
}

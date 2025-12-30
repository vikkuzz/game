import React from "react";
import { ServiceCard } from "@/components/ServiceCard";
import { Section } from "@/components/Section";
import { Heading } from "@/components/Heading";
import { Text } from "@/components/Text";
import { services } from "@/config/services";

export default function Services() {

  return (
    <div>
      <Section variant="primary" padding="xl" centerContent>
        <Heading level={1} className="text-4xl md:text-5xl mb-6">
          Наши услуги
        </Heading>
        <Text size="lg" className="mb-8 max-w-2xl">
          Мы предлагаем широкий спектр цифровых услуг, которые помогут вашему
          бизнесу выйти на новый уровень в онлайн-пространстве.
        </Text>
      </Section>

      <Section padding="xl" id="services-list">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
    </div>
  );
}

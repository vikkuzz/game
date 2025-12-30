import React from "react";
import { Section } from "@/components/Section";
import { Heading } from "@/components/Heading";
import { Text } from "@/components/Text";
import Link from "next/link";

export const metadata = {
  title: "Политика конфиденциальности",
  description:
    "Политика конфиденциальности нашей компании. Информация о сборе, использовании и защите персональных данных.",
};

export default function Privacy() {
  return (
    <div>
      <Section variant="primary" padding="xl" centerContent>
        <Heading level={1} className="text-4xl md:text-5xl mb-6">
          Политика конфиденциальности
        </Heading>
        <Text size="lg" className="mb-8 max-w-2xl">
          Последнее обновление: {new Date().toLocaleDateString("ru-RU", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </Text>
      </Section>

      <Section padding="xl">
        <div className="max-w-4xl mx-auto prose prose-lg">
          <Heading level={2} className="mb-4">
            1. Общие положения
          </Heading>
          <Text className="mb-6">
            Настоящая Политика конфиденциальности определяет порядок обработки и защиты персональных данных пользователей веб-сайта mysites.ru (далее — Сайт). Используя Сайт, вы соглашаетесь с условиями настоящей Политики конфиденциальности.
          </Text>

          <Heading level={2} className="mb-4 mt-8">
            2. Сбор персональных данных
          </Heading>
          <Text className="mb-6">
            Мы собираем следующие типы персональных данных:
          </Text>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Имя и контактная информация (email, телефон)</li>
            <li>Информация, предоставленная при заполнении форм на Сайте</li>
            <li>Технические данные (IP-адрес, тип браузера, операционная система)</li>
            <li>Данные о посещении Сайта (время посещения, просмотренные страницы)</li>
          </ul>

          <Heading level={2} className="mb-4 mt-8">
            3. Использование персональных данных
          </Heading>
          <Text className="mb-6">
            Персональные данные используются для следующих целей:
          </Text>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Обработка запросов и сообщений от пользователей</li>
            <li>Предоставление информации о наших услугах</li>
            <li>Улучшение качества работы Сайта</li>
            <li>Соблюдение требований законодательства</li>
          </ul>

          <Heading level={2} className="mb-4 mt-8">
            4. Защита персональных данных
          </Heading>
          <Text className="mb-6">
            Мы применяем современные методы защиты информации для предотвращения несанкционированного доступа, изменения, раскрытия или уничтожения персональных данных. Все данные передаются по защищенному соединению (HTTPS).
          </Text>

          <Heading level={2} className="mb-4 mt-8">
            5. Передача данных третьим лицам
          </Heading>
          <Text className="mb-6">
            Мы не продаем, не обмениваем и не передаем персональные данные третьим лицам без вашего согласия, за исключением случаев, когда это необходимо для предоставления услуг или требуется по закону.
          </Text>

          <Heading level={2} className="mb-4 mt-8">
            6. Права пользователей
          </Heading>
          <Text className="mb-6">
            Вы имеете право:
          </Text>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Получать информацию о ваших персональных данных</li>
            <li>Требовать исправления или удаления ваших данных</li>
            <li>Отозвать согласие на обработку персональных данных</li>
            <li>Ограничить обработку ваших персональных данных</li>
          </ul>

          <Heading level={2} className="mb-4 mt-8">
            7. Cookies
          </Heading>
          <Text className="mb-6">
            Сайт использует cookies для улучшения пользовательского опыта. Вы можете настроить браузер для отказа от cookies, однако это может повлиять на функциональность Сайта.
          </Text>

          <Heading level={2} className="mb-4 mt-8">
            8. Контакты
          </Heading>
          <Text className="mb-6">
            По всем вопросам, связанным с обработкой персональных данных, вы можете обращаться по адресу:{" "}
            <Link href="mailto:info@mysites.ru" className="text-blue-600 hover:underline">
              info@mysites.ru
            </Link>
          </Text>

          <Heading level={2} className="mb-4 mt-8">
            9. Изменения в Политике конфиденциальности
          </Heading>
          <Text className="mb-6">
            Мы оставляем за собой право вносить изменения в настоящую Политику конфиденциальности. Все изменения вступают в силу с момента их публикации на Сайте.
          </Text>
        </div>
      </Section>
    </div>
  );
}


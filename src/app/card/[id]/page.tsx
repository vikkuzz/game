import React from "react";
import { notFound } from "next/navigation";
import { Section } from "@/components/Section";
import { CardPreviewPage } from "./CardPreviewClient";
import { getBusinessCard } from "@/lib/businessCardStorage";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Страница отображения визитки
 */
export default async function CardPage(props: PageProps) {
  const params = await props.params;
  const cardId = params.id;
  
  console.log(`[CardPage] Attempting to load card with id: "${cardId}"`);
  const card = await getBusinessCard(cardId);

  if (!card) {
    console.error(`[CardPage] Card not found with id: ${cardId}`);
    notFound();
  }

  // Для тестирования разрешаем просмотр неактивных визиток
  // В продакшене закомментируйте следующий блок и раскомментируйте notFound()
  if (!card.isActive) {
    console.warn(`[CardPage] Card ${cardId} exists but is not active. Showing anyway for testing.`);
    // В продакшене раскомментируйте:
    // notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12">
      <Section padding="xl">
        <CardPreviewPage card={card} />
      </Section>
    </div>
  );
}


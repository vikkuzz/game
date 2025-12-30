"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Section } from "@/components/Section";
import { Heading } from "@/components/Heading";
import { Text } from "@/components/Text";
import { BusinessCardEditor } from "@/components/BusinessCardEditor";
import { PaymentForm } from "@/components/PaymentForm";
import { BusinessCardFormData, BusinessCard } from "@/types/businessCard";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

type Step = "editor" | "payment" | "success";

function CreateCardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("editor");
  const [cardData, setCardData] = useState<BusinessCardFormData | null>(null);
  const [cardId, setCardId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string>("");

  const checkPaymentAndActivate = async (cardIdToCheck: string) => {
    try {
      // Активация визитки после оплаты
      const response = await fetch(`/api/cards/${cardIdToCheck}/activate`, {
        method: "POST",
      });

      const result = await response.json();

      if (result.success) {
        setCardId(cardIdToCheck);
        const fullUrl = `${window.location.origin}${result.card.shareUrl}`;
        setShareUrl(fullUrl);
        setStep("success");
        // Очищаем URL от параметров
        router.replace("/create-card");
      }
    } catch (error) {
      console.error("Error activating card:", error);
    }
  };

  // Обработка возврата после оплаты через Яндекс.Кассу
  useEffect(() => {
    const paymentStatus = searchParams?.get("payment");
    const returnCardId = searchParams?.get("cardId");

    if (paymentStatus === "success" && returnCardId) {
      // Проверяем статус платежа и активируем карту
      checkPaymentAndActivate(returnCardId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleEditorSubmit = async (data: BusinessCardFormData) => {
    setCardData(data);

    try {
      // Отправка данных на сервер
      const response = await fetch("/api/cards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          position: data.position,
          company: data.company,
          phone: data.phone,
          email: data.email,
          website: data.website,
          address: data.address,
          photoUrl: data.photoPreview, // Используем превью как base64
          description: data.description,
          socialLinks: data.socialLinks,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setCardId(result.card.id);
        setStep("payment");
      } else {
        alert("Ошибка при сохранении визитки: " + result.error);
      }
    } catch (error) {
      console.error("Error saving card:", error);
      alert("Ошибка при сохранении визитки");
    }
  };

  const handlePaymentSuccess = async () => {
    if (!cardId) return;

    // Если используется Яндекс.Касса, обработка происходит через webhook
    // Эта функция вызывается только при имитации оплаты
    await checkPaymentAndActivate(cardId);
  };

  const handleCopyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert("Ссылка скопирована в буфер обмена!");
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      alert("Не удалось скопировать ссылку");
    }
  };

  const handleViewCard = () => {
    if (shareUrl) {
      window.open(shareUrl, "_blank");
    }
  };

  return (
    <div>
      <Section variant="primary" padding="xl" centerContent>
        <Heading level={1} className="text-4xl md:text-5xl mb-6">
          Создать онлайн визитку
        </Heading>
        <Text size="lg" className="mb-8 max-w-2xl">
          Заполните информацию о себе, и получите уникальную ссылку для вашей визитки
        </Text>
      </Section>

      <Section padding="xl">
        {step === "editor" && (
          <BusinessCardEditor onSubmit={handleEditorSubmit} />
        )}

        {step === "payment" && (
          <div className="max-w-2xl mx-auto">
            <div className="mb-8 text-center">
              <Heading level={2} className="mb-4">
                Оплата визитки
              </Heading>
              <Text className="text-gray-600">
                После оплаты ваша визитка будет доступна по уникальной ссылке
              </Text>
            </div>
            <PaymentForm
              amount={299}
              cardId={cardId || undefined}
              useYooKassa={process.env.NEXT_PUBLIC_USE_YOOKASSA === "true"}
              onSuccess={handlePaymentSuccess}
              onCancel={() => setStep("editor")}
            />
          </div>
        )}

        {step === "success" && (
          <Card className="max-w-2xl mx-auto" padding="xl">
            <div className="text-center">
              <div className="mb-6">
                <svg
                  className="w-20 h-20 text-green-500 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <Heading level={2} className="mb-4">
                  Визитка успешно создана!
                </Heading>
                <Text className="text-gray-600 mb-6">
                  Ваша визитка теперь доступна по ссылке. Поделитесь ею с коллегами и друзьями!
                </Text>
              </div>

              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <Text size="sm" className="text-gray-600 mb-2">
                  Ссылка на вашу визитку:
                </Text>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-mono"
                  />
                  <Button onClick={handleCopyShareUrl} variant="primary" size="sm">
                    Копировать
                  </Button>
                </div>
              </div>

              <div className="flex gap-4 justify-center">
                <Button onClick={handleViewCard} variant="primary">
                  Открыть визитку
                </Button>
                <Button
                  onClick={() => {
                    setStep("editor");
                    setCardData(null);
                    setCardId(null);
                    setShareUrl("");
                  }}
                  variant="secondary">
                  Создать ещё
                </Button>
              </div>
            </div>
          </Card>
        )}
      </Section>
    </div>
  );
}

export default function CreateCardPage() {
  return (
    <Suspense fallback={<div>Загрузка...</div>}>
      <CreateCardContent />
    </Suspense>
  );
}


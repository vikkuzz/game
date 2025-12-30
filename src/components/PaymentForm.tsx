"use client";

import React, { useState } from "react";
import { PaymentData } from "@/types/businessCard";
import { Card } from "@/components/Card";
import { Heading } from "@/components/Heading";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";

interface PaymentFormProps {
  amount?: number;
  cardId?: string;
  onSuccess: () => void;
  onCancel: () => void;
  useYooKassa?: boolean; // Флаг для использования Яндекс.Кассы
}

/**
 * Компонент формы оплаты
 */
export const PaymentForm = React.memo(
  ({
    amount = 299,
    cardId,
    onSuccess,
    onCancel,
    useYooKassa = true,
  }: PaymentFormProps) => {
    const [formData, setFormData] = useState<PaymentData>({
      cardNumber: "",
      expiryDate: "",
      cvv: "",
      cardHolder: "",
    });

    const [isProcessing, setIsProcessing] = useState(false);
    const [errors, setErrors] = useState<
      Partial<Record<keyof PaymentData, string>>
    >({});

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
      // Очищаем ошибку при изменении
      if (errors[name as keyof PaymentData]) {
        setErrors((prev) => ({ ...prev, [name]: undefined }));
      }
    };

    const formatCardNumber = (value: string) => {
      const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
      const matches = v.match(/\d{4,16}/g);
      const match = (matches && matches[0]) || "";
      const parts = [];
      for (let i = 0, len = match.length; i < len; i += 4) {
        parts.push(match.substring(i, i + 4));
      }
      if (parts.length) {
        return parts.join(" ");
      } else {
        return v;
      }
    };

    const formatExpiryDate = (value: string) => {
      const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
      if (v.length >= 2) {
        return v.substring(0, 2) + "/" + v.substring(2, 4);
      }
      return v;
    };

    const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatCardNumber(e.target.value);
      setFormData((prev) => ({ ...prev, cardNumber: formatted }));
    };

    const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatExpiryDate(e.target.value);
      setFormData((prev) => ({ ...prev, expiryDate: formatted }));
    };

    const validate = (): boolean => {
      const newErrors: Partial<Record<keyof PaymentData, string>> = {};

      if (
        !formData.cardNumber ||
        formData.cardNumber.replace(/\s/g, "").length < 16
      ) {
        newErrors.cardNumber = "Введите корректный номер карты";
      }

      if (!formData.expiryDate || formData.expiryDate.length < 5) {
        newErrors.expiryDate = "Введите срок действия (ММ/ГГ)";
      }

      if (!formData.cvv || formData.cvv.length < 3) {
        newErrors.cvv = "Введите CVV код";
      }

      if (!formData.cardHolder || formData.cardHolder.length < 3) {
        newErrors.cardHolder = "Введите имя держателя карты";
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      // Если используется Яндекс.Касса, создаем платеж и перенаправляем
      if (useYooKassa && cardId) {
        setIsProcessing(true);
        try {
          const response = await fetch("/api/payments/create", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              amount,
              description: `Оплата онлайн визитки`,
              cardId,
              returnUrl: `${window.location.origin}/create-card?payment=success&cardId=${cardId}`,
            }),
          });

          const result = await response.json();

          if (result.success && result.payment?.confirmationUrl) {
            // Перенаправляем на страницу оплаты Яндекс.Кассы
            window.location.href = result.payment.confirmationUrl;
          } else {
            alert(
              "Ошибка при создании платежа: " +
                (result.error || "Неизвестная ошибка")
            );
            setIsProcessing(false);
          }
        } catch (error) {
          console.error("Payment error:", error);
          alert("Ошибка при создании платежа");
          setIsProcessing(false);
        }
        return;
      }

      // Старая логика для имитации оплаты (если Яндекс.Касса не используется)
      if (!validate()) {
        return;
      }

      setIsProcessing(true);

      try {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Симуляция обработки
        onSuccess();
      } catch (error) {
        console.error("Payment error:", error);
      } finally {
        setIsProcessing(false);
      }
    };

    return (
      <Card className="max-w-md mx-auto" padding="xl">
        <Heading level={2} className="mb-4">
          Оплата визитки
        </Heading>

        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <Text className="text-gray-700">
            <span className="font-semibold">Сумма к оплате: </span>
            <span className="text-2xl font-bold text-blue-600">{amount} ₽</span>
          </Text>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Номер карты */}
          <div>
            <label
              htmlFor="cardNumber"
              className="block text-sm font-medium text-gray-700 mb-2">
              Номер карты
            </label>
            <input
              type="text"
              id="cardNumber"
              name="cardNumber"
              value={formData.cardNumber}
              onChange={handleCardNumberChange}
              placeholder="1234 5678 9012 3456"
              maxLength={19}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.cardNumber ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.cardNumber && (
              <p className="mt-1 text-sm text-red-500">{errors.cardNumber}</p>
            )}
          </div>

          {/* Срок действия и CVV */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="expiryDate"
                className="block text-sm font-medium text-gray-700 mb-2">
                Срок действия
              </label>
              <input
                type="text"
                id="expiryDate"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleExpiryChange}
                placeholder="ММ/ГГ"
                maxLength={5}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.expiryDate ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.expiryDate && (
                <p className="mt-1 text-sm text-red-500">{errors.expiryDate}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="cvv"
                className="block text-sm font-medium text-gray-700 mb-2">
                CVV
              </label>
              <input
                type="text"
                id="cvv"
                name="cvv"
                value={formData.cvv}
                onChange={handleChange}
                placeholder="123"
                maxLength={4}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.cvv ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.cvv && (
                <p className="mt-1 text-sm text-red-500">{errors.cvv}</p>
              )}
            </div>
          </div>

          {/* Имя держателя */}
          <div>
            <label
              htmlFor="cardHolder"
              className="block text-sm font-medium text-gray-700 mb-2">
              Имя держателя карты
            </label>
            <input
              type="text"
              id="cardHolder"
              name="cardHolder"
              value={formData.cardHolder}
              onChange={handleChange}
              placeholder="IVAN PETROV"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.cardHolder ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.cardHolder && (
              <p className="mt-1 text-sm text-red-500">{errors.cardHolder}</p>
            )}
          </div>

          {/* Информация о безопасности */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-green-600 mr-2 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <Text size="sm" className="text-gray-600">
                Все данные карты обрабатываются безопасно. Мы не храним данные
                вашей карты.
              </Text>
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={isProcessing}
              className="flex-1">
              Назад
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isProcessing}
              className="flex-1">
              {isProcessing ? "Обработка..." : "Оплатить"}
            </Button>
          </div>
        </form>
      </Card>
    );
  }
);

PaymentForm.displayName = "PaymentForm";

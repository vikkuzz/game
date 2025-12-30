"use client";

import React, { useState } from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Heading } from "@/components/Heading";
import { Text } from "@/components/Text";
import { cn } from "@/lib/utils";

interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

interface ContactFormProps {
  className?: string;
}

/**
 * Форма обратной связи
 */
export const ContactForm = React.memo(({ className }: ContactFormProps) => {
  const [formData, setFormData] = useState<ContactFormData>({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error"
  >("idle");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");

    try {
      // Здесь будет логика отправки формы
      // В реальном приложении здесь будет API вызов
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Симуляция отправки

      setSubmitStatus("success");
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
      });
    } catch (error) {
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className={cn("", className)} padding="xl">
      <Heading level={2} className="mb-4">
        Отправьте нам сообщение
      </Heading>
      <Text className="mb-6 text-gray-600">
        Заполните форму ниже, и мы свяжемся с вами в ближайшее время.
      </Text>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Имя */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 mb-2">
            Имя <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ваше имя"
          />
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-2">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="your@email.com"
          />
        </div>

        {/* Телефон */}
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-gray-700 mb-2">
            Телефон
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="+7 (999) 123-45-67"
          />
        </div>

        {/* Тема */}
        <div>
          <label
            htmlFor="subject"
            className="block text-sm font-medium text-gray-700 mb-2">
            Тема <span className="text-red-500">*</span>
          </label>
          <select
            id="subject"
            name="subject"
            required
            value={formData.subject}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="">Выберите тему</option>
            <option value="web-design">Веб-дизайн</option>
            <option value="development">Разработка</option>
            <option value="seo">SEO оптимизация</option>
            <option value="mobile">Мобильная разработка</option>
            <option value="other">Другое</option>
          </select>
        </div>

        {/* Сообщение */}
        <div>
          <label
            htmlFor="message"
            className="block text-sm font-medium text-gray-700 mb-2">
            Сообщение <span className="text-red-500">*</span>
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={6}
            value={formData.message}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Расскажите нам о вашем проекте..."
          />
        </div>

        {/* Статус отправки */}
        {submitStatus === "success" && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
            Спасибо! Ваше сообщение отправлено. Мы свяжемся с вами в ближайшее время.
          </div>
        )}

        {submitStatus === "error" && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            Произошла ошибка при отправке. Пожалуйста, попробуйте еще раз.
          </div>
        )}

        {/* Кнопка отправки */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          disabled={isSubmitting}>
          {isSubmitting ? "Отправка..." : "Отправить сообщение"}
        </Button>
      </form>
    </Card>
  );
});

ContactForm.displayName = "ContactForm";


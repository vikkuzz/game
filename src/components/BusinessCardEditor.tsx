"use client";

import React, { useState, useRef } from "react";
import { BusinessCardFormData } from "@/types/businessCard";
import { Card } from "@/components/Card";
import { Heading } from "@/components/Heading";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { BusinessCardPreview } from "./BusinessCardPreview";
import { cn } from "@/lib/utils";

interface BusinessCardEditorProps {
  onSubmit: (data: BusinessCardFormData) => void;
  onPreview?: (data: BusinessCardFormData) => void;
  initialData?: Partial<BusinessCardFormData>;
}

/**
 * Компонент редактора визитки
 */
export const BusinessCardEditor = React.memo(
  ({ onSubmit, onPreview, initialData }: BusinessCardEditorProps) => {
    const [formData, setFormData] = useState<BusinessCardFormData>({
      firstName: initialData?.firstName || "",
      lastName: initialData?.lastName || "",
      position: initialData?.position || "",
      company: initialData?.company || "",
      phone: initialData?.phone || "",
      email: initialData?.email || "",
      website: initialData?.website || "",
      address: initialData?.address || "",
      photo: null,
      photoPreview: initialData?.photoPreview || "",
      description: initialData?.description || "",
      socialLinks: {
        vkontakte: initialData?.socialLinks?.vkontakte || "",
        telegram: initialData?.socialLinks?.telegram || "",
        instagram: initialData?.socialLinks?.instagram || "",
        facebook: initialData?.socialLinks?.facebook || "",
      },
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleChange = (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSocialLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({
        ...prev,
        socialLinks: { ...prev.socialLinks, [name]: value },
      }));
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        // Проверка типа файла
        if (!file.type.startsWith("image/")) {
          alert("Пожалуйста, выберите изображение");
          return;
        }

        // Проверка размера (макс 5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert("Размер файла не должен превышать 5MB");
          return;
        }

        setFormData((prev) => ({ ...prev, photo: file }));

        // Создание превью
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData((prev) => ({
            ...prev,
            photoPreview: reader.result as string,
          }));
        };
        reader.readAsDataURL(file);
      }
    };

    const handleRemovePhoto = () => {
      setFormData((prev) => ({
        ...prev,
        photo: null,
        photoPreview: "",
      }));
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit(formData);
    };

    // Создаем объект для превью (используя превью фото или пустую строку)
    const previewData = {
      id: "preview",
      firstName: formData.firstName || "Имя",
      lastName: formData.lastName || "Фамилия",
      position: formData.position || "",
      company: formData.company || "",
      phone: formData.phone || "",
      email: formData.email || "",
      website: formData.website,
      address: formData.address,
      photoUrl: formData.photoPreview || undefined,
      description: formData.description,
      socialLinks: formData.socialLinks,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
      shareUrl: "",
    };

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Форма редактирования */}
        <Card padding="xl">
          <Heading level={2} className="mb-6">
            Создание визитки
          </Heading>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Имя и Фамилия */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                  Имя <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Иван"
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                  Фамилия <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Петров"
                />
              </div>
            </div>

            {/* Должность и Компания */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-2">
                  Должность <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="position"
                  name="position"
                  required
                  value={formData.position}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Директор"
                />
              </div>

              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                  Компания <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  required
                  value={formData.company}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="ООО Компания"
                />
              </div>
            </div>

            {/* Телефон и Email */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Телефон <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+7 (999) 123-45-67"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
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
                  placeholder="ivan@example.com"
                />
              </div>
            </div>

            {/* Сайт и Адрес */}
            <div>
              <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-2">
                Сайт
              </label>
              <input
                type="url"
                id="website"
                name="website"
                value={formData.website || ""}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://example.com"
              />
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                Адрес
              </label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address || ""}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="г. Москва, ул. Примерная, д. 1"
              />
            </div>

            {/* Фото */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Фото профиля
              </label>
              <div className="flex items-center gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                  id="photo"
                />
                <label
                  htmlFor="photo"
                  className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors">
                  Выбрать фото
                </label>
                {formData.photoPreview && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="px-4 py-2 text-red-600 hover:text-red-700 transition-colors">
                    Удалить
                  </button>
                )}
              </div>
              {formData.photoPreview && (
                <div className="mt-4">
                  <img
                    src={formData.photoPreview}
                    alt="Preview"
                    className="w-32 h-32 rounded-full object-cover border-2 border-gray-300"
                  />
                </div>
              )}
            </div>

            {/* Описание */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Описание
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                value={formData.description || ""}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Краткое описание о себе..."
              />
            </div>

            {/* Социальные сети */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Социальные сети
              </label>
              <div className="space-y-3">
                <input
                  type="url"
                  name="vkontakte"
                  value={formData.socialLinks.vkontakte || ""}
                  onChange={handleSocialLinkChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="ВКонтакте"
                />
                <input
                  type="url"
                  name="telegram"
                  value={formData.socialLinks.telegram || ""}
                  onChange={handleSocialLinkChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Telegram"
                />
                <input
                  type="url"
                  name="instagram"
                  value={formData.socialLinks.instagram || ""}
                  onChange={handleSocialLinkChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Instagram"
                />
                <input
                  type="url"
                  name="facebook"
                  value={formData.socialLinks.facebook || ""}
                  onChange={handleSocialLinkChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Facebook"
                />
              </div>
            </div>

            {/* Кнопки */}
            <div className="flex gap-4">
              <Button type="submit" variant="primary" className="flex-1">
                Сохранить и продолжить
              </Button>
            </div>
          </form>
        </Card>

        {/* Предпросмотр */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <div className="mb-4">
            <Heading level={3} className="mb-2">
              Предпросмотр
            </Heading>
            <Text size="sm" className="text-gray-600">
              Так будет выглядеть ваша визитка
            </Text>
          </div>
          <BusinessCardPreview card={previewData} />
        </div>
      </div>
    );
  }
);

BusinessCardEditor.displayName = "BusinessCardEditor";


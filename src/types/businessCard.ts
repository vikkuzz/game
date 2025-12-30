/**
 * Социальные сети визитки
 */
export interface SocialLinks {
  vkontakte?: string;
  telegram?: string;
  instagram?: string;
  facebook?: string;
}

/**
 * Данные онлайн визитки
 */
export interface BusinessCard {
  /** Уникальный идентификатор визитки */
  id: string;
  /** Имя */
  firstName: string;
  /** Фамилия */
  lastName: string;
  /** Должность */
  position: string;
  /** Компания */
  company: string;
  /** Телефон */
  phone: string;
  /** Email */
  email: string;
  /** Сайт */
  website?: string;
  /** Адрес */
  address?: string;
  /** URL фото профиля */
  photoUrl?: string;
  /** Описание */
  description?: string;
  /** Социальные сети */
  socialLinks: SocialLinks;
  /** Дата создания */
  createdAt: string;
  /** Дата последнего обновления */
  updatedAt: string;
  /** Статус активности (оплачена/не оплачена) */
  isActive: boolean;
  /** Уникальный URL для sharing */
  shareUrl: string;
}

/**
 * Форма редактирования визитки
 */
export interface BusinessCardFormData {
  firstName: string;
  lastName: string;
  position: string;
  company: string;
  phone: string;
  email: string;
  website?: string;
  address?: string;
  photo?: File | null;
  photoPreview?: string;
  description?: string;
  socialLinks: SocialLinks;
}

/**
 * Данные оплаты
 */
export interface PaymentData {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardHolder: string;
}


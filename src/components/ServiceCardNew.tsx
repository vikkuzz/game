"use client";

import React from "react";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/Button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Интерфейс для описания услуги
 * @interface Service
 */
interface Service {
  /** Название услуги */
  title: string;
  /** Описание услуги */
  description: string;
  /** Цена услуги */
  price: string;
}

/**
 * Варианты стилей для новой карточки услуги
 * @typedef {Object} ServiceCardNewVariants
 * @property {"default" | "elevated" | "flat"} variant - Вариант стиля карточки
 * @property {"light" | "dark"} theme - Тема карточки
 */
const serviceCardNewVariants = cva(
  "border rounded-lg p-6 shadow-md transition-shadow duration-300",
  {
    variants: {
      variant: {
        default: "hover:shadow-lg",
        elevated: "shadow-lg hover:shadow-xl",
        flat: "shadow-sm hover:shadow-md",
      },
      theme: {
        light: "bg-white border-gray-200",
        dark: "bg-gray-800 border-gray-700",
      },
    },
    defaultVariants: {
      variant: "default",
      theme: "light",
    },
  }
);

/**
 * Свойства компонента ServiceCardNew
 * @interface ServiceCardNewProps
 * @extends {React.HTMLAttributes<HTMLDivElement>}
 * @extends {VariantProps<typeof serviceCardNewVariants>}
 */
interface ServiceCardNewProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof serviceCardNewVariants> {
  /** Объект с данными об услуге */
  service: Service;
  /** Дополнительные классы для заголовка */
  titleClassName?: string;
  /** Дополнительные классы для описания */
  descriptionClassName?: string;
  /** Дополнительные классы для цены */
  priceClassName?: string;
  /** Дополнительные классы для кнопки */
  buttonClassName?: string;
  /** Текст на кнопке */
  buttonLabel?: string;
  /** Вариант стиля кнопки */
  buttonVariant?: "primary" | "secondary" | "success" | "warning" | "error";
  /** Обработчик клика по кнопке */
  onButtonClick?: () => void;
}

/**
 * Свойства контейнера ServiceCardNewContainer
 * @interface ServiceCardNewContainerProps
 */
interface ServiceCardNewContainerProps {
  /** Объект с данными об услуге */
  service: Service;
  /** Обработчик заказа услуги */
  onOrder?: (service: Service) => void;
}

/**
 * Контейнер для карточки услуги с логикой заказа
 * @component
 * @param {ServiceCardNewContainerProps} props - Свойства компонента
 * @returns {JSX.Element} Компонент контейнера карточки услуги
 */
export const ServiceCardNewContainer: React.FC<
  ServiceCardNewContainerProps
> = ({ service, onOrder }) => {
  const handleOrder = () => {
    onOrder?.(service);
  };

  return <ServiceCardNew service={service} onButtonClick={handleOrder} />;
};

/**
 * Карточка услуги с ценой и кнопкой заказа
 * @component
 * @param {ServiceCardNewProps} props - Свойства компонента
 * @returns {JSX.Element} Компонент карточки услуги
 *
 * @example
 * <ServiceCardNew
 *   service={{
 *     title: "Веб-дизайн",
 *     description: "Создание современного дизайна",
 *     price: "10000 руб."
 *   }}
 *   buttonLabel="Заказать"
 * />
 */
export const ServiceCardNew = React.memo(
  ({
    service,
    variant,
    theme,
    className,
    titleClassName = "",
    descriptionClassName = "",
    priceClassName = "",
    buttonClassName = "",
    buttonLabel = "Заказать",
    buttonVariant = "primary",
    onButtonClick,
    ...props
  }: ServiceCardNewProps) => {
    const { themeStyles } = useTheme();

    return (
      <div
        className={cn(serviceCardNewVariants({ variant, theme }), className)}
        {...props}>
        <h2 className={cn("text-xl font-semibold mb-2", titleClassName)}>
          {service.title}
        </h2>
        <p className={cn("mb-4", descriptionClassName)}>
          {service.description}
        </p>
        <div className="flex justify-between items-center">
          <span
            className={cn("text-lg font-bold", priceClassName)}
            style={{ color: themeStyles.primary }}>
            {service.price}
          </span>
          <Button
            variant={buttonVariant}
            className={buttonClassName}
            onClick={onButtonClick}
            aria-label={`Заказать услугу ${service.title}`}>
            {buttonLabel}
          </Button>
        </div>
      </div>
    );
  }
);

ServiceCardNew.displayName = "ServiceCardNew";

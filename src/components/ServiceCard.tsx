import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Card } from "@/components/Card";
import { Heading } from "@/components/Heading";
import { Text } from "@/components/Text";

/**
 * Варианты стилей для карточки услуги
 * @typedef {Object} ServiceCardVariants
 * @property {"default" | "featured" | "simple"} variant - Вариант стиля карточки
 * @property {boolean} hover - Наличие эффекта при наведении
 */
const serviceCardVariants = cva("h-full flex flex-col", {
  variants: {
    variant: {
      default: "",
      featured: "border-2 border-blue-500",
      simple: "border border-gray-200",
    },
    hover: {
      true: "hover:shadow-lg transition-shadow duration-300",
      false: "",
    },
  },
  defaultVariants: {
    variant: "default",
    hover: true,
  },
});

/**
 * Варианты стилей для иконки
 * @typedef {Object} IconVariants
 * @property {"blue" | "green" | "purple" | "orange"} color - Цвет иконки
 */
const iconVariants = cva("w-12 h-12 mb-4", {
  variants: {
    color: {
      blue: "text-blue-500",
      green: "text-green-500",
      purple: "text-purple-500",
      orange: "text-orange-500",
    },
  },
  defaultVariants: {
    color: "blue",
  },
});

/**
 * Свойства компонента ServiceCard
 * @interface ServiceCardProps
 * @extends {React.HTMLAttributes<HTMLDivElement>}
 * @extends {VariantProps<typeof serviceCardVariants>}
 */
interface ServiceCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof serviceCardVariants> {
  /** Заголовок услуги */
  title: string;
  /** Описание услуги */
  description: string;
  /** Иконка услуги */
  icon: React.ReactNode;
  /** Цвет иконки */
  iconColor?: "blue" | "green" | "purple" | "orange";
}

/**
 * Карточка услуги с иконкой и описанием
 * @component
 * @param {ServiceCardProps} props - Свойства компонента
 * @returns {JSX.Element} Компонент карточки услуги
 *
 * @example
 * <ServiceCard
 *   title="Веб-дизайн"
 *   description="Создаем современные интерфейсы"
 *   icon={<DesignIcon />}
 *   iconColor="blue"
 * />
 */
export const ServiceCard = React.memo(
  ({
    title,
    description,
    icon,
    variant,
    hover,
    iconColor,
    className,
    ...props
  }: ServiceCardProps) => {
    return (
      <Card
        className={cn(serviceCardVariants({ variant, hover }), className)}
        {...props}>
        <div
          className={cn(iconVariants({ color: iconColor }))}
          aria-hidden="true"
          role="img">
          {icon}
        </div>
        <Heading level={3} className="mb-2">
          {title}
        </Heading>
        <Text className="text-gray-600">{description}</Text>
      </Card>
    );
  }
);

ServiceCard.displayName = "ServiceCard";

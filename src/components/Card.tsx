"use client";

import React from "react";
import { useTheme } from "@/context/ThemeContext";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Варианты стилей для карточки
 * @typedef {Object} CardVariants
 * @property {"default" | "primary" | "secondary" | "success" | "warning" | "error"} variant - Вариант стиля карточки
 * @property {"sm" | "md" | "lg" | "xl" | "none"} shadow - Размер тени
 * @property {"sm" | "md" | "lg" | "xl" | "full" | "none"} rounded - Скругление углов
 * @property {"sm" | "md" | "lg" | "xl" | "none"} padding - Внутренние отступы
 */
const cardVariants = cva("border", {
  variants: {
    variant: {
      default: "bg-white border-gray-200",
      primary: "bg-white border-blue-500",
      secondary: "bg-white border-gray-500",
      success: "bg-white border-green-500",
      warning: "bg-white border-orange-500",
      error: "bg-white border-red-500",
    },
    shadow: {
      sm: "shadow-sm",
      md: "shadow-md",
      lg: "shadow-lg",
      xl: "shadow-xl",
      none: "",
    },
    rounded: {
      sm: "rounded-sm",
      md: "rounded-md",
      lg: "rounded-lg",
      xl: "rounded-xl",
      full: "rounded-full",
      none: "",
    },
    padding: {
      sm: "p-3",
      md: "p-4",
      lg: "p-6",
      xl: "p-8",
      none: "",
    },
  },
  defaultVariants: {
    variant: "default",
    shadow: "md",
    rounded: "lg",
    padding: "lg",
  },
});

/**
 * Свойства компонента Card
 * @interface CardProps
 * @extends {React.HTMLAttributes<HTMLDivElement>}
 * @extends {VariantProps<typeof cardVariants>}
 */
interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  /** Возможность наведения */
  hoverable?: boolean;
}

/**
 * Универсальная карточка с настраиваемыми стилями
 * @component
 * @param {CardProps} props - Свойства компонента
 * @returns {JSX.Element} Компонент карточки
 *
 * @example
 * <Card variant="primary" shadow="lg" rounded="lg" padding="lg" hoverable>
 *   <h3>Заголовок карточки</h3>
 *   <p>Содержимое карточки</p>
 * </Card>
 */
export const Card = React.memo(
  ({
    children,
    variant,
    shadow,
    rounded,
    padding,
    hoverable = false,
    className,
    ...props
  }: CardProps) => {
    const { themeStyles } = useTheme();

    const hoverClasses = hoverable
      ? "hover:shadow-lg transition-shadow duration-300"
      : "";

    return (
      <div
        className={cn(
          cardVariants({ variant, shadow, rounded, padding }),
          hoverClasses,
          className
        )}
        {...props}
        role="region"
        aria-label="Карточка контента">
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

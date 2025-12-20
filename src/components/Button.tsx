"use client";

import React from "react";
import { useTheme } from "@/context/ThemeContext";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Варианты стилей для кнопки
 * @typedef {Object} ButtonVariants
 * @property {"primary" | "secondary" | "success" | "warning" | "error"} variant - Вариант стиля кнопки
 * @property {"sm" | "md" | "lg"} size - Размер кнопки
 */
const buttonVariants = cva(
  "font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        primary: "bg-blue-600 hover:opacity-90 text-white",
        secondary: "bg-gray-600 hover:opacity-90 text-white",
        success: "bg-green-600 hover:opacity-90 text-white",
        warning: "bg-orange-600 hover:opacity-90 text-white",
        error: "bg-red-600 hover:opacity-90 text-white",
      },
      size: {
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2",
        lg: "px-6 py-3 text-lg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

/**
 * Свойства компонента Button
 * @interface ButtonProps
 * @extends {React.ButtonHTMLAttributes<HTMLButtonElement>}
 * @extends {VariantProps<typeof buttonVariants>}
 */
interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Растягивание кнопки на всю ширину родителя */
  fullWidth?: boolean;
}

/**
 * Универсальная кнопка с настраиваемыми стилями
 * @component
 * @param {ButtonProps} props - Свойства компонента
 * @returns {JSX.Element} Компонент кнопки
 *
 * @example
 * <Button variant="primary" size="md" fullWidth onClick={handleClick}>
 *   Нажми меня
 * </Button>
 */
export const Button = React.memo(
  ({
    children,
    variant,
    size,
    fullWidth = false,
    className,
    ...props
  }: ButtonProps) => {
    const { themeStyles } = useTheme();

    // Применяем тему к вариантам
    const getThemedClasses = () => {
      const baseClasses = buttonVariants({ variant, size });
      const themeClasses = "";
      return cn(baseClasses, themeClasses, fullWidth && "w-full", className);
    };

    return (
      <button
        className={getThemedClasses()}
        {...props}
        role="button"
        aria-pressed="false">
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

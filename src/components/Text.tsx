"use client";

import React from "react";
import { useTheme } from "@/context/ThemeContext";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Варианты стилей для текста
 * @typedef {Object} TextVariants
 * @property {"p" | "span" | "div" | "small"} variant - HTML элемент
 * @property {"xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl"} size - Размер шрифта
 * @property {"normal" | "medium" | "semibold" | "bold"} weight - Насыщенность шрифта
 * @property {"left" | "center" | "right" | "justify"} align - Выравнивание текста
 * @property {"primary" | "secondary" | "success" | "warning" | "error" | "default" | "muted"} color - Цвет текста
 */
const textVariants = cva("", {
  variants: {
    variant: {
      p: "",
      span: "",
      div: "",
      small: "",
    },
    size: {
      xs: "text-xs",
      sm: "text-sm",
      base: "text-base",
      lg: "text-lg",
      xl: "text-xl",
      "2xl": "text-2xl",
      "3xl": "text-3xl",
    },
    weight: {
      normal: "font-normal",
      medium: "font-medium",
      semibold: "font-semibold",
      bold: "font-bold",
    },
    align: {
      left: "text-left",
      center: "text-center",
      right: "text-right",
      justify: "text-justify",
    },
    color: {
      primary: "",
      secondary: "",
      success: "",
      warning: "",
      error: "",
      default: "",
      muted: "",
    },
  },
  defaultVariants: {
    variant: "p",
    size: "base",
    weight: "normal",
    align: "left",
    color: "default",
  },
});

/**
 * Свойства компонента Text
 * @interface TextProps
 * @extends {React.HTMLAttributes<HTMLElement>}
 */
interface TextProps extends React.HTMLAttributes<HTMLElement> {
  /** HTML элемент */
  variant?: "p" | "span" | "div" | "small";
  /** Размер шрифта */
  size?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl";
  /** Насыщенность шрифта */
  weight?: "normal" | "medium" | "semibold" | "bold";
  /** Выравнивание текста */
  align?: "left" | "center" | "right" | "justify";
  /** Цвет текста */
  color?:
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "error"
    | "default"
    | "muted";
}

/**
 * Универсальный компонент текста с настраиваемыми стилями
 * @component
 * @param {TextProps} props - Свойства компонента
 * @returns {JSX.Element} Компонент текста
 *
 * @example
 * <Text variant="p" size="lg" weight="semibold" align="center" color="primary">
 *   Пример текста
 * </Text>
 */
export const Text = React.memo(
  ({
    children,
    variant = "p",
    size = "base",
    weight = "normal",
    align = "left",
    color = "default",
    className,
    ...props
  }: TextProps) => {
    const { themeStyles } = useTheme();

    const colorStyle =
      color && color !== "default"
        ? { color: (themeStyles as any)[color] }
        : {};

    return React.createElement(
      variant,
      {
        className: cn(
          textVariants({ variant, size, weight, align, color }),
          className
        ),
        style: colorStyle,
        ...props,
      },
      children
    );
  }
);

Text.displayName = "Text";

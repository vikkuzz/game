"use client";

import React from "react";
import { useTheme } from "@/context/ThemeContext";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Варианты стилей для заголовка
 * @typedef {Object} HeadingVariants
 * @property {1 | 2 | 3 | 4 | 5 | 6} level - Уровень заголовка (h1-h6)
 * @property {"left" | "center" | "right"} align - Выравнивание текста
 * @property {"primary" | "secondary" | "success" | "warning" | "error" | "default"} color - Цвет текста
 */
const headingVariants = cva("font-bold mb-4", {
  variants: {
    level: {
      1: "text-4xl md:text-5xl",
      2: "text-3xl md:text-4xl",
      3: "text-2xl md:text-3xl",
      4: "text-xl md:text-2xl",
      5: "text-lg md:text-xl",
      6: "text-base md:text-lg",
    },
    align: {
      left: "text-left",
      center: "text-center",
      right: "text-right",
    },
    color: {
      primary: "",
      secondary: "",
      success: "",
      warning: "",
      error: "",
      default: "",
    },
  },
  defaultVariants: {
    level: 2,
    align: "left",
    color: "default",
  },
});

/**
 * Свойства компонента Heading
 * @interface HeadingProps
 * @extends {React.HTMLAttributes<HTMLHeadingElement>}
 */
interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /** Уровень заголовка (h1-h6) */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Выравнивание текста */
  align?: "left" | "center" | "right";
  /** Цвет текста */
  color?: "primary" | "secondary" | "success" | "warning" | "error" | "default";
}

/**
 * Универсальный компонент заголовка с настраиваемыми стилями
 * @component
 * @param {HeadingProps} props - Свойства компонента
 * @returns {JSX.Element} Компонент заголовка
 *
 * @example
 * <Heading level={1} align="center" color="primary">
 *   Главный заголовок
 * </Heading>
 */
export const Heading = React.memo(
  ({
    children,
    level = 2,
    align = "left",
    color = "default",
    className,
    ...props
  }: HeadingProps) => {
    const { themeStyles } = useTheme();

    const colorStyle =
      color !== "default" ? { color: (themeStyles as any)[color] } : {};

    return React.createElement(
      `h${level}`,
      {
        className: cn(headingVariants({ level, align, color }), className),
        style: colorStyle,
        ...props,
        role: level === 1 ? "heading" : undefined,
        ["aria-level"]: level === 1 ? 1 : undefined,
      },
      children
    );
  }
);

Heading.displayName = "Heading";

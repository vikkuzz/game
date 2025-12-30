import React from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Варианты стилей для футера
 * @typedef {Object} FooterVariants
 * @property {"default" | "light" | "dark"} variant - Вариант стиля футера
 * @property {"sm" | "md" | "lg" | "xl" | "none"} padding - Внутренние отступы
 */
const footerVariants = cva("w-full", {
  variants: {
    variant: {
      default: "bg-gray-800 text-white",
      light: "bg-gray-100 text-gray-800",
      dark: "bg-gray-900 text-gray-300",
    },
    padding: {
      sm: "py-6",
      md: "py-8",
      lg: "py-12",
      xl: "py-16",
      none: "",
    },
  },
  defaultVariants: {
    variant: "default",
    padding: "md",
  },
});

/**
 * Свойства компонента Footer
 * @interface FooterProps
 * @extends {React.HTMLAttributes<HTMLElement>}
 * @extends {VariantProps<typeof footerVariants>}
 */
interface FooterProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof footerVariants> {}

/**
 * Компонент футера с контактной информацией и ссылками
 * @component
 * @param {FooterProps} props - Свойства компонента
 * @returns {JSX.Element} Компонент футера
 *
 * @example
 * <Footer variant="default" padding="lg" className="my-custom-class" />
 */
export const Footer = React.memo(
  ({ className, variant, padding, ...props }: FooterProps) => {
    const currentYear = new Date().getFullYear();

    return (
      <footer
        className={cn(footerVariants({ variant, padding }), className)}
        {...props}
        role="contentinfo">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <Link href="/" className="text-xl font-bold hover:opacity-80 transition-opacity">
                Logo
              </Link>
              <p className="mt-2 text-sm">© {currentYear} Все права защищены</p>
            </div>
            <div className="flex space-x-6">
              <Link
                href="/privacy"
                className="hover:text-blue-400 transition-colors">
                Политика конфиденциальности
              </Link>
              <Link
                href="/terms"
                className="hover:text-blue-400 transition-colors">
                Условия использования
              </Link>
            </div>
          </div>
        </div>
      </footer>
    );
  }
);

Footer.displayName = "Footer";

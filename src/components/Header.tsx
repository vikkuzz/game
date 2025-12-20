"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * Варианты стилей для хедера
 * @typedef {Object} HeaderVariants
 * @property {"default" | "transparent" | "dark"} variant - Вариант стиля хедера
 * @property {boolean} scrolled - Состояние прокрутки страницы
 */
const headerVariants = cva("fixed w-full z-60 transition-all duration-300", {
  variants: {
    variant: {
      default: "bg-white/80 backdrop-blur-sm border-b border-gray-200",
      transparent: "bg-transparent",
      dark: "bg-gray-900/80 backdrop-blur-sm border-b border-gray-800",
    },
    scrolled: {
      true: "py-2 shadow-md",
      false: "py-4",
    },
  },
  defaultVariants: {
    variant: "default",
    scrolled: false,
  },
});

/**
 * Варианты стилей для навигационных ссылок
 * @typedef {Object} NavLinkVariants
 * @property {boolean} active - Активное состояние ссылки
 * @property {"default" | "dark"} variant - Вариант стиля ссылки
 */
const navLinkVariants = cva("font-medium transition-colors duration-200", {
  variants: {
    active: {
      true: "text-blue-600",
      false: "text-gray-600 hover:text-blue-600",
    },
    variant: {
      default: "",
      dark: "text-gray-300 hover:text-white",
    },
  },
  defaultVariants: {
    active: false,
    variant: "default",
  },
});

/**
 * Свойства компонента Header
 * @interface HeaderProps
 * @extends {React.HTMLAttributes<HTMLElement>}
 * @extends {VariantProps<typeof headerVariants>}
 */
interface HeaderProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof headerVariants> {
  /** Тема хедера */
  theme?: "light" | "dark";
}

/**
 * Компонент хедера с навигацией и переключателем темы
 * @component
 * @param {HeaderProps} props - Свойства компонента
 * @returns {JSX.Element} Компонент хедера
 *
 * @example
 * <Header variant="default" theme="light" className="my-custom-class" />
 */
export const Header = React.memo(
  ({ className, variant, theme = "light", ...props }: HeaderProps) => {
    const [scrolled, setScrolled] = React.useState(false);
    const pathname = usePathname();

    React.useEffect(() => {
      const handleScroll = () => {
        setScrolled(window.scrollY > 10);
      };
      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const navItems = [
      { name: "Главная", href: "/" },
      { name: "Услуги", href: "/services" },
      { name: "Портфолио", href: "/portfolio" },
      { name: "Контакты", href: "/contact" },
    ];

    // Состояние для мобильного меню
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

    // Закрытие мобильного меню при изменении пути
    React.useEffect(() => {
      setMobileMenuOpen(false);
    }, [pathname]);

    // Запрет прокрутки при открытом меню
    React.useEffect(() => {
      if (mobileMenuOpen) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "auto";
      }

      return () => {
        document.body.style.overflow = "auto";
      };
    }, [mobileMenuOpen]);

    return (
      <header
        className={cn(headerVariants({ variant, scrolled }), className)}
        {...props}
        role="banner">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            Logo
          </Link>

          {/* Навигация для десктопа */}
          <nav className="hidden md:flex space-x-8" role="navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  navLinkVariants({
                    active: pathname === item.href,
                    variant: theme === "dark" ? "dark" : "default",
                  })
                )}>
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center space-x-4">
            <ThemeToggle />
            {/* Кнопка мобильного меню */}
            <button
              className="md:hidden"
              aria-label={mobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <span className="sr-only">
                {mobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
              </span>
              <div className="w-6 h-6 flex flex-col justify-center items-center">
                <span
                  className={cn(
                    "block w-5 h-0.5 bg-gray-600 transition-transform duration-300 ease-in-out",
                    mobileMenuOpen ? "rotate-45 translate-y-1" : "mb-1"
                  )}></span>
                <span
                  className={cn(
                    "block w-5 h-0.5 bg-gray-600 transition-opacity duration-300 ease-in-out",
                    mobileMenuOpen ? "opacity-0" : ""
                  )}></span>
                <span
                  className={cn(
                    "block w-5 h-0.5 bg-gray-600 transition-transform duration-300 ease-in-out",
                    mobileMenuOpen ? "-rotate-45 -translate-y-1" : ""
                  )}></span>
              </div>
            </button>
          </div>
        </div>

        {/* Мобильное меню */}
        <div
          id="mobile-menu"
          className={cn(
            "md:hidden fixed inset-0 h-fit z-50 transition-all duration-300 ease-in-out",
            mobileMenuOpen ? "opacity-100 visible" : "opacity-0 invisible"
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Мобильное меню"
          aria-hidden={!mobileMenuOpen}>
          <div
            className="absolute inset-0 bg-black opacity-50 h-screen"
            onClick={() => setMobileMenuOpen(false)}></div>
          <div className="relative z-10 bg-white h-full flex flex-col">
            <div className="container mx-auto px-4 py-8 flex flex-col h-full">
              <div className="flex justify-end mb-8">
                <button
                  className="text-3xl font-bold text-gray-500 hover:text-gray-700"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Закрыть меню">
                  ×
                </button>
              </div>
              <nav className="flex flex-col space-y-6" role="navigation">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "text-2xl font-medium py-2",
                      navLinkVariants({
                        active: pathname === item.href,
                        variant: "default",
                      })
                    )}
                    onClick={() => setMobileMenuOpen(false)}>
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </header>
    );
  }
);

Header.displayName = "Header";

"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MobileMenu } from "@/components/MobileMenu";
import { DesktopNav } from "@/components/DesktopNav";
import { MobileMenuButton } from "@/components/MobileMenuButton";

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
export const navLinkVariants = cva(
  "font-medium transition-colors duration-200",
  {
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
  }
);

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
      { name: "Создать визитку", href: "/create-card" },
      { name: "Розыгрыш", href: "/prize-wheel" },
      { name: "Игра", href: "/game" },
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
          <DesktopNav navItems={navItems} theme={theme} />

          <div className="flex items-center space-x-4">
            <ThemeToggle />
            {/* Кнопка мобильного меню */}
            <MobileMenuButton
              mobileMenuOpen={mobileMenuOpen}
              setMobileMenuOpen={setMobileMenuOpen}
            />
          </div>
        </div>

        {/* Мобильное меню */}
        <MobileMenu
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          navItems={navItems}
        />
      </header>
    );
  }
);

Header.displayName = "Header";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { navLinkVariants } from "@/components/Header";

interface MobileMenuProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  navItems: { name: string; href: string }[];
}

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

export const MobileMenu = React.memo(
  ({ mobileMenuOpen, setMobileMenuOpen, navItems }: MobileMenuProps) => {
    const pathname = usePathname();

    return (
      <div
        className={cn(
          "md:hidden fixed inset-0 z-50 transition-all duration-300 ease-in-out h-fit",
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
    );
  }
);

MobileMenu.displayName = "MobileMenu";

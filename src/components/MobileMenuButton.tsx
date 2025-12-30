import React from "react";
import { cn } from "@/lib/utils";

interface MobileMenuButtonProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export const MobileMenuButton = React.memo(
  ({ mobileMenuOpen, setMobileMenuOpen }: MobileMenuButtonProps) => {
    return (
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
    );
  }
);

MobileMenuButton.displayName = "MobileMenuButton";

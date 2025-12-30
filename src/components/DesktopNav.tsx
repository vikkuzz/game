import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navLinkVariants } from "@/components/Header";

interface DesktopNavProps {
  navItems: { name: string; href: string }[];
  theme: "light" | "dark";
}

export const DesktopNav = React.memo(({ navItems, theme }: DesktopNavProps) => {
  const pathname = usePathname();

  return (
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
  );
});

DesktopNav.displayName = "DesktopNav";

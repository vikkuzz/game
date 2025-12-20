import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const containerVariants = cva("w-full mx-auto", {
  variants: {
    size: {
      sm: "max-w-4xl",
      md: "max-w-5xl",
      lg: "max-w-6xl",
      xl: "max-w-7xl",
      full: "max-w-full",
    },
    paddingX: {
      xs: "px-2",
      sm: "px-4",
      md: "px-6",
      lg: "px-8",
      xl: "px-10",
      none: "",
    },
    paddingY: {
      xs: "py-2",
      sm: "py-4",
      md: "py-6",
      lg: "py-8",
      xl: "py-10",
      none: "",
    },
  },
  defaultVariants: {
    size: "lg",
    paddingX: "md",
    paddingY: "md",
  },
});

interface ContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof containerVariants> {
  center?: boolean;
}

export const Container = React.memo(
  ({
    children,
    size,
    paddingX,
    paddingY,
    center = false,
    className,
    ...props
  }: ContainerProps) => {
    const centerClass = center ? "mx-auto" : "";

    return (
      <div
        className={cn(
          containerVariants({ size, paddingX, paddingY }),
          centerClass,
          className
        )}
        {...props}
        role="presentation">
        {children}
      </div>
    );
  }
);

Container.displayName = "Container";

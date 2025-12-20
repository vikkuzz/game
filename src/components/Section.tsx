import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Container } from "@/components/Container";

const sectionVariants = cva("", {
  variants: {
    variant: {
      default: "bg-white",
      primary: "bg-blue-50",
      secondary: "bg-gray-50",
      light: "bg-gray-100",
      dark: "bg-gray-800 text-white",
    },
    padding: {
      sm: "py-8",
      md: "py-12",
      lg: "py-16",
      xl: "py-20",
      none: "",
    },
  },
  defaultVariants: {
    variant: "default",
    padding: "lg",
  },
});

interface SectionProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof sectionVariants> {
  centerContent?: boolean;
}

export const Section = React.memo(
  ({
    children,
    variant,
    padding,
    centerContent = false,
    className,
    ...props
  }: SectionProps) => {
    return (
      <section
        className={cn(sectionVariants({ variant, padding }), className)}
        {...props}
        role="region"
        aria-labelledby={props.id ? `${props.id}-heading` : undefined}>
        <Container center={centerContent}>{children}</Container>
      </section>
    );
  }
);

Section.displayName = "Section";

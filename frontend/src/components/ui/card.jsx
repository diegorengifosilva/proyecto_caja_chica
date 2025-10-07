// src/components/ui/card.jsx
import * as React from "react";

// Card principal
const Card = React.forwardRef(({ className = "", ...props }, ref) => (
  <div
    ref={ref}
    className={`rounded-2xl border bg-white shadow-sm dark:bg-gray-900 dark:border-gray-700 ${className}`}
    {...props}
  />
));
Card.displayName = "Card";

// Encabezado del card
const CardHeader = React.forwardRef(({ className = "", ...props }, ref) => (
  <div
    ref={ref}
    className={`p-4 border-b border-gray-200 dark:border-gray-700 ${className}`}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

// Título
const CardTitle = React.forwardRef(({ className = "", ...props }, ref) => (
  <h3
    ref={ref}
    className={`text-lg font-semibold leading-none tracking-tight text-gray-800 dark:text-gray-100 ${className}`}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

// Descripción
const CardDescription = React.forwardRef(
  ({ className = "", ...props }, ref) => (
    <p
      ref={ref}
      className={`text-sm text-gray-500 dark:text-gray-400 ${className}`}
      {...props}
    />
  )
);
CardDescription.displayName = "CardDescription";

// Contenido
const CardContent = React.forwardRef(({ className = "", ...props }, ref) => (
  <div ref={ref} className={`p-4 space-y-2 ${className}`} {...props} />
));
CardContent.displayName = "CardContent";

// Footer con layout flexible
const CardFooter = React.forwardRef(
  ({ className = "", align = "end", ...props }, ref) => {
    const alignment = {
      start: "justify-start",
      center: "justify-center",
      end: "justify-end",
      between: "justify-between",
    }[align];

    return (
      <div
        ref={ref}
        className={`flex items-center gap-2 p-4 border-t border-gray-200 dark:border-gray-700 ${alignment} ${className}`}
        {...props}
      />
    );
  }
);
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
};

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium rounded-3xl text-sm sm:text-base transition-all duration-300 ease-in-out shadow-md focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-background focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "text-white",
        destructive: "text-white",
        outline:
          "border border-gray-300 bg-white text-gray-800 shadow-sm hover:bg-gray-50 hover:text-gray-900",
        secondary: "text-gray-900 shadow-sm hover:shadow-md",
        ghost: "bg-transparent hover:bg-gray-100 text-gray-800",
        link: "text-blue-600 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 sm:px-6",
        sm: "h-8 px-3 text-xs sm:text-sm",
        lg: "h-12 px-8 text-base sm:text-lg",
        icon: "h-10 w-10 sm:h-12 sm:w-12 p-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const Button = React.forwardRef(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      fromColor,
      toColor,
      hoverFrom,
      hoverTo,
      loading = false,
      disabled = false,
      style,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    // Gradiente principal dinámico
    const gradientStyle =
      fromColor && toColor
        ? { backgroundImage: `linear-gradient(to right, ${fromColor}, ${toColor})`, ...style }
        : style;

    // Color del spinner adaptativo: blanco si gradiente oscuro, negro si claro
    const spinnerColor =
      fromColor || toColor
        ? getContrastColor(fromColor || "#4f46e5")
        : "white";

    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, className }),
          "relative overflow-hidden group",
          disabled && "cursor-not-allowed opacity-50",
          loading && "cursor-wait"
        )}
        style={gradientStyle}
        ref={ref}
        disabled={disabled}
        {...props}
      >
        {/* Spinner adaptativo */}
        {loading && (
          <Loader2
            className={`animate-spin absolute left-3 w-4 h-4`}
            style={{ color: spinnerColor }}
          />
        )}

        <span className={cn(loading ? "opacity-50" : "", "flex items-center justify-center w-full")}>
          {children}
        </span>

        {/* Hover & Active profesional */}
        <style jsx>{`
          button.group:hover:not(:disabled) {
            background-image: linear-gradient(
              to right,
              ${hoverFrom || fromColor || "#4f46e5"},
              ${hoverTo || toColor || "#3b82f6"}
            );
            transform: scale(1.02);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
          }
          button.group:active:not(:disabled) {
            transform: scale(0.98);
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
          }
        `}</style>
      </Comp>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };

/**
 * Calcula un color de contraste (blanco o negro) según luminosidad de fondo
 */
function getContrastColor(hex) {
  if (!hex) return "white";
  let c = hex.substring(1); // quitar #
  let rgb = parseInt(c, 16); // convertir a número
  let r = (rgb >> 16) & 0xff;
  let g = (rgb >> 8) & 0xff;
  let b = rgb & 0xff;
  // Fórmula de luminancia relativa
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 186 ? "black" : "white";
}

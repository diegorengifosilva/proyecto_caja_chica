import * as React from "react";
import { cn } from "@/lib/utils";

const Badge = React.forwardRef(({ className, variant = "default", ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variant === "default" && "bg-gray-200 text-gray-900",
        variant === "success" && "bg-green-200 text-green-900",
        variant === "warning" && "bg-yellow-200 text-yellow-900",
        variant === "error" && "bg-red-200 text-red-900",
        className
      )}
      {...props}
    />
  );
});
Badge.displayName = "Badge";

export { Badge };

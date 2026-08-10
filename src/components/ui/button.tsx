import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "glass";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      children,
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center rounded-full font-medium transition-all duration-300 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
          // Variants
          {
            "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/10 hover:shadow-blue-600/25 hover:from-blue-500 hover:to-indigo-500":
              variant === "primary",
            "bg-gray-900 text-white hover:bg-black hover:shadow-lg hover:shadow-gray-900/15":
              variant === "secondary",
            "border border-gray-200 text-gray-800 bg-white hover:bg-gray-50 hover:border-gray-300":
              variant === "outline",
            "glass-card hover:bg-white/60 text-gray-800 border border-white/60 shadow-sm hover:shadow-md hover:border-blue-500/20":
              variant === "glass",
          },
          // Sizes
          {
            "px-4 py-1.5 text-xs": size === "sm",
            "px-6 py-2.5 text-sm": size === "md",
            "px-8 py-3.5 text-base": size === "lg",
          },
          className
        )}
        {...props}
      >
        {loading ? (
          <svg
            className="mr-2 h-4 w-4 animate-spin text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };

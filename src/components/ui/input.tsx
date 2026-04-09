import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm text-text placeholder:text-text-dim shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9)] transition-[border-color,box-shadow] duration-200 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };

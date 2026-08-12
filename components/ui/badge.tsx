import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-primary/30 bg-primary/10 text-primary",
        secondary:
          "border-white/10 bg-white/[0.06] text-muted-foreground",
        accent:
          "border-accent/30 bg-accent/10 text-accent",
        success:
          "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
        warn:
          "border-amber-400/30 bg-amber-400/10 text-amber-300",
        danger:
          "border-destructive/30 bg-destructive/10 text-destructive",
        outline: "border-white/15 text-foreground/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

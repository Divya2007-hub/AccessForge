import * as React from "react";
import { Info, TriangleAlert, CircleCheck, CircleX } from "lucide-react";
import { cn } from "@/lib/utils";

type NoticeVariant = "info" | "warning" | "success" | "danger";

const styles: Record<
  NoticeVariant,
  { container: string; icon: React.ElementType; title: string }
> = {
  info: {
    container: "border-indigo-400/20 bg-indigo-400/[0.06]",
    icon: Info,
    title: "text-indigo-200",
  },
  warning: {
    container: "border-warning/25 bg-warning/[0.07]",
    icon: TriangleAlert,
    title: "text-amber-200",
  },
  success: {
    container: "border-success/25 bg-success/[0.06]",
    icon: CircleCheck,
    title: "text-emerald-200",
  },
  danger: {
    container: "border-destructive/25 bg-destructive/[0.07]",
    icon: CircleX,
    title: "text-rose-200",
  },
};

export interface NoticeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: NoticeVariant;
  title?: string;
  icon?: React.ElementType;
}

export function Notice({
  variant = "info",
  title,
  icon,
  className,
  children,
  ...props
}: NoticeProps) {
  const config = styles[variant];
  const Icon = icon ?? config.icon;

  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border px-4 py-3 text-sm leading-relaxed",
        config.container,
        className,
      )}
      {...props}
    >
      <Icon
        className={cn("mt-0.5 size-4 shrink-0", config.title)}
        aria-hidden="true"
      />
      <div className="min-w-0 space-y-1">
        {title ? (
          <p className={cn("font-medium", config.title)}>{title}</p>
        ) : null}
        <div className="text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-foreground">
          {children}
        </div>
      </div>
    </div>
  );
}

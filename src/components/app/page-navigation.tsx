import type * as React from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  href?: string;
  label: string;
}

export interface PageBackLink {
  href: string;
  label: string;
}

export function BackLink({
  href,
  label,
  className,
}: PageBackLink & { className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm text-xs text-subtle transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <ArrowLeft className="size-3.5" aria-hidden="true" />
      {label}
    </Link>
  );
}

export function Breadcrumbs({
  items,
  className,
}: {
  items: BreadcrumbItem[];
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-subtle">
        {items.map((item, index) => {
          const current = index === items.length - 1;

          return (
            <li
              key={`${item.href ?? "current"}-${item.label}`}
              className="flex items-center gap-1.5"
            >
              {index > 0 ? (
                <ChevronRight
                  className="size-3 text-subtle/60"
                  aria-hidden="true"
                />
              ) : null}
              {item.href && !current ? (
                <Link
                  href={item.href}
                  className="rounded-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={current ? "page" : undefined}
                  className={current ? "text-muted-foreground" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function PageNavigation({
  back,
  breadcrumbs,
  actions,
  className,
}: {
  back?: PageBackLink;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-4 gap-y-2",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {back ? <BackLink {...back} /> : null}
        {breadcrumbs ? <Breadcrumbs items={breadcrumbs} /> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const primaryLinks = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/review", label: "Review Fixes" },
  { href: "/progress", label: "Progress" },
];

const resourceLinks = [
  { href: "/help", label: "Help" },
  { href: "/demo-site", label: "Demo website", external: true },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteMobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  const close = React.useCallback(() => {
    setOpen(false);
  }, []);

  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        panelRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  React.useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const handleChange = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false);
    };

    desktop.addEventListener("change", handleChange);
    return () => desktop.removeEventListener("change", handleChange);
  }, []);

  const renderLink = (link: {
    href: string;
    label: string;
    external?: boolean;
  }) => {
    const className = cn(
      "flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      isActivePath(pathname, link.href)
        ? "bg-white/[0.055] text-foreground"
        : "text-muted-foreground hover:bg-white/[0.035] hover:text-foreground",
    );

    if (link.external) {
      return (
        <a
          key={link.href}
          href={link.href}
          target="_blank"
          rel="noreferrer"
          className={className}
          onClick={close}
        >
          {link.label}
          <ExternalLink className="size-3.5 text-subtle" aria-hidden="true" />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      );
    }

    return (
      <Link
        key={link.href}
        href={link.href}
        className={className}
        aria-current={
          isActivePath(pathname, link.href) ? "page" : undefined
        }
        onClick={close}
      >
        {link.label}
      </Link>
    );
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-surface-2 text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
        aria-expanded={open}
        aria-controls="public-mobile-navigation"
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? (
          <X className="size-5" aria-hidden="true" />
        ) : (
          <Menu className="size-5" aria-hidden="true" />
        )}
      </button>

      {open ? (
        <div
          ref={panelRef}
          id="public-mobile-navigation"
          className="absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-white/[0.06] bg-surface shadow-[0_24px_60px_-30px_rgba(0,0,0,0.95)] lg:hidden"
        >
          <nav
            aria-label="Primary mobile"
            className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6"
          >
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-subtle">
              Workspace
            </p>
            <ul className="space-y-1">
              {primaryLinks.map((link) => (
                <li key={link.href}>{renderLink(link)}</li>
              ))}
            </ul>

            <p className="px-3 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-subtle">
              Resources
            </p>
            <ul className="space-y-1">
              {resourceLinks.map((link) => (
                <li key={link.href}>{renderLink(link)}</li>
              ))}
            </ul>
          </nav>
        </div>
      ) : null}
    </>
  );
}

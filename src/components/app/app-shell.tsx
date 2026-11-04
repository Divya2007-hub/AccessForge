"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  CircleDashed,
  Code2,
  ExternalLink,
  HelpCircle,
  LayoutDashboard,
  Menu,
  ScanSearch,
  X,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { useDeveloperMode } from "@/components/developer-mode-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/dashboard", label: "My scans", icon: LayoutDashboard },
  { href: "/review", label: "Review fixes", icon: ScanSearch },
  { href: "/progress", label: "Progress", icon: CircleDashed },
  { href: "/help", label: "Help", icon: HelpCircle },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/review") return pathname === "/review";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function DeveloperModeButton({
  className,
  showLabel = true,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const { enabled, toggle } = useDeveloperMode();

  return (
    <button
      type="button"
      aria-pressed={enabled}
      onClick={toggle}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        enabled
          ? "border-violet-400/30 bg-violet-400/[0.1] text-violet-200"
          : "border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
        className,
      )}
    >
      <Code2 className="size-3.5" aria-hidden="true" />
      {showLabel ? (
        <span>{enabled ? "Developer on" : "Developer mode"}</span>
      ) : null}
    </button>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const developer = useDeveloperMode();
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!mobileOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setMobileOpen(false);
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
      setMobileOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Brand size="sm" />

          <nav
            aria-label="Main"
            className="hidden items-center gap-1 md:flex"
          >
            {navigation.map((item) => {
              const active = isActivePath(pathname, item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "bg-white/[0.06] text-foreground"
                      : "text-muted-foreground hover:bg-white/[0.035] hover:text-foreground",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4",
                      active ? "text-violet-300" : "text-subtle",
                    )}
                    aria-hidden="true"
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <DeveloperModeButton className="hidden md:inline-flex" />
            <Button asChild size="sm">
              <Link href="/scanner">
                <span className="sm:hidden">Scan</span>
                <span className="hidden sm:inline">New scan</span>
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <button
              ref={triggerRef}
              type="button"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-surface-2 text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
              aria-expanded={mobileOpen}
              aria-controls="app-mobile-navigation"
              aria-label={
                mobileOpen ? "Close navigation menu" : "Open navigation menu"
              }
              onClick={() => setMobileOpen((open) => !open)}
            >
              {mobileOpen ? (
                <X className="size-5" aria-hidden="true" />
              ) : (
                <Menu className="size-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <div
            ref={panelRef}
            id="app-mobile-navigation"
            className="absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-white/[0.06] bg-surface shadow-[0_24px_60px_-30px_rgba(0,0,0,0.95)] md:hidden"
          >
            <nav
              aria-label="Main mobile"
              className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6"
            >
              <ul className="space-y-1">
                {navigation.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  const Icon = item.icon;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          active
                            ? "bg-white/[0.06] text-foreground"
                            : "text-muted-foreground hover:bg-white/[0.035] hover:text-foreground",
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-4",
                            active ? "text-violet-300" : "text-subtle",
                          )}
                          aria-hidden="true"
                        />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
                <li>
                  <a
                    href="/demo-site"
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setMobileOpen(false)}
                    className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/[0.035] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ExternalLink
                      className="size-4 text-subtle"
                      aria-hidden="true"
                    />
                    Demo website
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </li>
              </ul>

              <div className="mt-4 border-t border-white/[0.06] pt-4">
                <DeveloperModeButton className="w-full justify-start" />
              </div>
            </nav>
          </div>
        ) : null}
      </header>

      {developer.enabled ? (
        <div className="border-b border-violet-400/15 bg-violet-400/[0.05]">
          <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs text-violet-100/80 sm:px-6">
            <p>
              Developer Mode is on. Technical details, exports, audit logs, and
              Switch setup are visible.
            </p>
            <Link
              href="/agents"
              className="rounded-sm font-medium text-violet-200 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Agent setup
            </Link>
          </div>
        </div>
      ) : null}

      <main
        id="main-content"
        className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10"
      >
        {children}
      </main>
    </div>
  );
}

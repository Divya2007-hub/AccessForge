import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Brand } from "@/components/brand";
import { SiteMobileNav } from "@/components/site-mobile-nav";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/review", label: "Review Fixes" },
  { href: "/progress", label: "Progress" },
  { href: "/help", label: "Help" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-8">
        <Brand />

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex"
          >
            <Link href="/demo-site" target="_blank" rel="noreferrer">
              View demo
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/scanner">
              <span className="sm:hidden">Scan</span>
              <span className="hidden sm:inline">Scan a website</span>
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
          <SiteMobileNav />
        </div>
      </div>
    </header>
  );
}

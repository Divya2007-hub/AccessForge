import Link from "next/link";
import { Brand } from "@/components/brand";
import { Badge } from "@/components/ui/badge";

const productLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/scanner", label: "Scan Website" },
  { href: "/review", label: "Review Fixes" },
  { href: "/agents", label: "AI Activity" },
];

const resourceLinks = [
  { href: "/help", label: "Help" },
  { href: "/help#limits", label: "Automated limits" },
  { href: "/demo-site", label: "Demo website", external: true },
  { href: "/#how-it-works", label: "How it works" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.06] bg-surface/50">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.6fr_1fr_1fr]">
        <div className="max-w-sm space-y-4">
          <Brand />
          <p className="text-sm leading-relaxed text-muted-foreground">
            A focused accessibility workspace for real findings, understandable
            impact, and human-reviewed fixes.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success">Live scanner</Badge>
            <Badge variant="outline">Human-in-the-loop</Badge>
          </div>
        </div>

        <nav aria-label="Product" className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-subtle">
            Product
          </h2>
          <ul className="space-y-2.5">
            {productLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Resources" className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-subtle">
            Resources
          </h2>
          <ul className="space-y-2.5">
            {resourceLinks.map((link) => (
              <li key={link.label}>
                {link.external ? (
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    href={link.href}
                    className="rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {link.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-white/[0.06]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-5 py-6 text-xs text-subtle sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© {new Date().getFullYear()} AccessForge. Built for the open web.</p>
          <p>
            Reports, drafts, and decisions stay in this browser. Switch handoff
            is optional. GitHub automation is not connected.
          </p>
        </div>
      </div>
    </footer>
  );
}

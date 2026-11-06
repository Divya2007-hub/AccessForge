import Link from "next/link";
import { cn } from "@/lib/utils";

interface BrandProps {
  href?: string;
  className?: string;
  showWordmark?: boolean;
  size?: "sm" | "md";
}

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[11px] bg-gradient-to-br from-violet-400 via-violet-600 to-indigo-600 shadow-[0_1px_0_0_rgba(255,255,255,0.35)_inset,0_8px_24px_-10px_rgba(124,58,237,0.9)]",
        className,
      )}
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_55%)]" />
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="relative size-5 text-white"
      >
        <path
          d="M6.5 18.5 12 5.5l5.5 13"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9 14h6"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export function Brand({
  href = "/",
  className,
  showWordmark = true,
  size = "md",
}: BrandProps) {
  const content = (
    <>
      <BrandMark className={size === "sm" ? "size-8 rounded-[10px]" : undefined} />
      {showWordmark ? (
        <span
          className={cn(
            "font-semibold tracking-tight text-foreground",
            size === "sm" ? "text-sm" : "text-[15px]",
          )}
        >
          Access<span className="text-violet-300">Forge</span>
        </span>
      ) : null}
    </>
  );

  if (!href) {
    return (
      <span className={cn("inline-flex items-center gap-2.5", className)}>
        {content}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={href === "/" ? "AccessForge home" : undefined}
      className={cn(
        "inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      {content}
    </Link>
  );
}

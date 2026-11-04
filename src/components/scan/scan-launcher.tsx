"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ExternalLink,
  FlaskConical,
  Globe,
  Loader2,
  ScanSearch,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/ui/notice";
import { requestDemoScan, requestUrlScan } from "@/lib/client/scan-client";
import { saveScan } from "@/lib/client/scan-history";
import { cn } from "@/lib/utils";

function validateUrlInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Enter a website URL to scan.";

  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return "That does not look like a valid URL. Try https://example.com.";
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return "Only public HTTP and HTTPS URLs can be scanned.";
  }

  if (!url.hostname) {
    return "The URL must include a hostname.";
  }

  return null;
}

interface ScanLauncherProps {
  variant?: "hero" | "panel";
  showDemo?: boolean;
  className?: string;
}

export function ScanLauncher({
  variant = "panel",
  showDemo = true,
  className,
}: ScanLauncherProps) {
  const router = useRouter();
  const fieldId = React.useId();
  const helpId = `${fieldId}-help`;
  const errorId = `${fieldId}-error`;
  const [url, setUrl] = React.useState("");
  const [urlError, setUrlError] = React.useState<string | null>(null);
  const [scanError, setScanError] = React.useState<string | null>(null);
  const [scanning, setScanning] = React.useState(false);
  const [demoError, setDemoError] = React.useState<string | null>(null);
  const [demoLoading, setDemoLoading] = React.useState(false);

  const busy = scanning || demoLoading;
  const hero = variant === "hero";

  async function persistAndOpen(
    action: () => Promise<Awaited<ReturnType<typeof requestUrlScan>>>,
    setError: (message: string) => void,
  ) {
    try {
      const report = await action();
      saveScan(report);
      router.push(`/report/${report.id}`);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "The scan could not be completed. Please try again.",
      );
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setScanError(null);

    const validationError = validateUrlInput(url);
    if (validationError) {
      setUrlError(validationError);
      return;
    }

    setUrlError(null);
    setScanning(true);
    await persistAndOpen(
      () => requestUrlScan(url.trim()),
      (message) => {
        setScanError(message);
        setScanning(false);
      },
    );
  }

  async function runDemo() {
    setDemoError(null);
    setDemoLoading(true);
    await persistAndOpen(requestDemoScan, (message) => {
      setDemoError(message);
      setDemoLoading(false);
    });
  }

  return (
    <div className={cn("space-y-4", className)}>
      <form onSubmit={handleSubmit} noValidate className="space-y-3">
        <div className="space-y-2">
          <Label
            htmlFor={fieldId}
            className={hero ? "text-sm text-muted-foreground" : undefined}
          >
            Website URL
          </Label>
          <div
            className={cn(
              "flex flex-col gap-2 sm:flex-row",
              hero && "sm:items-center",
            )}
          >
            <div className="relative min-w-0 flex-1">
              <Globe
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle"
                aria-hidden="true"
              />
              <Input
                id={fieldId}
                name="url"
                type="url"
                inputMode="url"
                autoComplete="url"
                spellCheck={false}
                placeholder="https://example.com"
                value={url}
                onChange={(event) => {
                  setUrl(event.target.value);
                  if (urlError) setUrlError(null);
                  if (scanError) setScanError(null);
                }}
                aria-invalid={urlError ? true : undefined}
                aria-describedby={`${helpId}${urlError ? ` ${errorId}` : ""}`}
                disabled={busy}
                className={cn(
                  "pl-10",
                  hero && "h-12 rounded-xl bg-surface-2/70 text-base sm:h-14",
                )}
              />
            </div>
            <Button
              type="submit"
              disabled={busy}
              aria-busy={scanning}
              size={hero ? "lg" : "default"}
              className={cn(
                "w-full sm:w-auto",
                hero && "h-12 rounded-xl px-6 sm:h-14",
              )}
            >
              {scanning ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <ScanSearch aria-hidden="true" />
              )}
              {scanning ? "Scanning…" : "Run accessibility scan"}
            </Button>
          </div>
          <p id={helpId} className="text-xs leading-relaxed text-subtle">
            Public HTTP or HTTPS pages only. One page per scan. No account
            required.
          </p>
          {urlError ? (
            <p
              id={errorId}
              role="alert"
              className="text-xs font-medium text-rose-300"
            >
              {urlError}
            </p>
          ) : null}
        </div>

        {scanError ? (
          <Notice
            variant="danger"
            title="Scan could not be completed"
            role="alert"
          >
            {scanError}
          </Notice>
        ) : null}

        {scanning ? (
          <div
            role="status"
            aria-live="polite"
            className="flex items-start gap-3 rounded-lg border border-violet-400/15 bg-violet-400/[0.04] px-4 py-3"
          >
            <Loader2
              className="mt-0.5 size-4 animate-spin text-violet-300"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-medium text-foreground">
                Loading the page and running axe-core checks…
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                A real headless browser is rendering the site. This usually
                takes 5–30 seconds.
              </p>
            </div>
          </div>
        ) : null}
      </form>

      {showDemo ? (
        <div className="flex flex-col gap-2 border-t border-white/[0.06] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground">
              Want to see it first?
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-subtle">
              Audit the intentionally inaccessible demo site included with
              AccessForge.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={runDemo}
              disabled={busy}
              aria-busy={demoLoading}
            >
              {demoLoading ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <FlaskConical aria-hidden="true" />
              )}
              {demoLoading ? "Auditing demo…" : "Run demo audit"}
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/demo-site" target="_blank" rel="noreferrer">
                View demo
                <ExternalLink aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      ) : null}

      {demoError ? (
        <Notice
          variant="danger"
          title="Demo audit could not be completed"
          role="alert"
        >
          {demoError}
        </Notice>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-subtle">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 text-emerald-300/80" aria-hidden="true" />
          Private and internal targets are blocked
        </span>
        <Link
          href="/help#scanning"
          className="inline-flex items-center gap-1 rounded-sm text-violet-300 underline-offset-4 hover:underline"
        >
          How scanning works
          <ArrowRight className="size-3" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

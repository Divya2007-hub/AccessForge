"use client";

import * as React from "react";

const STORAGE_KEY = "accessforge.developer-mode.v1";
const EVENT_NAME = "accessforge:developer-mode";

interface DeveloperModeContextValue {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  toggle: () => void;
}

const DeveloperModeContext =
  React.createContext<DeveloperModeContextValue | null>(null);

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => undefined;

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onStoreChange();
  };
  const handleCustom = () => onStoreChange();

  window.addEventListener("storage", handleStorage);
  window.addEventListener(EVENT_NAME, handleCustom);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(EVENT_NAME, handleCustom);
  };
}

function getSnapshot() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function getServerSnapshot() {
  return false;
}

export function DeveloperModeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const enabled = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setEnabled = React.useCallback((next: boolean) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(next));
      window.dispatchEvent(new Event(EVENT_NAME));
    } catch {
      return;
    }
  }, []);

  const toggle = React.useCallback(() => {
    setEnabled(!getSnapshot());
  }, [setEnabled]);

  const value = React.useMemo(
    () => ({ enabled, setEnabled, toggle }),
    [enabled, setEnabled, toggle],
  );

  return (
    <DeveloperModeContext.Provider value={value}>
      {children}
    </DeveloperModeContext.Provider>
  );
}

export function useDeveloperMode() {
  const context = React.useContext(DeveloperModeContext);

  if (!context) {
    throw new Error(
      "useDeveloperMode must be used within DeveloperModeProvider.",
    );
  }

  return context;
}

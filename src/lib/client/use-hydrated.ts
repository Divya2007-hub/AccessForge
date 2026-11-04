"use client";

import * as React from "react";

function subscribe() {
  return () => undefined;
}

export function useHydrated() {
  return React.useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

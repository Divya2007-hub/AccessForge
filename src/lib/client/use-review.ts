"use client";

import * as React from "react";
import {
  getReviewState,
  subscribeToReview,
} from "@/lib/client/review-store";
import { useHydrated } from "@/lib/client/use-hydrated";
import type { ReviewState } from "@/lib/review/types";

const SERVER_STATE: ReviewState = {
  version: 1,
  drafts: {},
  events: [],
};

export function useReviewState() {
  const state = React.useSyncExternalStore(
    subscribeToReview,
    getReviewState,
    () => SERVER_STATE,
  );
  const hydrated = useHydrated();

  return { state, hydrated };
}

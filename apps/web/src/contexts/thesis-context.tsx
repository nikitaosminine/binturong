"use client";

import { createContext, useContext } from "react";
import type { Thesis } from "@/lib/thesis";

export interface ThesisContextValue {
  theses: Thesis[];
  addThesis: (data: Omit<Thesis, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateThesis: (id: string, data: Partial<Omit<Thesis, "id">>) => Promise<void>;
  deleteThesis: (id: string) => Promise<void>;
  openDrawer: (id: string) => void;
  openModal: (
    thesis?: Thesis,
    prefill?: Partial<Pick<Thesis, "title" | "summary" | "tickers" | "horizon" | "tags">>,
  ) => void;
}

export const ThesisContext = createContext<ThesisContextValue | null>(null);

export function useThesisContext(): ThesisContextValue {
  const ctx = useContext(ThesisContext);
  if (!ctx) throw new Error("useThesisContext must be used inside AppLayout");
  return ctx;
}

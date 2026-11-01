"use client";

import { useEffect, useState } from "react";

import { createGuestPortfolioMemoryAdapter, type GuestPortfolioMemoryAdapter } from "@/lib/guest-portfolio-memory";
import { PortfolioBuilderEditorShell } from "./portfolio-builder-editor-shell";

export function GuestPortfolioBuilderForm() {
  const [adapter, setAdapter] = useState<GuestPortfolioMemoryAdapter | null>(null);

  useEffect(() => {
    setAdapter(current => current ?? createGuestPortfolioMemoryAdapter());
  }, []);

  if (!adapter) return <main aria-busy="true" className="min-h-screen" role="status">Otvaranje editora...</main>;
  return <PortfolioBuilderEditorShell project={adapter.getSnapshot()} adapter={adapter} />;
}

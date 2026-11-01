"use client";
import { useState } from "react";
import { createProfileMemoryAdapter, type ProfileEditorSeed } from "@/lib/portfolio-profile-memory";
import { PortfolioBuilderEditorShell } from "./portfolio-builder-editor-shell";
export function PortfolioProfileEditor({ seed }: { seed: ProfileEditorSeed }) {
  const [adapter] = useState(() => createProfileMemoryAdapter(seed));
  return <PortfolioBuilderEditorShell project={adapter.getSnapshot()} adapter={adapter} />;
}

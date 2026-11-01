"use client";
import { useEffect, useRef, useState } from "react";
import type { AccountTheme } from "./artist-dashboard";
import { getAccountTheme, saveAccountTheme } from "@/services/artist-dashboard";
const storageKey = "artboard-portfolio-studio-theme", eventName = "artboard:account-theme";
export function useAccountTheme(initial: AccountTheme, enabled = true, load = false) {
  const [theme, setTheme] = useState(initial), [error, setError] = useState("");
  const revision = useRef(0), queue = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => {
    if (!enabled) return;
    const incoming = (e: Event) => { const value = e instanceof StorageEvent ? e.newValue : (e as CustomEvent).detail; if (value === "light" || value === "dark") { revision.current++; setTheme(value); } };
    const storage = (e: StorageEvent) => { if (e.key === storageKey) incoming(e); };
    window.addEventListener(eventName, incoming); window.addEventListener("storage", storage);
    let live = true; const at = revision.current;
    if (load) void getAccountTheme().then(p => { if (live && at === revision.current) setTheme(p.theme); }).catch(() => {
      try { const value = localStorage.getItem(storageKey); if (live && at === revision.current && (value === "light" || value === "dark")) setTheme(value); } catch {}
    });
    return () => { live = false; window.removeEventListener(eventName, incoming); window.removeEventListener("storage", storage); };
  }, [enabled, load]);
  function changeTheme(value: AccountTheme) {
    revision.current++; const at = revision.current; setTheme(value); setError("");
    if (!enabled) return;
    queue.current = queue.current.catch(() => {}).then(() => saveAccountTheme(value)).then(() => {
      if (at === revision.current) { try { localStorage.setItem(storageKey, value); } catch {} window.dispatchEvent(new CustomEvent(eventName, { detail: value })); }
    }).catch(() => { if (at === revision.current) setError("Tema je promijenjena u ovoj stranici, ali nije sačuvana na nalogu. Pokušaj ponovo."); });
  }
  return { theme, changeTheme, error };
}

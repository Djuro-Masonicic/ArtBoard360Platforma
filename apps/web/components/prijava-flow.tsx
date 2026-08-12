"use client";

import { useState } from "react";

import { PrijavaEntryOptions } from "@/components/prijava-entry-options";
import { PrijavaForm } from "@/components/prijava-form";

interface DisciplineOption {
  id: string;
  name: string;
  slug: string;
}

interface PrijavaFlowProps {
  disciplines: DisciplineOption[];
}

/**
 * The prijava page starts with a simple choice instead of showing the full form
 * immediately. This keeps the page calmer and makes the two user paths clear:
 * new artists open the application form, existing approved artists go to login.
 */
export function PrijavaFlow({ disciplines }: PrijavaFlowProps) {
  const [isFormVisible, setIsFormVisible] = useState(false);

  function handleStartApplication() {
    setIsFormVisible(true);

    // Wait until React has rendered the form, then scroll to it smoothly.
    window.requestAnimationFrame(() => {
      document.querySelector("#prijava-form")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  return (
    <>
      <PrijavaEntryOptions onStartApplication={handleStartApplication} />

      {isFormVisible ? (
        <div id="prijava-form" className="scroll-mt-28">
          <PrijavaForm disciplines={disciplines} />
        </div>
      ) : null}
    </>
  );
}

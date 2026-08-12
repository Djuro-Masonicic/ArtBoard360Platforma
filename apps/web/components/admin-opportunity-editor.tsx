"use client";

import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useState, useTransition } from "react";

import {
  createOpportunity,
  deleteOpportunity,
  Opportunity,
  OpportunityMutationPayload,
  OpportunityType,
  updateOpportunity,
} from "@/services/opportunities";

const opportunityTypes: Array<{ value: OpportunityType; label: string }> = [
  { value: "OPEN_CALL", label: "Open call" },
  { value: "JOB", label: "Posao" },
  { value: "RESIDENCY", label: "Rezidencija" },
  { value: "EXHIBITION", label: "Izlozba" },
  { value: "COLLABORATION", label: "Saradnja" },
  { value: "GRANT", label: "Grant" },
  { value: "OTHER", label: "Ostalo" },
];

type AdminOpportunityEditorProps = {
  initialOpportunity?: Opportunity;
};

/**
 * Shared admin editor for opportunities.
 *
 * New and edit screens use the same component so field behavior stays
 * consistent. The API still decides final validation and slug uniqueness.
 */
export function AdminOpportunityEditor({ initialOpportunity }: AdminOpportunityEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(initialOpportunity?.title ?? "");
  const [slug, setSlug] = useState(initialOpportunity?.slug ?? "");
  const [type, setType] = useState<OpportunityType>(initialOpportunity?.type ?? "OPEN_CALL");
  const [organization, setOrganization] = useState(initialOpportunity?.organization ?? "");
  const [location, setLocation] = useState(initialOpportunity?.location ?? "");
  const [summary, setSummary] = useState(initialOpportunity?.summary ?? "");
  const [description, setDescription] = useState(initialOpportunity?.description ?? "");
  const [applyUrl, setApplyUrl] = useState(initialOpportunity?.applyUrl ?? "");
  const [contactEmail, setContactEmail] = useState(initialOpportunity?.contactEmail ?? "");
  const [deadlineAt, setDeadlineAt] = useState(toDateInputValue(initialOpportunity?.deadlineAt));
  const [isPaid, setIsPaid] = useState(initialOpportunity?.isPaid ?? false);
  const [isFeatured, setIsFeatured] = useState(initialOpportunity?.isFeatured ?? false);
  const [isArchived, setIsArchived] = useState(initialOpportunity?.isArchived ?? false);
  const [isDraft, setIsDraft] = useState(initialOpportunity?.isDraft ?? false);

  function buildPayload(): OpportunityMutationPayload {
    return {
      title,
      slug,
      type,
      organization,
      location,
      summary,
      description,
      applyUrl,
      contactEmail,
      deadlineAt,
      isPaid,
      isFeatured,
      isArchived,
      isDraft,
    };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        const savedOpportunity = initialOpportunity
          ? await updateOpportunity(initialOpportunity.id, buildPayload())
          : await createOpportunity(buildPayload());

        setMessage("Oglas je sacuvan.");
        router.refresh();

        if (!initialOpportunity) {
          router.push(`/admin/opportunities/${savedOpportunity.id}`);
        }
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Oglas nije sacuvan.");
      }
    });
  }

  function handleDelete() {
    if (!initialOpportunity) {
      return;
    }

    const confirmed = window.confirm("Da li sigurno zelis da obrises ovaj oglas?");

    if (!confirmed) {
      return;
    }

    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        await deleteOpportunity(initialOpportunity.id);
        router.push("/admin/opportunities");
        router.refresh();
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Oglas nije obrisan.");
      }
    });
  }

  return (
    <form className="grid gap-6" onSubmit={handleSubmit}>
      {(message || error) && (
        <div
          className={`rounded-[20px] border px-5 py-4 text-[15px] font-medium ${
            error
              ? "border-[#ffd0d7] bg-[#fff6f7] text-[#b10f28]"
              : "border-[#c9eed6] bg-[#f2fff6] text-[#14753a]"
          }`}
        >
          {error || message}
        </div>
      )}

      <section className="rounded-[28px] border border-[#dde4ef] bg-white/95 p-6 shadow-[0_16px_44px_rgba(31,46,86,0.05)]">
        <p className="text-[13px] font-bold uppercase tracking-[0.24em] text-[#7f8794]">
          Osnovni podaci
        </p>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Field label="Naslov *">
            <input
              className={inputClassName}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Npr. Konkurs za mlade umjetnike"
              required
              type="text"
              value={title}
            />
          </Field>
          <Field label="Slug">
            <input
              className={inputClassName}
              onChange={(event) => setSlug(event.target.value)}
              placeholder="Ako ostane prazno, generise se automatski"
              type="text"
              value={slug}
            />
          </Field>
          <Field label="Tip">
            <select
              className={inputClassName}
              onChange={(event) => setType(event.target.value as OpportunityType)}
              value={type}
            >
              {opportunityTypes.map((opportunityType) => (
                <option key={opportunityType.value} value={opportunityType.value}>
                  {opportunityType.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Deadline">
            <input
              className={inputClassName}
              onChange={(event) => setDeadlineAt(event.target.value)}
              type="date"
              value={deadlineAt}
            />
          </Field>
          <Field label="Organizacija">
            <input
              className={inputClassName}
              onChange={(event) => setOrganization(event.target.value)}
              type="text"
              value={organization}
            />
          </Field>
          <Field label="Lokacija">
            <input
              className={inputClassName}
              onChange={(event) => setLocation(event.target.value)}
              type="text"
              value={location}
            />
          </Field>
          <Field label="Link za prijavu">
            <input
              className={inputClassName}
              onChange={(event) => setApplyUrl(event.target.value)}
              placeholder="https://..."
              type="url"
              value={applyUrl}
            />
          </Field>
          <Field label="Kontakt email">
            <input
              className={inputClassName}
              onChange={(event) => setContactEmail(event.target.value)}
              type="email"
              value={contactEmail}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-[28px] border border-[#dde4ef] bg-white/95 p-6 shadow-[0_16px_44px_rgba(31,46,86,0.05)]">
        <p className="text-[13px] font-bold uppercase tracking-[0.24em] text-[#7f8794]">
          Sadrzaj
        </p>
        <div className="mt-5 grid gap-5">
          <Field label="Kratak opis">
            <textarea
              className={`${inputClassName} min-h-[96px] rounded-[24px] py-4`}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="Jedna do dvije recenice za karticu oglasa."
              value={summary}
            />
          </Field>
          <Field label="Detaljan opis *">
            <textarea
              className={`${inputClassName} min-h-[220px] rounded-[24px] py-4`}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Uslovi, rokovi, kome je namijenjeno, kako se prijavljuje..."
              required
              value={description}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-[28px] border border-[#dde4ef] bg-white/95 p-6 shadow-[0_16px_44px_rgba(31,46,86,0.05)]">
        <p className="text-[13px] font-bold uppercase tracking-[0.24em] text-[#7f8794]">
          Status
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Toggle label="Placeno" value={isPaid} onChange={setIsPaid} />
          <Toggle label="Istaknuto" value={isFeatured} onChange={setIsFeatured} />
          <Toggle label="Arhivirano" value={isArchived} onChange={setIsArchived} />
          <Toggle label="Draft" value={isDraft} onChange={setIsDraft} />
        </div>
      </section>

      <div className="flex flex-wrap justify-between gap-3">
        {initialOpportunity ? (
          <button
            className="inline-flex h-12 items-center justify-center rounded-full border border-[#ffd0d7] px-6 text-[16px] font-bold text-[#dc1735] transition hover:bg-[#fff1f4]"
            disabled={isPending}
            onClick={handleDelete}
            type="button"
          >
            Obrisi oglas
          </button>
        ) : (
          <span />
        )}
        <button
          className="inline-flex h-12 items-center justify-center rounded-full bg-[#182fc7] px-7 text-[16px] font-bold text-white transition hover:bg-[#1326a8] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Cuvam..." : "Sacuvaj oglas"}
        </button>
      </div>
    </form>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="grid gap-2 text-[14px] font-semibold text-[#4f5762]">
      {label}
      {children}
    </label>
  );
}

function Toggle({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: boolean) => void;
  value: boolean;
}) {
  return (
    <button
      className={`flex h-14 items-center justify-between rounded-[18px] border px-4 text-left text-[15px] font-bold transition ${
        value
          ? "border-[#182fc7] bg-[#eef2ff] text-[#182fc7]"
          : "border-[#d7dee9] bg-[#f8fbff] text-[#4f5762]"
      }`}
      onClick={() => onChange(!value)}
      type="button"
    >
      <span>{label}</span>
      <span className="text-[13px]">{value ? "Da" : "Ne"}</span>
    </button>
  );
}

function toDateInputValue(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}

const inputClassName =
  "min-h-12 w-full rounded-full border border-[#d7dee9] bg-white px-5 text-[16px] text-[#2f3138] outline-none transition placeholder:text-[#9aa4b2] focus:border-[#182fc7]";

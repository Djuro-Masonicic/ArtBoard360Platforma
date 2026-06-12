"use client";

import { startTransition, useState } from "react";

import type { ArtistSubmissionListItem, ArtistSubmissionStatus, Discipline } from "@/types/api";
import { ApiError } from "@/services/api";
import { updateArtistSubmission } from "@/services/artist-submissions";

interface AdminAdmissionEditorProps {
  disciplines: Discipline[];
  submission: ArtistSubmissionListItem;
}

interface FormState {
  fullName: string;
  email: string;
  phone: string;
  biography: string;
  motto: string;
  blogUrl: string;
  notes: string;
  adminNotes: string;
  confirmedRules: boolean;
  status: ArtistSubmissionStatus;
  disciplineSlugs: string[];
  portfolioLinks: string[];
  socialLinks: string[];
}

type SaveState =
  | { kind: "idle" }
  | { kind: "saving"; label: string }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export function AdminAdmissionEditor({ disciplines, submission }: AdminAdmissionEditorProps) {
  const [artworks, setArtworks] = useState(submission.artworks);
  const [formState, setFormState] = useState<FormState>({
    fullName: submission.fullName,
    email: submission.email,
    phone: submission.phone ?? "",
    biography: submission.biography,
    motto: submission.motto ?? "",
    blogUrl: submission.blogUrl ?? "",
    notes: submission.notes ?? "",
    adminNotes: submission.adminNotes ?? "",
    confirmedRules: submission.confirmedRules,
    status: submission.status,
    disciplineSlugs: submission.disciplines.map((discipline) => discipline.slug),
    portfolioLinks: submission.portfolioLinks.map((link) => link.url),
    socialLinks: submission.socialLinks.map((link) => link.url),
  });
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });

  const fieldClassName =
    "w-full rounded-[1.2rem] border border-[#dbe2ec] bg-white px-4 py-3 text-[16px] text-[#2f3138] outline-none transition focus:border-[#182fc7]";
  const areaClassName = `${fieldClassName} min-h-36 resize-y`;

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setFormState((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function setLink(kind: "portfolioLinks" | "socialLinks", index: number, value: string) {
    setFormState((current) => ({
      ...current,
      [kind]: current[kind].map((item, currentIndex) => (currentIndex === index ? value : item)),
    }));
  }

  function addLink(kind: "portfolioLinks" | "socialLinks") {
    setFormState((current) => ({
      ...current,
      [kind]: [...current[kind], ""],
    }));
  }

  function removeLink(kind: "portfolioLinks" | "socialLinks", index: number) {
    setFormState((current) => ({
      ...current,
      [kind]: current[kind].filter((_, currentIndex) => currentIndex !== index),
    }));
  }

  function toggleDiscipline(slug: string) {
    setFormState((current) => {
      if (current.disciplineSlugs.includes(slug)) {
        return {
          ...current,
          disciplineSlugs: current.disciplineSlugs.filter((item) => item !== slug),
        };
      }

      if (current.disciplineSlugs.length >= 3) {
        return current;
      }

      return {
        ...current,
        disciplineSlugs: [...current.disciplineSlugs, slug],
      };
    });
  }

  function removeArtwork(artworkId: string) {
    setArtworks((current) => current.filter((artwork) => artwork.id !== artworkId));
  }

  async function submitUpdate(forcedStatus?: ArtistSubmissionStatus) {
    setSaveState({
      kind: "saving",
      label:
        forcedStatus === "APPROVED"
          ? "Odobravanje prijave..."
          : forcedStatus === "REJECTED"
            ? "Odbijanje prijave..."
            : "Cuvanje izmjena...",
    });

    try {
      const response = await updateArtistSubmission(submission.id, {
        fullName: formState.fullName.trim(),
        email: formState.email.trim(),
        phone: formState.phone.trim(),
        biography: formState.biography.trim(),
        motto: formState.motto.trim(),
        blogUrl: formState.blogUrl.trim(),
        notes: formState.notes.trim(),
        adminNotes: formState.adminNotes.trim(),
        confirmedRules: formState.confirmedRules,
        status: forcedStatus ?? formState.status,
        disciplines: formState.disciplineSlugs,
        portfolioLinks: formState.portfolioLinks.map((item) => item.trim()).filter(Boolean),
        socialLinks: formState.socialLinks.map((item) => item.trim()).filter(Boolean),
        keptArtworkIds: artworks.map((artwork) => artwork.id),
      });

      startTransition(() => {
        setFormState((current) => ({
          ...current,
          status: response.status,
          fullName: response.fullName,
          email: response.email,
          phone: response.phone ?? "",
          biography: response.biography,
          motto: response.motto ?? "",
          blogUrl: response.blogUrl ?? "",
          notes: response.notes ?? "",
          adminNotes: response.adminNotes ?? "",
          confirmedRules: response.confirmedRules,
          disciplineSlugs: response.disciplines.map((discipline) => discipline.slug),
          portfolioLinks: response.portfolioLinks.map((link) => link.url),
          socialLinks: response.socialLinks.map((link) => link.url),
        }));
        setArtworks(response.artworks);
      });

      setSaveState({
        kind: "success",
        message:
          forcedStatus === "APPROVED"
            ? "Prijava je odobrena."
            : forcedStatus === "REJECTED"
              ? "Prijava je odbijena."
              : "Izmjene su sacuvane.",
      });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Izmjene trenutno nije moguce sacuvati. Pokusaj ponovo.";

      setSaveState({
        kind: "error",
        message,
      });
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="space-y-6 rounded-[30px] border border-[#dde4ef] bg-white/95 p-6 shadow-[0_18px_48px_rgba(31,46,86,0.06)] sm:p-8">
        {saveState.kind !== "idle" ? (
          <div
            className={`rounded-[18px] border px-5 py-4 text-[15px] ${
              saveState.kind === "success"
                ? "border-[#1f9d52]/20 bg-[#ecfbf2] text-[#176f3b]"
                : saveState.kind === "error"
                  ? "border-[#dc1735]/20 bg-[#fff1f4] text-[#b4132c]"
                  : "border-[#182fc7]/16 bg-[#eef2ff] text-[#182fc7]"
            }`}
          >
            {saveState.kind === "saving" ? saveState.label : saveState.message}
          </div>
        ) : null}

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Ime i prezime">
            <input
              className={fieldClassName}
              onChange={(event) => setField("fullName", event.target.value)}
              type="text"
              value={formState.fullName}
            />
          </Field>

          <Field label="Status">
            <select
              className={fieldClassName}
              onChange={(event) => setField("status", event.target.value as ArtistSubmissionStatus)}
              value={formState.status}
            >
              <option value="PENDING">PENDING</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </Field>

          <Field label="E-mail">
            <input
              className={fieldClassName}
              onChange={(event) => setField("email", event.target.value)}
              type="email"
              value={formState.email}
            />
          </Field>

          <Field label="Telefon">
            <input
              className={fieldClassName}
              onChange={(event) => setField("phone", event.target.value)}
              type="text"
              value={formState.phone}
            />
          </Field>

          <Field label="Moto">
            <input
              className={fieldClassName}
              onChange={(event) => setField("motto", event.target.value)}
              type="text"
              value={formState.motto}
            />
          </Field>

          <Field label="Blog URL">
            <input
              className={fieldClassName}
              onChange={(event) => setField("blogUrl", event.target.value)}
              type="url"
              value={formState.blogUrl}
            />
          </Field>
        </div>

        <Field label="Biografija">
          <textarea
            className={areaClassName}
            onChange={(event) => setField("biography", event.target.value)}
            value={formState.biography}
          />
        </Field>

        <Field label="Napomene autora">
          <textarea
            className={areaClassName}
            onChange={(event) => setField("notes", event.target.value)}
            value={formState.notes}
          />
        </Field>

        <Field label="Admin napomene">
          <textarea
            className={areaClassName}
            onChange={(event) => setField("adminNotes", event.target.value)}
            value={formState.adminNotes}
          />
        </Field>

        <section className="space-y-4 rounded-[24px] border border-[#e2e8f0] bg-[#f8fbff] p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[18px] font-semibold text-[#2f3138]">Disciplina</h3>
            <span className="rounded-full bg-white px-3 py-1 text-[14px] text-[#66707d]">
              {formState.disciplineSlugs.length}/3
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {disciplines.map((discipline) => {
              const isChecked = formState.disciplineSlugs.includes(discipline.slug);
              const disableUnchecked = !isChecked && formState.disciplineSlugs.length >= 3;

              return (
                <label
                  className={`flex items-start gap-3 rounded-[18px] border p-4 text-[15px] transition ${
                    isChecked
                      ? "border-[#182fc7]/20 bg-[#eef2ff] text-[#2f3138]"
                      : "border-[#dce3ed] bg-white text-[#54606d]"
                  }`}
                  key={discipline.id}
                >
                  <input
                    checked={isChecked}
                    disabled={disableUnchecked}
                    onChange={() => toggleDiscipline(discipline.slug)}
                    type="checkbox"
                  />
                  <span>{discipline.name}</span>
                </label>
              );
            })}
          </div>
        </section>

        <LinksEditor
          addLink={() => addLink("portfolioLinks")}
          label="Portfolio linkovi"
          links={formState.portfolioLinks}
          onChange={(index, value) => setLink("portfolioLinks", index, value)}
          onRemove={(index) => removeLink("portfolioLinks", index)}
        />

        <LinksEditor
          addLink={() => addLink("socialLinks")}
          label="Drustvene mreze"
          links={formState.socialLinks}
          onChange={(index, value) => setLink("socialLinks", index, value)}
          onRemove={(index) => removeLink("socialLinks", index)}
        />

        <label className="flex items-start gap-3 rounded-[20px] border border-[#e2e8f0] bg-[#f8fbff] p-4 text-[15px] text-[#4f5762]">
          <input
            checked={formState.confirmedRules}
            onChange={(event) => setField("confirmedRules", event.target.checked)}
            type="checkbox"
          />
          <span>Autor je potvrdio pravila prijave.</span>
        </label>

        <div className="flex flex-wrap gap-3 border-t border-[#e7ecf3] pt-5">
          <button
            className="inline-flex items-center justify-center rounded-full border border-[#182fc7] px-5 py-3 text-[15px] font-medium text-[#182fc7] transition hover:bg-[#182fc7] hover:text-white"
            onClick={() => submitUpdate()}
            type="button"
          >
            Sacuvaj izmjene
          </button>
          <button
            className="inline-flex items-center justify-center rounded-full border border-[#1f9d52] px-5 py-3 text-[15px] font-medium text-[#176f3b] transition hover:bg-[#1f9d52] hover:text-white"
            onClick={() => submitUpdate("APPROVED")}
            type="button"
          >
            Odobri prijavu
          </button>
          <button
            className="inline-flex items-center justify-center rounded-full border border-[#dc1735] px-5 py-3 text-[15px] font-medium text-[#b4132c] transition hover:bg-[#dc1735] hover:text-white"
            onClick={() => submitUpdate("REJECTED")}
            type="button"
          >
            Odbij prijavu
          </button>
        </div>
      </section>

      <aside className="space-y-6">
        <section className="rounded-[30px] border border-[#dde4ef] bg-white/95 p-5 shadow-[0_18px_48px_rgba(31,46,86,0.06)]">
          <h3 className="text-[18px] font-semibold text-[#2f3138]">Profilna fotografija</h3>
          {submission.profilePhotoUrl ? (
            <img
              alt={submission.fullName}
              className="mt-4 w-full rounded-[24px] border border-[#e1e7ef] object-cover"
              src={submission.profilePhotoUrl}
            />
          ) : (
            <p className="mt-4 text-[15px] text-[#66707d]">Nema profilne fotografije.</p>
          )}
        </section>

        <section className="rounded-[30px] border border-[#dde4ef] bg-white/95 p-5 shadow-[0_18px_48px_rgba(31,46,86,0.06)]">
          <h3 className="text-[18px] font-semibold text-[#2f3138]">Materijali</h3>

          {submission.portfolioPdfUrl ? (
            <a
              className="mt-4 inline-flex items-center rounded-full border border-[#dc1735] px-4 py-2 text-[15px] font-medium text-[#dc1735] transition hover:bg-[#dc1735] hover:text-white"
              href={submission.portfolioPdfUrl}
              rel="noreferrer"
              target="_blank"
            >
              Otvori PDF portfolio
            </a>
          ) : null}

          <div className="mt-5 space-y-3">
            {artworks.map((artwork) => (
              <div
                className="flex items-center gap-3 rounded-[18px] border border-[#e2e8f0] bg-[#f8fbff] p-3"
                key={artwork.id}
              >
                <a
                  className="flex min-w-0 flex-1 items-center gap-3 transition hover:opacity-80"
                  href={artwork.imageUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <img
                    alt={artwork.originalFileName}
                    className="h-14 w-14 rounded-[14px] object-cover"
                    src={artwork.imageUrl}
                  />
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-medium text-[#2f3138]">
                      {artwork.originalFileName}
                    </div>
                    <div className="text-[13px] text-[#66707d]">
                      {artwork.mimeType} • {formatFileSize(artwork.fileSizeBytes)}
                    </div>
                  </div>
                </a>

                <button
                  className="shrink-0 rounded-full border border-[#dc1735]/20 bg-white px-3 py-2 text-[13px] font-medium text-[#b4132c] transition hover:border-[#dc1735] hover:bg-[#fff1f4]"
                  onClick={() => removeArtwork(artwork.id)}
                  type="button"
                >
                  Ukloni
                </button>
              </div>
            ))}

            {artworks.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-[#d8e0eb] bg-white px-4 py-5 text-[14px] text-[#66707d]">
                Nema vise zadrzanih radova. Sacuvaj izmjene ako zelis da uklanjanje bude trajno.
              </div>
            ) : null}
          </div>
        </section>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-[15px] font-semibold text-[#2f3138]">{label}</span>
      {children}
    </label>
  );
}

function LinksEditor({
  label,
  links,
  onChange,
  onRemove,
  addLink,
}: {
  label: string;
  links: string[];
  onChange: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  addLink: () => void;
}) {
  const fieldClassName =
    "w-full rounded-[1.2rem] border border-[#dbe2ec] bg-white px-4 py-3 text-[16px] text-[#2f3138] outline-none transition focus:border-[#182fc7]";

  return (
    <section className="space-y-4 rounded-[24px] border border-[#e2e8f0] bg-[#f8fbff] p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[18px] font-semibold text-[#2f3138]">{label}</h3>
        <button
          className="inline-flex items-center justify-center rounded-full border border-[#d5dce7] bg-white px-4 py-2 text-[14px] font-medium text-[#4d5562] transition hover:border-[#bcc7d6]"
          onClick={addLink}
          type="button"
        >
          Dodaj
        </button>
      </div>

      <div className="space-y-3">
        {links.map((link, index) => (
          <div className="flex flex-col gap-3 sm:flex-row" key={`${label}-${index}`}>
            <input
              className={fieldClassName}
              onChange={(event) => onChange(index, event.target.value)}
              type="url"
              value={link}
            />

            {links.length > 1 ? (
              <button
                className="inline-flex items-center justify-center rounded-full border border-[#d5dce7] bg-white px-4 py-2 text-[14px] font-medium text-[#4d5562] transition hover:border-[#bcc7d6]"
                onClick={() => onRemove(index)}
                type="button"
              >
                Ukloni
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function formatFileSize(value: number) {
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (value >= 1024) {
    return `${Math.round(value / 1024)} KB`;
  }

  return `${value} B`;
}

"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";

import { logoutArtistAction } from "@/app/artist/login/actions";
import {
  deleteArtistArtwork,
  updateArtistProfile,
  uploadArtistArtwork,
  uploadArtistProfileImage,
} from "@/services/artist-profile";
import type { Artist, Artwork, SocialPlatform } from "@/types/api";

interface ArtistDashboardEditorProps {
  artist: Artist;
  sessionEmail: string;
}

interface SocialLinkDraft {
  id: string;
  platform: SocialPlatform;
  url: string;
}

const socialPlatformOptions: Array<{ value: SocialPlatform; label: string }> = [
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "BEHANCE", label: "Behance" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "PERSONAL_WEBSITE", label: "Website" },
  { value: "YOUTUBE", label: "YouTube" },
  { value: "X_TWITTER", label: "X / Twitter" },
];

/**
 * This editor intentionally stays direct and explicit.
 * Artists can update the core content that shapes their public profile
 * without going through a complicated CMS-like interface.
 */
export function ArtistDashboardEditor({
  artist: initialArtist,
  sessionEmail,
}: ArtistDashboardEditorProps) {
  const [artist, setArtist] = useState(initialArtist);
  const [bio, setBio] = useState(initialArtist.bio ?? "");
  const [quote, setQuote] = useState(initialArtist.quote ?? "");
  const [email, setEmail] = useState(initialArtist.email ?? sessionEmail);
  const [coverImageUrl, setCoverImageUrl] = useState(initialArtist.coverImageUrl ?? "");
  const [socialLinks, setSocialLinks] = useState<SocialLinkDraft[]>(
    initialArtist.socialLinks.length > 0
      ? initialArtist.socialLinks.map((link) => ({
          id: link.id,
          platform: link.platform,
          url: link.url,
        }))
      : [{ id: "new-0", platform: "INSTAGRAM", url: "" }],
  );
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [isUploadingProfileImage, setIsUploadingProfileImage] = useState(false);
  const [isUploadingArtworks, setIsUploadingArtworks] = useState(false);
  const [deletingArtworkId, setDeletingArtworkId] = useState<string | null>(null);
  const profileImageInputRef = useRef<HTMLInputElement | null>(null);
  const artworkInputRef = useRef<HTMLInputElement | null>(null);

  function syncArtist(nextArtist: Artist) {
    setArtist(nextArtist);
    setBio(nextArtist.bio ?? "");
    setQuote(nextArtist.quote ?? "");
    setEmail(nextArtist.email ?? sessionEmail);
    setCoverImageUrl(nextArtist.coverImageUrl ?? "");
    setSocialLinks(
      nextArtist.socialLinks.length > 0
        ? nextArtist.socialLinks.map((link) => ({
            id: link.id,
            platform: link.platform,
            url: link.url,
          }))
        : [{ id: `new-${Date.now()}`, platform: "INSTAGRAM", url: "" }],
    );
  }

  function clearMessages() {
    setFeedbackMessage(null);
    setErrorMessage(null);
  }

  function handleSaveProfile() {
    clearMessages();

    startSaving(async () => {
      try {
        const nextArtist = await updateArtistProfile({
          bio,
          quote,
          email,
          coverImageUrl,
          socialLinks: socialLinks
            .map((link) => ({
              platform: link.platform,
              url: link.url.trim(),
            }))
            .filter((link) => link.url),
        });

        syncArtist(nextArtist);
        setFeedbackMessage("Profil je uspjesno sacuvan.");
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Profil nije mogao biti sacuvan.");
      }
    });
  }

  async function handleProfileImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    clearMessages();
    setIsUploadingProfileImage(true);

    try {
      const nextArtist = await uploadArtistProfileImage(file);
      syncArtist(nextArtist);
      setFeedbackMessage("Profilna fotografija je azurirana.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Profilna fotografija nije mogla biti uploadovana.",
      );
    } finally {
      setIsUploadingProfileImage(false);
      event.target.value = "";
    }
  }

  async function handleArtworkUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;

    if (!files || files.length === 0) {
      return;
    }

    clearMessages();
    setIsUploadingArtworks(true);

    try {
      const uploadedArtworks: Artwork[] = [];

      for (const [index, file] of Array.from(files).entries()) {
        const uploadedArtwork = await uploadArtistArtwork({
          file,
          orderIndex: artist.artworks.length + index,
        });

        uploadedArtworks.push(uploadedArtwork);
      }

      setArtist((currentArtist) => ({
        ...currentArtist,
        artworks: [...currentArtist.artworks, ...uploadedArtworks].sort(
          (left, right) => left.orderIndex - right.orderIndex,
        ),
      }));
      setFeedbackMessage(`${uploadedArtworks.length} rad(a) je uspjesno dodat u portfolio.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Radovi nijesu mogli biti uploadovani.");
    } finally {
      setIsUploadingArtworks(false);
      event.target.value = "";
    }
  }

  async function handleDeleteArtwork(artworkId: string) {
    const shouldDelete = window.confirm("Da li zelis da obrises ovaj rad iz portfolija?");

    if (!shouldDelete) {
      return;
    }

    clearMessages();
    setDeletingArtworkId(artworkId);

    try {
      await deleteArtistArtwork(artworkId);
      setArtist((currentArtist) => ({
        ...currentArtist,
        artworks: currentArtist.artworks.filter((artwork) => artwork.id !== artworkId),
      }));
      setFeedbackMessage("Rad je obrisan iz portfolija.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Rad nije mogao biti obrisan.");
    } finally {
      setDeletingArtworkId(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-8 px-[4vw] pb-16 pt-[16vh]">
      <section className="rounded-[32px] border border-[#dde4ef] bg-white/95 px-7 py-8 shadow-[0_18px_56px_rgba(31,46,86,0.08)] sm:px-9">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[13px] font-medium uppercase tracking-[0.28em] text-[#7f8794]">
              Artist dashboard
            </p>
            <h1 className="mt-4 text-[40px] font-bold leading-[0.95] text-[#2f3138] sm:text-[56px]">
              Uredi svoj profil
            </h1>
            <p className="mt-4 max-w-[720px] text-[19px] leading-[1.45] text-[#4f5762]">
              Ovdje mozes azurirati biografiju, moto, linkove, profilnu fotografiju i portfolio radove.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex h-12 items-center justify-center rounded-full border border-[#182fc7] px-5 text-[15px] font-medium text-[#182fc7] transition hover:bg-[#182fc7] hover:text-white"
              href={`/artists/${artist.slug}`}
            >
              Pogledaj javni profil
            </Link>

            <form action={logoutArtistAction}>
              <button
                className="inline-flex h-12 items-center justify-center rounded-full border border-[#d6deea] px-5 text-[15px] font-medium text-[#4f5762] transition hover:border-[#bcc7d6] hover:bg-white"
                type="submit"
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      </section>

      {feedbackMessage ? (
        <div className="rounded-[20px] border border-[#d9ebdd] bg-[#f4fbf5] px-5 py-4 text-[15px] text-[#265b33]">
          {feedbackMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-[20px] border border-[#f1d2d8] bg-[#fff5f7] px-5 py-4 text-[15px] text-[#9f2842]">
          {errorMessage}
        </div>
      ) : null}

      <section className="grid gap-8 lg:grid-cols-[0.74fr_1.26fr]">
        <div className="space-y-8">
          <section className="rounded-[30px] border border-[#dde4ef] bg-white/95 p-5 shadow-[0_18px_48px_rgba(31,46,86,0.06)]">
            <h2 className="text-[22px] font-semibold text-[#2f3138]">Profilna fotografija</h2>

            {artist.profileImageUrl ? (
              <img
                alt={artist.name}
                className="mt-4 w-full rounded-[24px] border border-[#e1e7ef] object-cover"
                src={artist.profileImageUrl}
              />
            ) : (
              <div className="mt-4 rounded-[24px] border border-[#e1e7ef] bg-[#f8fbff] px-5 py-8 text-[15px] text-[#66707d]">
                Profilna fotografija jos nije dostupna.
              </div>
            )}

            <input
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="hidden"
              onChange={handleProfileImageChange}
              ref={profileImageInputRef}
              type="file"
            />

            <button
              className="mt-5 inline-flex h-11 items-center justify-center rounded-full border border-[#182fc7] px-5 text-[15px] font-medium text-[#182fc7] transition hover:bg-[#182fc7] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isUploadingProfileImage}
              onClick={() => profileImageInputRef.current?.click()}
              type="button"
            >
              {isUploadingProfileImage ? "Upload u toku..." : "Promijeni profilnu sliku"}
            </button>
          </section>

          <section className="rounded-[30px] border border-[#dde4ef] bg-white/95 p-6 shadow-[0_18px_48px_rgba(31,46,86,0.06)]">
            <h2 className="text-[22px] font-semibold text-[#2f3138]">Pregled naloga</h2>
            <div className="mt-5 grid gap-4">
              <InfoCard label="Ime profila" value={artist.name} />
              <InfoCard label="Email naloga" value={sessionEmail} />
              <InfoCard label="Javni slug" value={artist.slug} />
              <InfoCard label="Broj javnih radova" value={String(artist.artworks.length)} />
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section className="rounded-[30px] border border-[#dde4ef] bg-white/95 p-6 shadow-[0_18px_48px_rgba(31,46,86,0.06)]">
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-[22px] font-semibold text-[#2f3138]">Osnovni sadrzaj profila</h2>
                <p className="mt-2 text-[15px] leading-[1.6] text-[#66707d]">
                  Ime profila i disciplina za sada ostaju pod administrativnom kontrolom. Ovdje uredjujes javni tekst i kontakt informacije.
                </p>
              </div>

              <Field label="Kontakt email">
                <input
                  className="h-12 w-full rounded-[16px] border border-[#d8e0ec] bg-[#f8fbff] px-4 text-[15px] text-[#2f3138] outline-none transition focus:border-[#182fc7]"
                  onChange={(event) => setEmail(event.target.value)}
                  value={email}
                />
              </Field>

              <Field label="Moto">
                <textarea
                  className="min-h-[110px] w-full rounded-[16px] border border-[#d8e0ec] bg-[#f8fbff] px-4 py-3 text-[15px] leading-[1.6] text-[#2f3138] outline-none transition focus:border-[#182fc7]"
                  onChange={(event) => setQuote(event.target.value)}
                  value={quote}
                />
              </Field>

              <Field label="Biografija">
                <textarea
                  className="min-h-[220px] w-full rounded-[16px] border border-[#d8e0ec] bg-[#f8fbff] px-4 py-3 text-[15px] leading-[1.7] text-[#2f3138] outline-none transition focus:border-[#182fc7]"
                  onChange={(event) => setBio(event.target.value)}
                  value={bio}
                />
              </Field>

              <Field label="Cover image URL">
                <input
                  className="h-12 w-full rounded-[16px] border border-[#d8e0ec] bg-[#f8fbff] px-4 text-[15px] text-[#2f3138] outline-none transition focus:border-[#182fc7]"
                  onChange={(event) => setCoverImageUrl(event.target.value)}
                  value={coverImageUrl}
                />
              </Field>

              <button
                className="inline-flex h-12 items-center justify-center rounded-full border border-[#182fc7] bg-[#182fc7] px-6 text-[15px] font-medium text-white transition hover:-translate-y-[1px] hover:bg-[#1026b2] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSaving}
                onClick={handleSaveProfile}
                type="button"
              >
                {isSaving ? "Cuvanje..." : "Sacuvaj izmjene"}
              </button>
            </div>
          </section>

          <section className="rounded-[30px] border border-[#dde4ef] bg-white/95 p-6 shadow-[0_18px_48px_rgba(31,46,86,0.06)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-[22px] font-semibold text-[#2f3138]">Drustvene mreze i linkovi</h2>
                <p className="mt-2 text-[15px] leading-[1.6] text-[#66707d]">
                  Dodaj samo linkove koje zelis da budu javno prikazani na profilu.
                </p>
              </div>

              <button
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#d3dbe8] px-4 text-[14px] font-medium text-[#2f3138] transition hover:border-[#182fc7] hover:text-[#182fc7]"
                onClick={() =>
                  setSocialLinks((currentLinks) => [
                    ...currentLinks,
                    {
                      id: `new-${Date.now()}-${currentLinks.length}`,
                      platform: "INSTAGRAM",
                      url: "",
                    },
                  ])
                }
                type="button"
              >
                Dodaj link
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {socialLinks.map((link, index) => (
                <div className="grid gap-3 rounded-[20px] border border-[#e2e8f0] bg-[#f8fbff] p-4 md:grid-cols-[180px_minmax(0,1fr)_auto]" key={link.id}>
                  <select
                    className="h-11 rounded-[14px] border border-[#d8e0ec] bg-white px-3 text-[14px] text-[#2f3138] outline-none transition focus:border-[#182fc7]"
                    onChange={(event) =>
                      setSocialLinks((currentLinks) =>
                        currentLinks.map((currentLink, currentIndex) =>
                          currentIndex === index
                            ? {
                                ...currentLink,
                                platform: event.target.value as SocialPlatform,
                              }
                            : currentLink,
                        ),
                      )
                    }
                    value={link.platform}
                  >
                    {socialPlatformOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <input
                    className="h-11 rounded-[14px] border border-[#d8e0ec] bg-white px-3 text-[14px] text-[#2f3138] outline-none transition focus:border-[#182fc7]"
                    onChange={(event) =>
                      setSocialLinks((currentLinks) =>
                        currentLinks.map((currentLink, currentIndex) =>
                          currentIndex === index
                            ? {
                                ...currentLink,
                                url: event.target.value,
                              }
                            : currentLink,
                        ),
                      )
                    }
                    placeholder="https://..."
                    value={link.url}
                  />

                  <button
                    className="inline-flex h-11 items-center justify-center rounded-full border border-[#f0cbd3] px-4 text-[14px] font-medium text-[#b4132c] transition hover:bg-[#fff3f6]"
                    onClick={() =>
                      setSocialLinks((currentLinks) =>
                        currentLinks.length === 1
                          ? [{ id: `new-${Date.now()}`, platform: "INSTAGRAM", url: "" }]
                          : currentLinks.filter((_, currentIndex) => currentIndex !== index),
                      )
                    }
                    type="button"
                  >
                    Ukloni
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[30px] border border-[#dde4ef] bg-white/95 p-6 shadow-[0_18px_48px_rgba(31,46,86,0.06)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-[22px] font-semibold text-[#2f3138]">Portfolio radovi</h2>
                <p className="mt-2 text-[15px] leading-[1.6] text-[#66707d]">
                  Dodaj nove radove ili ukloni postojece iz javnog portfolija.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <input
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  className="hidden"
                  multiple
                  onChange={handleArtworkUpload}
                  ref={artworkInputRef}
                  type="file"
                />

                <button
                  className="inline-flex h-11 items-center justify-center rounded-full border border-[#182fc7] px-5 text-[14px] font-medium text-[#182fc7] transition hover:bg-[#182fc7] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isUploadingArtworks}
                  onClick={() => artworkInputRef.current?.click()}
                  type="button"
                >
                  {isUploadingArtworks ? "Upload u toku..." : "Dodaj radove"}
                </button>
              </div>
            </div>

            {artist.artworks.length > 0 ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {artist.artworks
                  .slice()
                  .sort((left, right) => left.orderIndex - right.orderIndex)
                  .map((artwork) => (
                    <article
                      className="overflow-hidden rounded-[20px] border border-[#e2e8f0] bg-[#f8fbff]"
                      key={artwork.id}
                    >
                      <img
                        alt={artwork.altText || artwork.title || `${artist.name} artwork`}
                        className="aspect-[0.96/1] w-full object-cover"
                        src={artwork.imageUrl}
                      />

                      <div className="space-y-3 p-4">
                        <div className="min-h-[42px] text-[14px] font-medium leading-[1.45] text-[#2f3138]">
                          {artwork.title || artwork.altText || "Portfolio rad"}
                        </div>

                        <button
                          className="inline-flex h-10 w-full items-center justify-center rounded-full border border-[#f0cbd3] text-[14px] font-medium text-[#b4132c] transition hover:bg-[#fff3f6] disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={deletingArtworkId === artwork.id}
                          onClick={() => handleDeleteArtwork(artwork.id)}
                          type="button"
                        >
                          {deletingArtworkId === artwork.id ? "Brisanje..." : "Ukloni rad"}
                        </button>
                      </div>
                    </article>
                  ))}
              </div>
            ) : (
              <div className="mt-6 rounded-[20px] border border-dashed border-[#d8e0ec] bg-[#f8fbff] px-5 py-8 text-[15px] text-[#66707d]">
                Jos nema radova u portfoliju.
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-2 text-[14px] font-medium text-[#4f5762]">{label}</div>
      {children}
    </label>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-[#e2e8f0] bg-[#f8fbff] px-5 py-4">
      <div className="text-[13px] uppercase tracking-[0.16em] text-[#7f8794]">{label}</div>
      <div className="mt-2 text-[18px] font-medium text-[#2f3138]">{value}</div>
    </div>
  );
}

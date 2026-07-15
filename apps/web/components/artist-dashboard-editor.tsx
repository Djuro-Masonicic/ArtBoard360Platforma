"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { PasswordInput } from "@/components/password-input";
import { useUiFeedback, useUiLoadingState } from "@/components/ui-feedback-provider";
import {
  changeArtistPassword,
  deleteArtistArtwork,
  updateArtistArtwork,
  updateArtistProfile,
  uploadArtistArtwork,
  uploadArtistProfileImage,
} from "@/services/artist-profile";
import type { Artist, Artwork, SocialPlatform } from "@/types/api";

interface ArtistDashboardEditorProps {
  artist: Artist;
  sessionEmail: string;
  mustChangePassword: boolean;
}

interface SocialLinkDraft {
  id: string;
  platform: SocialPlatform;
  url: string;
}

interface ArtworkDraft {
  title: string;
  altText: string;
  description: string;
}

type DashboardSection = "overview" | "profile" | "links" | "artworks" | "security";

const socialPlatformOptions: Array<{ value: SocialPlatform; label: string }> = [
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "BEHANCE", label: "Behance" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "PERSONAL_WEBSITE", label: "Website" },
  { value: "YOUTUBE", label: "YouTube" },
  { value: "X_TWITTER", label: "X / Twitter" },
];

const dashboardSections: Array<{
  id: DashboardSection;
  label: string;
  helper: string;
}> = [
  { id: "overview", label: "Pregled", helper: "Status profila i brzi linkovi" },
  { id: "profile", label: "Profil", helper: "Bio, moto i cover slika" },
  { id: "links", label: "Linkovi", helper: "Drustvene mreze i kontakt" },
  { id: "artworks", label: "Radovi", helper: "Upload, featured i hero" },
  { id: "security", label: "Lozinka", helper: "Promjena lozinke" },
];

export function ArtistDashboardEditor({
  artist: initialArtist,
  mustChangePassword: initialMustChangePassword,
  sessionEmail,
}: ArtistDashboardEditorProps) {
  const { showAlert } = useUiFeedback();
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
  const [artworkDrafts, setArtworkDrafts] = useState<Record<string, ArtworkDraft>>(() =>
    buildArtworkDraftMap(initialArtist.artworks),
  );
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [isChangingPassword, startChangingPassword] = useTransition();
  const [isUploadingProfileImage, setIsUploadingProfileImage] = useState(false);
  const [isUploadingArtworks, setIsUploadingArtworks] = useState(false);
  const [deletingArtworkId, setDeletingArtworkId] = useState<string | null>(null);
  const [updatingArtworkId, setUpdatingArtworkId] = useState<string | null>(null);
  const [savingArtworkId, setSavingArtworkId] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [mustChangePassword, setMustChangePassword] = useState(initialMustChangePassword);
  const [activeSection, setActiveSection] = useState<DashboardSection>("overview");
  const profileImageInputRef = useRef<HTMLInputElement | null>(null);
  const artworkInputRef = useRef<HTMLInputElement | null>(null);

  const hasPendingAction =
    isSaving ||
    isChangingPassword ||
    isUploadingProfileImage ||
    isUploadingArtworks ||
    deletingArtworkId !== null ||
    updatingArtworkId !== null ||
    savingArtworkId !== null;

  useUiLoadingState(hasPendingAction);

  const featuredCount = useMemo(
    () => artist.artworks.filter((artwork) => artwork.isFeatured).length,
    [artist.artworks],
  );

  const backgroundArtwork = useMemo(
    () => artist.artworks.find((artwork) => artwork.isBackground) ?? null,
    [artist.artworks],
  );

  useEffect(() => {
    if (!feedbackMessage) {
      return;
    }

    showAlert({
      kind: "success",
      title: "Uspjesno",
      message: feedbackMessage,
    });
  }, [feedbackMessage, showAlert]);

  useEffect(() => {
    if (!errorMessage) {
      return;
    }

    showAlert({
      kind: "error",
      title: "Greska",
      message: errorMessage,
    });
  }, [errorMessage, showAlert]);

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
    setArtworkDrafts(buildArtworkDraftMap(nextArtist.artworks));
  }

  function clearMessages() {
    setFeedbackMessage(null);
    setErrorMessage(null);
  }

  function handleChangePassword() {
    clearMessages();

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setErrorMessage("Popuni sva polja za promjenu lozinke.");
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage("Nova lozinka mora imati najmanje 8 karaktera.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMessage("Nova lozinka i potvrda lozinke moraju biti iste.");
      return;
    }

    startChangingPassword(async () => {
      try {
        const response = await changeArtistPassword({
          currentPassword,
          newPassword,
        });

        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
        setMustChangePassword(false);
        setFeedbackMessage(response.message);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Lozinka nije mogla biti promijenjena.",
        );
      }
    });
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
      setArtworkDrafts((currentDrafts) => ({
        ...currentDrafts,
        ...buildArtworkDraftMap(uploadedArtworks),
      }));
      setFeedbackMessage(`${uploadedArtworks.length} rad(a) je uspjesno dodato u portfolio.`);
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
      setArtworkDrafts((currentDrafts) => {
        const nextDrafts = { ...currentDrafts };
        delete nextDrafts[artworkId];
        return nextDrafts;
      });
      setFeedbackMessage("Rad je obrisan iz portfolija.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Rad nije mogao biti obrisan.");
    } finally {
      setDeletingArtworkId(null);
    }
  }

  async function handleArtworkFlagChange(
    artworkId: string,
    field: "isFeatured" | "isBackground",
    nextValue: boolean,
  ) {
    clearMessages();
    setUpdatingArtworkId(artworkId);

    try {
      const updatedArtwork = await updateArtistArtwork(artworkId, {
        [field]: nextValue,
      });

      setArtist((currentArtist) => ({
        ...currentArtist,
        artworks: currentArtist.artworks
          .map((artwork) => {
            if (field === "isBackground" && nextValue) {
              return artwork.id === artworkId ? updatedArtwork : { ...artwork, isBackground: false };
            }

            return artwork.id === artworkId ? updatedArtwork : artwork;
          })
          .sort((left, right) => left.orderIndex - right.orderIndex),
      }));

      setFeedbackMessage(
        field === "isFeatured"
          ? nextValue
            ? "Rad je dodat u featured grupu za hover kartice."
            : "Rad je uklonjen iz featured grupe."
          : nextValue
            ? "Rad je postavljen kao background za stranicu umjetnika."
            : "Background oznaka je uklonjena sa rada.",
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Rad nije mogao biti azuriran.");
    } finally {
      setUpdatingArtworkId(null);
    }
  }

  async function handleSaveArtworkDetails(artworkId: string) {
    clearMessages();
    setSavingArtworkId(artworkId);

    try {
      const draft = artworkDrafts[artworkId];
      const updatedArtwork = await updateArtistArtwork(artworkId, {
        title: draft?.title.trim() || undefined,
        altText: draft?.altText.trim() || undefined,
        description: draft?.description.trim() || undefined,
      });

      setArtist((currentArtist) => ({
        ...currentArtist,
        artworks: currentArtist.artworks.map((artwork) =>
          artwork.id === artworkId ? updatedArtwork : artwork,
        ),
      }));
      setArtworkDrafts((currentDrafts) => ({
        ...currentDrafts,
        [artworkId]: {
          title: updatedArtwork.title ?? "",
          altText: updatedArtwork.altText ?? "",
          description: updatedArtwork.description ?? "",
        },
      }));
      setFeedbackMessage("Podaci o radu su sacuvani.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Podaci o radu nijesu mogli biti sacuvani.");
    } finally {
      setSavingArtworkId(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1280px] px-5 pb-20 pt-[15vh] sm:px-8">
      {mustChangePassword ? (
        <PasswordChangeModal
          confirmNewPassword={confirmNewPassword}
          currentPassword={currentPassword}
          isChangingPassword={isChangingPassword}
          newPassword={newPassword}
          onChangePassword={handleChangePassword}
          onConfirmNewPasswordChange={setConfirmNewPassword}
          onCurrentPasswordChange={setCurrentPassword}
          onNewPasswordChange={setNewPassword}
        />
      ) : null}

      <section className="rounded-[18px] border border-[#dbe4f1] bg-white shadow-[0_18px_46px_rgba(31,46,86,0.07)]">
        <div className="grid gap-6 p-5 lg:grid-cols-[1fr_360px] lg:p-7">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase text-[#7f8794]">Artist dashboard</p>
            <h1 className="mt-3 text-[38px] font-bold leading-[1.02] text-[#2f3138] sm:text-[46px]">
              Uredi svoj profil
            </h1>
            <p className="mt-4 max-w-[720px] text-[17px] leading-[1.65] text-[#4f5762]">
              Upravljaj javnim profilom, kontaktima i portfolio radovima. Sve kontrole su ovdje da mozes brzo
              podesiti sta ide na hover kartice, a sta na hero background.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <StatusTile label="Radovi" value={String(artist.artworks.length)} tone="blue" />
              <StatusTile label="Featured" value={String(featuredCount)} tone="red" />
              <StatusTile label="Hero" value={backgroundArtwork ? "1" : "0"} tone="yellow" />
            </div>
          </div>

          <div className="min-w-0 rounded-[14px] border border-[#e4ebf4] bg-[#f8fbff] p-4">
            <div className="flex items-center gap-4">
              <ArtistAvatar artist={artist} size="lg" />
              <div className="min-w-0">
                <div className="truncate text-[22px] font-semibold text-[#2f3138]">{artist.name}</div>
                <div className="mt-1 truncate text-[14px] text-[#6f7784]">@{artist.slug}</div>
              </div>
            </div>

            <div className="mt-5 grid gap-2">
              <Link
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#dc1735] px-5 text-[14px] font-semibold text-white transition hover:bg-[#bd102a]"
                href={`/artists/${artist.slug}`}
              >
                Pogledaj javni profil
              </Link>
              <button
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#cfd8e6] bg-white px-5 text-[14px] font-semibold text-[#182fc7] transition hover:border-[#182fc7]"
                disabled={isUploadingProfileImage}
                onClick={() => profileImageInputRef.current?.click()}
                type="button"
              >
                {isUploadingProfileImage ? "Upload..." : "Promijeni sliku"}
              </button>
              <Link
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#cfd8e6] bg-white px-5 text-[14px] font-semibold text-[#4f5967] transition hover:border-[#182fc7] hover:text-[#182fc7]"
                href="/artist/subscription"
              >
                Upravljaj pretplatom
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-5 lg:sticky lg:top-[14vh] lg:self-start">
          <Panel>
            <p className="text-[12px] font-semibold uppercase text-[#7f8794]">Sekcije</p>
            <nav className="mt-4 space-y-2" aria-label="Artist dashboard sekcije">
              {dashboardSections.map((section) => {
                const isActive = activeSection === section.id;

                return (
                  <button
                    className={`group w-full rounded-[14px] border px-4 py-3 text-left transition ${
                      isActive
                        ? "border-[#182fc7] bg-[#eef2ff] text-[#182fc7]"
                        : "border-[#e2e8f0] bg-[#f8fbff] text-[#4f5967] hover:border-[#c7d2e4] hover:bg-white"
                    }`}
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    type="button"
                  >
                    <span className="block text-[14px] font-bold">{section.label}</span>
                    <span
                      className={`mt-1 block text-[12px] leading-5 ${
                        isActive ? "text-[#182fc7]/70" : "text-[#7d8793]"
                      }`}
                    >
                      {section.helper}
                    </span>
                  </button>
                );
              })}
            </nav>
          </Panel>

          {backgroundArtwork ? (
            <Panel>
              <p className="text-[12px] font-semibold uppercase text-[#7f8794]">Hero background</p>
              <img
                alt={backgroundArtwork.altText || backgroundArtwork.title || `${artist.name} background`}
                className="mt-3 aspect-[1.6/1] w-full rounded-[12px] object-cover"
                src={backgroundArtwork.imageUrl}
              />
              <p className="mt-3 line-clamp-2 text-[14px] font-semibold text-[#2f3138]">
                {backgroundArtwork.title || "Background rad"}
              </p>
            </Panel>
          ) : null}
        </aside>

        <div className="min-w-0 space-y-8">
          {activeSection === "overview" ? (
            <Panel>
              <SectionHeader eyebrow="Pregled" title="Stanje profila" />
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <StatusTile label="Radovi" value={String(artist.artworks.length)} tone="blue" />
                <StatusTile label="Featured" value={String(featuredCount)} tone="red" />
                <StatusTile label="Hero background" value={backgroundArtwork ? "1" : "0"} tone="yellow" />
              </div>

              <div className="mt-7 grid gap-4 xl:grid-cols-2">
                <div className="rounded-[16px] border border-[#e2e8f0] bg-[#f8fbff] p-5">
                  <p className="text-[12px] font-semibold uppercase text-[#7f8794]">Javni profil</p>
                  <h3 className="mt-2 text-[22px] font-semibold text-[#2f3138]">{artist.name}</h3>
                  <p className="mt-3 text-[14px] leading-6 text-[#66707d]">
                    Pregledaj kako profil izgleda posjetiocima ili brzo nastavi na uredjivanje osnovnih podataka.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      className="inline-flex h-10 items-center justify-center rounded-full bg-[#dc1735] px-4 text-[13px] font-semibold text-white transition hover:bg-[#bd102a]"
                      href={`/artists/${artist.slug}`}
                    >
                      Pogledaj profil
                    </Link>
                    <button
                      className="inline-flex h-10 items-center justify-center rounded-full border border-[#d3dbe8] bg-white px-4 text-[13px] font-semibold text-[#2f3138] transition hover:border-[#182fc7] hover:text-[#182fc7]"
                      onClick={() => setActiveSection("profile")}
                      type="button"
                    >
                      Uredi profil
                    </button>
                  </div>
                </div>

                <div className="rounded-[16px] border border-[#e2e8f0] bg-[#f8fbff] p-5">
                  <p className="text-[12px] font-semibold uppercase text-[#7f8794]">Portfolio radovi</p>
                  <h3 className="mt-2 text-[22px] font-semibold text-[#2f3138]">
                    {featuredCount} featured / {backgroundArtwork ? "hero postavljen" : "bez hero rada"}
                  </h3>
                  <p className="mt-3 text-[14px] leading-6 text-[#66707d]">
                    Featured radovi se koriste na karticama, a hero background se prikazuje na javnoj stranici umjetnika.
                  </p>
                  <button
                    className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-[#dc1735] px-4 text-[13px] font-semibold text-white transition hover:bg-[#bd102a]"
                    onClick={() => setActiveSection("artworks")}
                    type="button"
                  >
                    Uredi radove
                  </button>
                </div>
              </div>
            </Panel>
          ) : null}

          {activeSection === "profile" ? (
            <Panel>
            <SectionHeader
              action={
                <button
                  className="inline-flex h-11 items-center justify-center rounded-full bg-[#dc1735] px-5 text-[14px] font-semibold text-white transition hover:bg-[#bd102a] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSaving}
                  onClick={handleSaveProfile}
                  type="button"
                >
                  {isSaving ? "Cuvanje..." : "Sacuvaj profil"}
                </button>
              }
              eyebrow="Javni profil"
              title="Osnovni podaci"
            />

            <div className="mt-6 grid gap-5 xl:grid-cols-2">
              <div className="space-y-5">
                <Field label="Kontakt email">
                  <input className="dashboard-input" onChange={(event) => setEmail(event.target.value)} value={email} />
                </Field>
                <Field label="Moto">
                  <textarea
                    className="dashboard-textarea min-h-[120px]"
                    onChange={(event) => setQuote(event.target.value)}
                    value={quote}
                  />
                </Field>
                <Field label="Cover image URL">
                  <input
                    className="dashboard-input"
                    onChange={(event) => setCoverImageUrl(event.target.value)}
                    value={coverImageUrl}
                  />
                </Field>
              </div>

              <Field label="Biografija">
                <textarea
                  className="dashboard-textarea min-h-[316px]"
                  onChange={(event) => setBio(event.target.value)}
                  value={bio}
                />
              </Field>
            </div>
          </Panel>
          ) : null}

          {activeSection === "links" ? (
          <Panel>
            <SectionHeader
              action={
                <button
                  className="inline-flex h-10 items-center justify-center rounded-full border border-[#d3dbe8] px-4 text-[14px] font-semibold text-[#2f3138] transition hover:border-[#182fc7] hover:text-[#182fc7]"
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
              }
              eyebrow="Linkovi"
              title="Drustvene mreze"
            />

            <div className="mt-5 space-y-3">
              {socialLinks.map((link, index) => (
                <div className="grid gap-3 rounded-[14px] border border-[#e2e8f0] bg-[#f8fbff] p-3 md:grid-cols-[170px_minmax(0,1fr)_88px]" key={link.id}>
                  <select
                    className="dashboard-input"
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
                    className="dashboard-input"
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
                    className="inline-flex h-12 items-center justify-center rounded-full border border-[#f0cbd3] px-4 text-[14px] font-semibold text-[#b4132c] transition hover:bg-[#fff3f6]"
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
          </Panel>
          ) : null}

          {activeSection === "artworks" ? (
          <Panel>
            <SectionHeader
              action={
                <>
                  <input
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    className="hidden"
                    multiple
                    onChange={handleArtworkUpload}
                    ref={artworkInputRef}
                    type="file"
                  />
                  <button
                    className="inline-flex h-11 items-center justify-center rounded-full border border-[#dc1735] px-5 text-[14px] font-semibold text-[#dc1735] transition hover:bg-[#dc1735] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isUploadingArtworks}
                    onClick={() => artworkInputRef.current?.click()}
                    type="button"
                  >
                    {isUploadingArtworks ? "Upload..." : "Dodaj radove"}
                  </button>
                </>
              }
              eyebrow="Portfolio"
              title="Radovi"
            />

            <div className="mt-5 flex flex-wrap gap-2">
              <SmallStatus tone="blue">Featured: {featuredCount}</SmallStatus>
              <SmallStatus tone="red">Hero: {backgroundArtwork ? "postavljen" : "nije postavljen"}</SmallStatus>
            </div>

            {artist.artworks.length > 0 ? (
              <div className="mt-6 space-y-4">
                {artist.artworks
                  .slice()
                  .sort((left, right) => left.orderIndex - right.orderIndex)
                  .map((artwork) => {
                    const draft = artworkDrafts[artwork.id] ?? {
                      title: "",
                      altText: "",
                      description: "",
                    };

                    return (
                      <ArtworkRow
                        artistName={artist.name}
                        artwork={artwork}
                        deletingArtworkId={deletingArtworkId}
                        draft={draft}
                        key={artwork.id}
                        onDeleteArtwork={handleDeleteArtwork}
                        onDraftChange={(nextDraft) =>
                          setArtworkDrafts((currentDrafts) => ({
                            ...currentDrafts,
                            [artwork.id]: nextDraft,
                          }))
                        }
                        onFlagChange={handleArtworkFlagChange}
                        onSaveArtworkDetails={handleSaveArtworkDetails}
                        savingArtworkId={savingArtworkId}
                        updatingArtworkId={updatingArtworkId}
                      />
                    );
                  })}
              </div>
            ) : (
              <div className="mt-6 rounded-[14px] border border-dashed border-[#d8e0ec] bg-[#f8fbff] px-5 py-8 text-[15px] text-[#66707d]">
                Jos nema radova u portfoliju.
              </div>
            )}
          </Panel>
          ) : null}

          {activeSection === "security" ? (
          <Panel>
            <SectionHeader eyebrow="Sigurnost" title="Promjena lozinke" />
            <div className="mt-6 grid gap-5 xl:grid-cols-3">
              <Field label="Trenutna lozinka">
                <PasswordInput
                  autoComplete="current-password"
                  className="dashboard-input"
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  value={currentPassword}
                />
              </Field>
              <Field label="Nova lozinka">
                <PasswordInput
                  autoComplete="new-password"
                  className="dashboard-input"
                  onChange={(event) => setNewPassword(event.target.value)}
                  value={newPassword}
                />
              </Field>
              <Field label="Potvrdi novu lozinku">
                <PasswordInput
                  autoComplete="new-password"
                  className="dashboard-input"
                  onChange={(event) => setConfirmNewPassword(event.target.value)}
                  value={confirmNewPassword}
                />
              </Field>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#dc1735] px-5 text-[14px] font-semibold text-white transition hover:bg-[#bd102a] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isChangingPassword}
                onClick={handleChangePassword}
                type="button"
              >
                {isChangingPassword ? "Promjena..." : "Promijeni lozinku"}
              </button>
            </div>
          </Panel>
          ) : null}
        </div>
      </div>

      <input
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={handleProfileImageChange}
        ref={profileImageInputRef}
        type="file"
      />
    </main>
  );
}

function PasswordChangeModal({
  confirmNewPassword,
  currentPassword,
  isChangingPassword,
  newPassword,
  onChangePassword,
  onConfirmNewPasswordChange,
  onCurrentPasswordChange,
  onNewPasswordChange,
}: {
  confirmNewPassword: string;
  currentPassword: string;
  isChangingPassword: boolean;
  newPassword: string;
  onChangePassword: () => void;
  onConfirmNewPasswordChange: (value: string) => void;
  onCurrentPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#0f172a]/60 px-5 py-10 backdrop-blur-[6px]">
      <div className="w-full max-w-[560px] rounded-[18px] border border-white/40 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.28)] sm:p-8">
        <p className="text-[12px] font-semibold uppercase text-[#dc1735]">Prva prijava</p>
        <h2 className="mt-3 text-[32px] font-bold leading-[1.08] text-[#2f3138]">
          Promijeni privremenu lozinku
        </h2>
        <p className="mt-3 text-[15px] leading-[1.65] text-[#5a6471]">
          Prije uredjivanja profila potrebno je da postavis svoju novu lozinku.
        </p>

        <div className="mt-6 space-y-4">
          <Field label="Trenutna privremena lozinka">
            <PasswordInput
              autoComplete="current-password"
              className="dashboard-input"
              onChange={(event) => onCurrentPasswordChange(event.target.value)}
              value={currentPassword}
            />
          </Field>
          <Field label="Nova lozinka">
            <PasswordInput
              autoComplete="new-password"
              className="dashboard-input"
              onChange={(event) => onNewPasswordChange(event.target.value)}
              value={newPassword}
            />
          </Field>
          <Field label="Potvrdi novu lozinku">
            <PasswordInput
              autoComplete="new-password"
              className="dashboard-input"
              onChange={(event) => onConfirmNewPasswordChange(event.target.value)}
              value={confirmNewPassword}
            />
          </Field>
        </div>

        <button
          className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-full bg-[#dc1735] px-5 text-[14px] font-semibold text-white transition hover:bg-[#bd102a] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isChangingPassword}
          onClick={onChangePassword}
          type="button"
        >
          {isChangingPassword ? "Promjena..." : "Sacuvaj novu lozinku"}
        </button>
      </div>
    </div>
  );
}

function ArtworkRow({
  artistName,
  artwork,
  deletingArtworkId,
  draft,
  onDeleteArtwork,
  onDraftChange,
  onFlagChange,
  onSaveArtworkDetails,
  savingArtworkId,
  updatingArtworkId,
}: {
  artistName: string;
  artwork: Artwork;
  deletingArtworkId: string | null;
  draft: ArtworkDraft;
  onDeleteArtwork: (artworkId: string) => void;
  onDraftChange: (draft: ArtworkDraft) => void;
  onFlagChange: (artworkId: string, field: "isFeatured" | "isBackground", nextValue: boolean) => void;
  onSaveArtworkDetails: (artworkId: string) => void;
  savingArtworkId: string | null;
  updatingArtworkId: string | null;
}) {
  return (
    <article className="overflow-hidden rounded-[16px] border border-[#dfe7f2] bg-white shadow-[0_10px_28px_rgba(31,46,86,0.05)]">
      <div className="grid gap-0 xl:grid-cols-[220px_minmax(0,1fr)]">
        <div className="relative bg-[#edf2f8]">
          <img
            alt={artwork.altText || artwork.title || `${artistName} artwork`}
            className="aspect-[1.35/1] h-full w-full object-cover xl:aspect-auto"
            src={artwork.imageUrl}
          />
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            {artwork.isFeatured ? <SmallStatus tone="blue">Featured</SmallStatus> : null}
            {artwork.isBackground ? <SmallStatus tone="red">Hero</SmallStatus> : null}
          </div>
        </div>

        <div className="min-w-0 p-4">
          <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Naziv rada">
                  <input
                    className="dashboard-input"
                    onChange={(event) => onDraftChange({ ...draft, title: event.target.value })}
                    placeholder="Naziv rada"
                    value={draft.title}
                  />
                </Field>
                <Field label="Alt tekst">
                  <input
                    className="dashboard-input"
                    onChange={(event) => onDraftChange({ ...draft, altText: event.target.value })}
                    placeholder="Kratak opis slike"
                    value={draft.altText}
                  />
                </Field>
              </div>

              <Field label="Opis rada">
                <textarea
                  className="dashboard-textarea min-h-[92px]"
                  onChange={(event) => onDraftChange({ ...draft, description: event.target.value })}
                  placeholder="Dodaj kratak opis ili kontekst rada."
                  value={draft.description}
                />
              </Field>
            </div>

            <div className="min-w-0 space-y-3">
              <ModeToggle
                active={artwork.isFeatured}
                disabled={updatingArtworkId === artwork.id}
                label="Hover kartica"
                tone="blue"
                onClick={() => onFlagChange(artwork.id, "isFeatured", !artwork.isFeatured)}
              />
              <ModeToggle
                active={artwork.isBackground}
                disabled={updatingArtworkId === artwork.id}
                label="Hero background"
                tone="red"
                onClick={() => onFlagChange(artwork.id, "isBackground", !artwork.isBackground)}
              />

              <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-1">
                <button
                  className="inline-flex h-10 items-center justify-center rounded-full bg-[#dc1735] px-4 text-[13px] font-semibold text-white transition hover:bg-[#bd102a] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={savingArtworkId === artwork.id}
                  onClick={() => onSaveArtworkDetails(artwork.id)}
                  type="button"
                >
                  {savingArtworkId === artwork.id ? "Cuvanje..." : "Sacuvaj"}
                </button>
                <button
                  className="inline-flex h-10 items-center justify-center rounded-full border border-[#f0cbd3] px-4 text-[13px] font-semibold text-[#b4132c] transition hover:bg-[#fff3f6] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={deletingArtworkId === artwork.id || updatingArtworkId === artwork.id}
                  onClick={() => onDeleteArtwork(artwork.id)}
                  type="button"
                >
                  {deletingArtworkId === artwork.id ? "Brisanje..." : "Ukloni"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function ModeToggle({
  active,
  disabled,
  label,
  onClick,
  tone,
}: {
  active: boolean;
  disabled: boolean;
  label: string;
  onClick: () => void;
  tone: "blue" | "red";
}) {
  const activeClassName =
    tone === "blue"
      ? "border-[#182fc7] bg-[#eef2ff] text-[#182fc7]"
      : "border-[#dc1735] bg-[#fff1f4] text-[#dc1735]";

  return (
    <button
      aria-pressed={active}
      className={`flex h-11 w-full min-w-0 items-center justify-between gap-3 rounded-full border px-3 text-left text-[13px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
        active ? activeClassName : "border-[#d7e0ec] bg-[#f8fbff] text-[#566170]"
      }`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <span className="truncate">{label}</span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full border transition ${
          active ? "border-current bg-current" : "border-[#cfd8e6] bg-white"
        }`}
      >
        <span
          className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow transition ${
            active ? "left-[22px]" : "left-[3px]"
          }`}
        />
      </span>
    </button>
  );
}

function buildArtworkDraftMap(artworks: Artwork[]) {
  return artworks.reduce<Record<string, ArtworkDraft>>((drafts, artwork) => {
    drafts[artwork.id] = {
      title: artwork.title ?? "",
      altText: artwork.altText ?? "",
      description: artwork.description ?? "",
    };
    return drafts;
  }, {});
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-[18px] border border-[#dbe4f1] bg-white p-5 shadow-[0_14px_34px_rgba(31,46,86,0.06)] sm:p-6">
      {children}
    </section>
  );
}

function SectionHeader({
  action,
  eyebrow,
  title,
}: {
  action?: React.ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-[12px] font-semibold uppercase text-[#7f8794]">{eyebrow}</p>
        <h2 className="mt-2 text-[26px] font-semibold leading-[1.1] text-[#2f3138]">{title}</h2>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <div className="mb-2 text-[14px] font-medium text-[#4f5762]">{label}</div>
      {children}
    </label>
  );
}

function ArtistAvatar({ artist, size }: { artist: Artist; size: "lg" | "xl" }) {
  const sizeClassName = size === "xl" ? "h-[152px] w-[152px]" : "h-[72px] w-[72px]";

  return (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e9eef6] ${sizeClassName}`}>
      {artist.profileImageUrl ? (
        <img alt={artist.name} className="h-full w-full object-cover" src={artist.profileImageUrl} />
      ) : (
        <span className="text-[28px] font-semibold text-[#7d8793]">{artist.name.slice(0, 1)}</span>
      )}
    </div>
  );
}

function StatusTile({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "blue" | "red" | "yellow";
  value: string;
}) {
  const toneClassName =
    tone === "blue"
      ? "border-[#d9e2ff] bg-[#f4f7ff] text-[#182fc7]"
      : tone === "red"
        ? "border-[#ffe1e6] bg-[#fff5f7] text-[#dc1735]"
        : "border-[#ffe8ad] bg-[#fff9e7] text-[#a06f00]";

  return (
    <div className={`rounded-[14px] border p-4 ${toneClassName}`}>
      <div className="text-[12px] font-semibold uppercase text-[#7d8793]">{label}</div>
      <div className="mt-2 text-[30px] font-bold leading-none">{value}</div>
    </div>
  );
}

function SmallStatus({ children, tone }: { children: React.ReactNode; tone: "blue" | "red" }) {
  const toneClassName =
    tone === "blue" ? "bg-[#eef2ff] text-[#182fc7]" : "bg-[#fff1f4] text-[#dc1735]";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-[12px] font-semibold ${toneClassName}`}>
      {children}
    </span>
  );
}

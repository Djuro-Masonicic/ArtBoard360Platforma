"use client";

import {
  Camera,
  Check,
  Circle,
  CreditCard,
  FileText,
  ImageIcon,
  LayoutGrid,
  Link2,
  LockKeyhole,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
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
import { deleteCurrentArtistPortfolioDraft } from "@/services/portfolio-projects";
import type { Artist, Artwork, PortfolioProject, SocialPlatform } from "@/types/api";

interface ArtistDashboardEditorProps {
  artist: Artist;
  portfolioProjects: PortfolioProject[];
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

type DashboardSection = "overview" | "profile" | "links" | "artworks" | "portfolio" | "security";

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
  icon: LucideIcon;
}> = [
  { id: "overview", label: "Pregled", helper: "Status profila i brzi linkovi", icon: LayoutGrid },
  { id: "profile", label: "Profil", helper: "Bio, moto i cover slika", icon: UserRound },
  { id: "links", label: "Linkovi", helper: "Društvene mreže i kontakt", icon: Link2 },
  { id: "artworks", label: "Radovi", helper: "Upload, featured i hero", icon: ImageIcon },
  { id: "portfolio", label: "Portfolio", helper: "Draftovi i PDF istorija", icon: FileText },
  { id: "security", label: "Lozinka", helper: "Promjena lozinke", icon: LockKeyhole },
];

export function ArtistDashboardEditor({
  artist: initialArtist,
  mustChangePassword: initialMustChangePassword,
  portfolioProjects: initialPortfolioProjects,
  sessionEmail,
}: ArtistDashboardEditorProps) {
  const router = useRouter();
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
  const [portfolioProjects, setPortfolioProjects] = useState(initialPortfolioProjects);
  const [deletingPortfolioId, setDeletingPortfolioId] = useState<string | null>(null);
  const profileImageInputRef = useRef<HTMLInputElement | null>(null);
  const artworkInputRef = useRef<HTMLInputElement | null>(null);

  const hasPendingAction =
    isSaving ||
    isChangingPassword ||
    isUploadingProfileImage ||
    isUploadingArtworks ||
    deletingArtworkId !== null ||
    updatingArtworkId !== null ||
    savingArtworkId !== null ||
    deletingPortfolioId !== null;

  useUiLoadingState(hasPendingAction);

  const featuredCount = useMemo(
    () => artist.artworks.filter((artwork) => artwork.isFeatured).length,
    [artist.artworks],
  );

  const backgroundArtwork = useMemo(
    () => artist.artworks.find((artwork) => artwork.isBackground) ?? null,
    [artist.artworks],
  );

  const draftPortfolioProjects = useMemo(
    () => portfolioProjects.filter((project) => project.status === "DRAFT"),
    [portfolioProjects],
  );

  const finishedPortfolioProjects = useMemo(
    () => portfolioProjects.filter((project) => project.status !== "DRAFT"),
    [portfolioProjects],
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

  async function handleDeletePortfolioDraft(projectId: string) {
    const shouldDelete = window.confirm("Da li zelis da obrises ovaj portfolio draft?");

    if (!shouldDelete) {
      return;
    }

    clearMessages();
    setDeletingPortfolioId(projectId);

    try {
      await deleteCurrentArtistPortfolioDraft(projectId);
      setPortfolioProjects((currentProjects) =>
        currentProjects.filter((project) => project.id !== projectId),
      );
      setFeedbackMessage("Portfolio draft je obrisan.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Portfolio draft nije mogao biti obrisan.");
    } finally {
      setDeletingPortfolioId(null);
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
    <main className="-mx-5 -my-8 min-h-screen bg-[#f7f7f9] px-5 pb-20 pt-[112px] sm:-mx-8 sm:px-8 lg:pt-[122px]">
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

      <section className="hidden">
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
              <button
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#dc1735] px-5 text-[14px] font-semibold text-white transition hover:bg-[#bd102a]"
                onClick={() => router.push(`/artists/${artist.slug}`)}
                type="button"
              >
                Pogledaj javni profil
              </button>
              <button
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#cfd8e6] bg-white px-5 text-[14px] font-semibold text-[#182fc7] transition hover:border-[#182fc7]"
                disabled={isUploadingProfileImage}
                onClick={() => profileImageInputRef.current?.click()}
                type="button"
              >
                {isUploadingProfileImage ? "Upload..." : "Promijeni sliku"}
              </button>
              <button
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#cfd8e6] bg-white px-5 text-[14px] font-semibold text-[#4f5967] transition hover:border-[#182fc7] hover:text-[#182fc7]"
                onClick={() => router.push("/artist/subscription")}
                type="button"
              >
                Upravljaj pretplatom
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-[1320px] gap-7 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-4 lg:sticky lg:top-[96px] lg:self-start">
          <div className="px-1 pb-2">
            <div className="flex items-center gap-2.5 text-[12px] font-extrabold uppercase tracking-[0.14em] text-[#3b4050]">
              <span className="h-[9px] w-[9px] rounded-full bg-gradient-to-br from-[#1a7cff] via-[#ff2d55] to-[#ffd028]" />
              Tvoj profil
            </div>
            <div className="mt-4 flex items-start gap-4 lg:block">
              <ArtistAvatar artist={artist} size="dashboard" />
              <div className="min-w-0 lg:mt-3">
                <button
                  className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase text-[#3b4050] transition hover:text-[#1a7cff]"
                  disabled={isUploadingProfileImage}
                  onClick={() => profileImageInputRef.current?.click()}
                  type="button"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-[#1a7cff] to-[#b642a0] text-white">
                    <Camera aria-hidden="true" size={14} />
                  </span>
                  {isUploadingProfileImage ? "Upload..." : "Promijeni sliku"}
                </button>
                <h2 className="mt-3 truncate text-[23px] font-extrabold leading-tight text-[#111318]">{artist.name}</h2>
                <p className="mt-1 truncate text-[13px] font-semibold text-[#6b7184]">@{artist.slug}</p>
              </div>
            </div>
          </div>

          <div>
            <nav className="space-y-1" aria-label="Artist dashboard sekcije">
              {dashboardSections.map((section) => {
                const isActive = activeSection === section.id;
                const Icon = section.icon;

                return (
                  <button
                    className={`group flex w-full items-center gap-3.5 rounded-[16px] px-3 py-2.5 text-left transition ${
                      isActive
                        ? "bg-white shadow-[0_10px_26px_rgba(17,19,24,0.07)]"
                        : "hover:bg-white/70"
                    }`}
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    type="button"
                  >
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${isActive ? "bg-[#111318] text-white" : "bg-white text-[#3b4050] shadow-[0_4px_14px_rgba(17,19,24,0.07)]"}`}>
                      <Icon aria-hidden="true" size={19} strokeWidth={2} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[14px] font-extrabold text-[#111318]">{section.label}</span>
                      <span className="mt-0.5 block truncate text-[12px] font-medium text-[#6b7184]">{section.helper}</span>
                    </span>
                  </button>
                );
              })}
              <button
                className="group flex w-full items-center gap-3.5 rounded-[16px] px-3 py-2.5 text-left transition hover:bg-white/70"
                onClick={() => router.push("/artist/subscription")}
                type="button"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[#3b4050] shadow-[0_4px_14px_rgba(17,19,24,0.07)]">
                  <CreditCard aria-hidden="true" size={19} strokeWidth={2} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-extrabold text-[#111318]">Pretplata</span>
                  <span className="mt-0.5 block text-[12px] font-medium text-[#6b7184]">Plan i plaćanja</span>
                </span>
              </button>
            </nav>
          </div>

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

        <div className="min-w-0 space-y-6">
          {activeSection === "overview" ? (
            <Panel>
              <SectionHeader eyebrow="Artist dashboard" title="Uredi svoj profil" />
              <p className="mt-4 max-w-[680px] text-[15px] font-medium leading-[1.6] text-[#4a5061]">
                Upravljaj javnim profilom, kontaktima i radovima. Ovdje biraš šta ide na hover kartice, a šta na hero pozadinu.
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <StatusTile label="Radovi" value={String(artist.artworks.length)} tone="blue" />
                <StatusTile label="Featured" value={String(featuredCount)} tone="red" />
                <StatusTile label="Hero pozadina" value={backgroundArtwork ? "1" : "0"} tone="yellow" />
              </div>

              <ProfileReadiness
                hasBackground={Boolean(backgroundArtwork)}
                hasBio={Boolean(artist.bio?.trim())}
                hasFeatured={featuredCount > 0}
                hasLinks={artist.socialLinks.some((link) => Boolean(link.url))}
                hasProfileImage={Boolean(artist.profileImageUrl || artist.profileThumbnailUrl)}
              />

              <div className="mt-7 grid gap-4 xl:grid-cols-2">
                <div className="rounded-[16px] border border-[#e2e8f0] bg-[#f8fbff] p-5">
                  <p className="text-[12px] font-semibold uppercase text-[#7f8794]">Javni profil</p>
                  <h3 className="mt-2 text-[22px] font-semibold text-[#2f3138]">{artist.name}</h3>
                  <p className="mt-3 text-[14px] leading-6 text-[#66707d]">
                    Pregledaj kako profil izgleda posjetiocima ili brzo nastavi na uredjivanje osnovnih podataka.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      className="inline-flex h-10 items-center justify-center rounded-full bg-[#dc1735] px-4 text-[13px] font-semibold text-white transition hover:bg-[#bd102a]"
                      onClick={() => router.push(`/artists/${artist.slug}`)}
                      type="button"
                    >
                      Pogledaj profil
                    </button>
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
                    {featuredCount} featured · {backgroundArtwork ? "hero postavljen" : "bez hero rada"}
                  </h3>
                  <p className="mt-3 text-[14px] leading-6 text-[#66707d]">
                    Izdvojeni radovi se koriste na hover karticama, a hero rad kao pozadina javne stranice.
                  </p>
                  <button
                    className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-[#dc1735] px-4 text-[13px] font-semibold text-white transition hover:bg-[#bd102a]"
                    onClick={() => setActiveSection("artworks")}
                    type="button"
                  >
                    Uredi radove
                  </button>
                  <button
                    className="mt-5 ml-3 inline-flex h-10 items-center justify-center rounded-full px-4 text-[13px] font-extrabold uppercase text-[#434958]"
                    onClick={() => router.push("/portfolio-builder")}
                    type="button"
                  >
                    Portfolio Builder →
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
            <div className="mt-5 flex justify-end">
              <button
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#111318] px-6 text-[13px] font-extrabold uppercase text-white transition hover:bg-[#2c313f] disabled:opacity-60"
                disabled={isSaving}
                onClick={handleSaveProfile}
                type="button"
              >
                {isSaving ? "Čuvanje..." : "Sačuvaj linkove"}
              </button>
            </div>
          </Panel>
          ) : null}

          {activeSection === "artworks" ? (
          <section>
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
                    className="inline-flex h-11 items-center justify-center rounded-full border-2 border-[#111318] px-5 text-[13px] font-extrabold uppercase text-[#111318] transition hover:bg-[#111318] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isUploadingArtworks}
                    onClick={() => artworkInputRef.current?.click()}
                    type="button"
                  >
                    {isUploadingArtworks ? "Upload..." : "+ Dodaj radove"}
                  </button>
                </>
              }
              eyebrow="Portfolio"
              title="Radovi"
            />

            <p className="mt-2 max-w-[760px] text-[16px] leading-7 text-[#596274]">
              Dodaj naziv, alt tekst i opis. Uključi hover karticu za izdvojene radove i izaberi jedan rad za hero pozadinu.
            </p>

            <div className="mt-6 flex min-h-14 flex-wrap items-center gap-3 rounded-[18px] border border-[#dde3ed] bg-white px-5 py-3">
              <span className="text-[14px] font-extrabold text-[#111318]">{artist.artworks.length} radova</span>
              <span className="hidden h-6 w-px bg-[#dce2eb] sm:block" />
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
          </section>
          ) : null}

          {activeSection === "portfolio" ? (
            <section>
              <SectionHeader
                action={
                  <button
                    className="inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-r from-[#5264d8] to-[#dc2863] px-7 text-[13px] font-extrabold uppercase text-white transition hover:brightness-105"
                    onClick={() => router.push("/portfolio-builder")}
                    type="button"
                  >
                    Novi portfolio
                  </button>
                }
                eyebrow="Portfolio builder"
                title="Draftovi i istorija"
              />

              <p className="mt-2 text-[16px] leading-7 text-[#596274]">
                Nastavi započete portfolije ili otvori ranije generisane PDF-ove.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <PortfolioStat label="Ukupno" value={String(portfolioProjects.length)} tone="blue" />
                <PortfolioStat label="Draftovi" value={String(draftPortfolioProjects.length)} tone="red" />
                <PortfolioStat label="Generisani" value={String(finishedPortfolioProjects.length)} tone="yellow" />
              </div>

              <div className="mt-7 grid gap-6 xl:grid-cols-2">
                <PortfolioProjectList
                  deletingPortfolioId={deletingPortfolioId}
                  emptyMessage="Još nemaš sačuvanih draftova. Kreiraj novi portfolio i sačuvaj draft da bi se pojavio ovdje."
                  onDeleteDraft={handleDeletePortfolioDraft}
                  projects={draftPortfolioProjects}
                  title="Sačuvani draftovi"
                />
                <PortfolioProjectList
                  deletingPortfolioId={deletingPortfolioId}
                  emptyMessage="Generisani i plaćeni portfoliji će se pojaviti ovdje kada završiš prvi PDF."
                  onDeleteDraft={handleDeletePortfolioDraft}
                  projects={finishedPortfolioProjects}
                  title="Istorija portfolija"
                />
              </div>
            </section>
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
    <article className="overflow-hidden rounded-[20px] bg-white shadow-[0_14px_34px_rgba(31,46,86,0.07)]">
      <div className="grid gap-0 xl:grid-cols-[250px_minmax(0,1fr)]">
        <div className="relative bg-[#edf2f8]">
          <img
            alt={artwork.altText || artwork.title || `${artistName} artwork`}
            className="aspect-[1.35/1] h-full min-h-[260px] w-full object-cover xl:aspect-auto xl:min-h-[330px]"
            src={artwork.imageUrl}
          />
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            {artwork.isFeatured ? <SmallStatus tone="blue">Featured</SmallStatus> : null}
            {artwork.isBackground ? <SmallStatus tone="red">Hero</SmallStatus> : null}
          </div>
        </div>

        <div className="min-w-0 p-5 sm:p-6">
          <div className="min-w-0 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
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
            <div className="grid gap-3 sm:grid-cols-2">
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
                label="Hero pozadina"
                tone="red"
                onClick={() => onFlagChange(artwork.id, "isBackground", !artwork.isBackground)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex h-10 min-w-[118px] items-center justify-center rounded-full border-2 border-[#111318] bg-white px-5 text-[12px] font-extrabold uppercase text-[#111318] transition hover:bg-[#111318] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={savingArtworkId === artwork.id}
                onClick={() => onSaveArtworkDetails(artwork.id)}
                type="button"
              >
                {savingArtworkId === artwork.id ? "Čuvanje..." : "Sačuvaj"}
              </button>
              <button
                className="inline-flex h-10 min-w-[100px] items-center justify-center rounded-full border border-[#f2bdc7] px-5 text-[12px] font-extrabold uppercase text-[#cf1734] transition hover:bg-[#fff3f6] disabled:cursor-not-allowed disabled:opacity-60"
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

function PortfolioProjectList({
  deletingPortfolioId,
  emptyMessage,
  onDeleteDraft,
  projects,
  title,
}: {
  deletingPortfolioId: string | null;
  emptyMessage: string;
  onDeleteDraft: (projectId: string) => void;
  projects: PortfolioProject[];
  title: string;
}) {
  return (
    <section className="min-w-0 rounded-[22px] bg-white p-5 shadow-[0_14px_34px_rgba(31,46,86,0.07)] sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[18px] font-extrabold text-[#111318]">{title}</h3>
        <span className="flex h-8 min-w-8 items-center justify-center rounded-full border border-[#dce3ed] bg-white px-2 text-[12px] font-bold text-[#596274]">
          {projects.length}
        </span>
      </div>

      {projects.length > 0 ? (
        <div className="mt-4 space-y-3">
          {projects.map((project) => (
            <PortfolioProjectCard
              deletingPortfolioId={deletingPortfolioId}
              key={project.id}
              onDeleteDraft={onDeleteDraft}
              project={project}
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-[14px] border border-dashed border-[#d5dfec] bg-white px-4 py-7 text-[14px] leading-6 text-[#687382]">
          {emptyMessage}
        </div>
      )}
    </section>
  );
}

function PortfolioProjectCard({
  deletingPortfolioId,
  onDeleteDraft,
  project,
}: {
  deletingPortfolioId: string | null;
  onDeleteDraft: (projectId: string) => void;
  project: PortfolioProject;
}) {
  const router = useRouter();
  const selectedArtworkCount = project.artworks.filter((artwork) => artwork.isSelected).length;
  const canDeleteDraft = project.status === "DRAFT";
  const previewImageUrl =
    project.collectionCoverUrl ??
    project.coverImageUrl ??
    project.artworks.find((artwork) => artwork.isSelected)?.imageUrl ??
    project.artworks[0]?.imageUrl ??
    project.profileImageUrl;

  return (
    <article className="flex gap-4 rounded-[16px] border border-[#dce3ed] bg-white p-4">
      <div className="relative h-[86px] w-[62px] shrink-0 rounded-[6px] bg-white p-[6px] shadow-[0_4px_12px_rgba(31,46,86,0.12)]">
        {previewImageUrl ? (
          <img alt="" className="h-full w-full rounded-[2px] object-cover" src={previewImageUrl} />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-[2px] bg-[#edf2f8] text-[18px] font-bold text-[#7b8593]">
            {project.artistName.slice(0, 1)}
          </div>
        )}
        <span className="absolute bottom-[7px] left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-full bg-[#111318]" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[#dce3ed] bg-white px-2.5 py-1 text-[10px] font-extrabold uppercase text-[#596274]">
            {portfolioStatusLabel(project.status)}
          </span>
          <span className="rounded-full border border-[#dc2863] bg-white px-2.5 py-1 text-[10px] font-extrabold uppercase text-[#111318]">
            {project.status === "DRAFT" ? portfolioPaymentLabel(project.paymentStatus) : "Generisan PDF"}
          </span>
        </div>

        <h4 className="mt-2 line-clamp-2 text-[15px] font-extrabold leading-tight text-[#111318]">
          {project.title || `${project.artistName} portfolio`}
        </h4>
        <p className="mt-1 text-[12px] leading-5 text-[#727c90]">
          {selectedArtworkCount} radova · {project.template.replaceAll("_", " ").toLowerCase()} ·{" "}
          {formatPortfolioDate(project.updatedAt)}
        </p>

        <div className="mt-2 flex flex-wrap gap-2">
          <button
            className="inline-flex h-8 items-center justify-center rounded-full border-2 border-[#111318] bg-white px-3 text-[11px] font-extrabold uppercase text-[#111318] transition hover:bg-[#111318] hover:text-white"
            onClick={() => router.push(`/portfolio-builder/${project.id}`)}
            type="button"
          >
            {project.status === "DRAFT" ? "Nastavi" : "Otvori"}
          </button>

        <button
          className="inline-flex h-8 items-center justify-center rounded-full border border-[#dce3ed] bg-white px-3 text-[11px] font-extrabold uppercase text-[#596274] transition hover:border-[#182fc7] hover:text-[#182fc7]"
          onClick={() =>
            project.latestPdfUrl
              ? window.open(project.latestPdfUrl, "_blank", "noopener,noreferrer")
              : router.push(`/portfolio-builder/${project.id}/preview`)
          }
          type="button"
        >
          {project.latestPdfUrl ? "Preuzmi PDF" : "Pregled"}
        </button>

        {canDeleteDraft ? (
          <button
            className="inline-flex h-8 items-center justify-center px-2 text-[11px] font-extrabold uppercase text-[#cf1734] transition hover:text-[#a60f28] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={deletingPortfolioId === project.id}
            onClick={() => onDeleteDraft(project.id)}
            type="button"
          >
            {deletingPortfolioId === project.id ? "Brisanje..." : "Obriši"}
          </button>
        ) : null}
        </div>
      </div>
    </article>
  );
}

function portfolioStatusLabel(status: PortfolioProject["status"]) {
  const labels: Record<PortfolioProject["status"], string> = {
    DRAFT: "Draft",
    GENERATED: "Generisan",
    PAID: "Placen",
    READY: "Spreman",
  };

  return labels[status] ?? status;
}

function portfolioPaymentLabel(status: PortfolioProject["paymentStatus"]) {
  const labels: Record<PortfolioProject["paymentStatus"], string> = {
    FAILED: "Neuspjelo",
    NOT_REQUIRED: "Premium",
    PAID: "Placeno",
    PENDING: "Na cekanju",
    REFUNDED: "Refundirano",
    REQUIRED: "Potrebno placanje",
  };

  return labels[status] ?? status;
}

function formatPortfolioDate(value: string) {
  return new Intl.DateTimeFormat("sr-Latn-ME", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
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
    <section className="rounded-[20px] bg-white p-5 shadow-[0_14px_34px_rgba(17,19,24,0.06)] sm:p-7">
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

function ArtistAvatar({ artist, size }: { artist: Artist; size: "dashboard" | "lg" | "xl" }) {
  const sizeClassName =
    size === "xl"
      ? "h-[152px] w-[152px]"
      : size === "dashboard"
        ? "h-[84px] w-[84px]"
        : "h-[72px] w-[72px]";

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

function ProfileReadiness({
  hasBackground,
  hasBio,
  hasFeatured,
  hasLinks,
  hasProfileImage,
}: {
  hasBackground: boolean;
  hasBio: boolean;
  hasFeatured: boolean;
  hasLinks: boolean;
  hasProfileImage: boolean;
}) {
  const checks = [
    { complete: hasProfileImage, label: "Profilna" },
    { complete: hasBio, label: "Biografija" },
    { complete: hasLinks, label: "Linkovi" },
    { complete: hasFeatured, label: "Featured rad" },
    { complete: hasBackground, label: "Hero rad" },
  ];
  const completed = checks.filter((item) => item.complete).length;

  return (
    <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[18px] border border-[#e3e5eb] px-5 py-4">
      <strong className="text-[13px] text-[#111318]">Spremnost profila</strong>
      <span className="border-r border-[#dde0e7] pr-4 text-[13px] font-extrabold text-[#6b7184]">{completed}/5</span>
      {checks.map((item) => (
        <span className={`inline-flex items-center gap-1.5 text-[12px] font-bold ${item.complete ? "text-[#343948]" : "text-[#9ba1b0]"}`} key={item.label}>
          {item.complete ? <Check aria-hidden="true" className="text-[#16944b]" size={15} /> : <Circle aria-hidden="true" size={14} />}
          {item.label}
        </span>
      ))}
    </div>
  );
}

function PortfolioStat({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "blue" | "red" | "yellow";
  value: string;
}) {
  const dotClassName =
    tone === "blue" ? "bg-[#1a7cff]" : tone === "red" ? "bg-[#ff2d55]" : "bg-[#ffb51b]";

  return (
    <div className="rounded-[20px] bg-white px-6 py-5 shadow-[0_14px_34px_rgba(31,46,86,0.07)]">
      <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#6b7184]">
        <span className={`h-2 w-2 rounded-full ${dotClassName}`} />
        {label}
      </div>
      <div className="mt-4 text-[38px] font-extrabold leading-none text-[#111318]">{value}</div>
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
  const dotClassName =
    tone === "blue" ? "bg-[#1a7cff]" : tone === "red" ? "bg-[#ff2d55]" : "bg-[#ffc526]";

  return (
    <div className="rounded-[20px] bg-[#f8f8fa] p-5">
      <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#6b7184]">
        <span className={`h-2 w-2 rounded-full ${dotClassName}`} />
        {label}
      </div>
      <div className="mt-4 text-[38px] font-extrabold leading-none text-[#111318]">{value}</div>
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

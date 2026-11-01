"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ContactRound,
  Download,
  Eye,
  ImageIcon,
  Moon,
  QrCode,
  RotateCw,
  Sun,
  UserRound,
} from "lucide-react";
import {
  cardTemplates,
  hasNativeBleed,
  usesCover,
  supportsBranded,
  renderCard,
  type CardConfig,
  type CardRenderModel,
} from "@artboard/qr-card-renderer";
import { ArtBoardLogo } from "./artboard-logo";
import { useAccountTheme } from "@/lib/use-account-theme";
import { qrRequest } from "@/services/qr-cards";
import type { QrCardState, QrVersion } from "@/lib/qr-cards";
import s from "./qr-card-editor.module.css";

const steps = ["Podaci", "Šablon", "Pregled", "Preuzmi"],
  titles = [
    "Podaci za vizit kartu",
    "Izaberi šablon",
    "Pregled",
    "Preuzmi vizit kartu",
  ],
  icons = [UserRound, ImageIcon, ContactRound, Download];
const descriptions = [
  "Ime i kontakt povlačimo sa tvog ArtBoard profila. Izaberi šta ide na karticu.",
  "Izaberi izgled i prilagodi svoju vizit kartu.",
  "Provjeri prednju i zadnju stranu prije preuzimanja.",
  "PDF za štampu, PNG za dijeljenje i link tvog profila.",
];
const contactLabels = {
  email: "Email",
  phone: "Telefon",
  instagram: "Instagram",
  behance: "Behance",
};
const isNoCover = (id: CardConfig["templateId"]) =>
  id === "no-cover" || id === "portrait";
// Group the two existing render configurations without rewriting saved drafts.
const templateChoices = cardTemplates
  .filter((t) => t.id !== "portrait")
  .map((t) => (t.id === "no-cover" ? { ...t, label: "No Cover" } : t));
function Card({
  model,
  side,
  bleed = false,
}: {
  model: CardRenderModel;
  side: "front" | "back";
  bleed?: boolean;
}) {
  return (
    <div
      className={s.cardArt}
      style={bleed ? { aspectRatio: "91 / 61" } : undefined}
      role="img"
      aria-label={
        side === "front"
          ? "Prednja strana vizit karte"
          : "Zadnja strana vizit karte"
      }
      dangerouslySetInnerHTML={{
        __html: renderCard(
          model,
          side,
          bleed ? { mode: "bleed", guides: true } : undefined,
        ),
      }}
    />
  );
}
export function QrCardEditor({ initial }: { initial: QrCardState }) {
  const [data, setData] = useState(initial),
    [config, setConfig] = useState(initial.draft.config),
    [saved, setSaved] = useState(JSON.stringify(initial.draft.config)),
    [revision, setRevision] = useState(initial.draft.revision),
    [savedAt, setSavedAt] = useState(initial.draft.savedAt);
  const [noCoverChoice, setNoCoverChoice] = useState<CardConfig["templateId"]>(
    isNoCover(initial.draft.config.templateId)
      ? initial.draft.config.templateId
      : "no-cover",
  );
  const [step, setStep] = useState(0),
    [back, setBack] = useState(false),
    [bleed, setBleed] = useState(false),
    [busy, setBusy] = useState<
      "save" | "export" | "download" | "history" | null
    >(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const {
      theme,
      changeTheme,
      error: themeError,
    } = useAccountTheme(initial.theme),
    operation = useRef<{ content: string; key: string } | null>(null),
    urls = useRef(new Set<string>()),
    alive = useRef(true);
  const dirty = JSON.stringify(config) !== saved,
    template = cardTemplates.find((t) => t.id === config.templateId)!,
    noCover = isNoCover(config.templateId),
    selectedChoice = noCover ? "no-cover" : config.templateId,
    right = data.entitlement;
  const model = useMemo<CardRenderModel>(
    () => ({
      config,
      profileUrl: data.profileUrl,
      avatar: data.artist.avatar,
      cover: data.choices.find((i) => i.id === config.imageId)?.url,
      qrSvg: data.qrSvg,
    }),
    [config, data],
  );
  const checks = [
      Boolean(config.name.trim()),
      config.selectedContacts.length > 0 &&
        config.selectedContacts.every((k) =>
          Boolean(config.contacts[k].trim()),
        ),
      data.publicAvailable,
    ],
    ready = checks.every(Boolean);
  useEffect(() => {
    alive.current = true;

    return () => {
      alive.current = false;
      for (const u of urls.current) URL.revokeObjectURL(u);
      urls.current.clear();
    };
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function edit<K extends keyof CardConfig>(key: K, value: CardConfig[K]) {
    if (key === "templateId" && isNoCover(value as CardConfig["templateId"]))
      setNoCoverChoice(value as CardConfig["templateId"]);
    setConfig((c) => ({
      ...c,
      [key]: value,
      ...(key === "templateId" &&
      !supportsBranded(value as CardConfig["templateId"])
        ? { variant: "standard" as const }
        : {}),
    }));
    setError("");
    setNotice("");
  }
  function navigate(n: number) {
    setStep(n);
    setError("");
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }
  async function refresh(page = data.history.page) {
    const next = await qrRequest<QrCardState>(`?page=${page}`);
    if (alive.current) setData(next);
    return next;
  }
  async function save() {
    if (busy) return;
    setBusy("save");
    setError("");
    try {
      const result = await qrRequest<QrCardState["draft"]>("/draft", "PUT", {
        config,
        revision,
      });
      setRevision(result.revision);
      setSaved(JSON.stringify(config));
      setSavedAt(result.savedAt);
      setNotice("Draft je sačuvan.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  async function fileDownload(id: string, format = "bundle") {
    const response = await fetch(
      `/api/artist/qr-cards/exports/${id}/download/${format}`,
      { cache: "no-store" },
    );
    if (!response.ok)
      throw new Error("Fajl nije preuzet. Pokušaj ponovo iz istorije.");
    const blob = await response.blob(),
      url = URL.createObjectURL(blob);
    urls.current.add(url);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      /filename="([^"]+)"/.exec(
        response.headers.get("content-disposition") || "",
      )?.[1] || "ArtBoard-vizit-karta.zip";
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => {
      if (urls.current.delete(url)) URL.revokeObjectURL(url);
    }, 30000);
  }
  async function generate() {
    if (busy || !ready || !right.available || !data.storageAvailable) return;
    setBusy("export");
    setError("");
    setNotice("");
    const content = JSON.stringify(config);
    if (operation.current?.content !== content)
      operation.current = { content, key: crypto.randomUUID() };
    try {
      let row = await qrRequest<QrVersion>("/exports", "POST", {
        config,
        operationKey: operation.current.key,
      });
      for (let n = 0; row.status === "PROCESSING" && n < 125; n++) {
        await new Promise((r) => setTimeout(r, 1000));
        if (!alive.current) return;
        row = await qrRequest<QrVersion>(`/exports/${row.id}`);
      }
      if (row.status !== "READY")
        throw new Error(
          row.status === "FAILED"
            ? "Kartica nije generisana. Pokušaj ponovo."
            : "Priprema još traje. Provjeri istoriju prije ponovnog zahtjeva.",
        );
      await refresh(1);
      setNotice("Kartica je generisana. ZIP sadrži PDF i obje PNG slike.");
      operation.current = null;
      setBusy("download");
      await fileDownload(row.id);
      await refresh(1);
    } catch (e) {
      setError((e as Error).message);
      await refresh(1).catch(() => {});
    } finally {
      if (alive.current) setBusy(null);
    }
  }
  async function redownload(id: string, format = "bundle") {
    if (busy) return;
    setBusy("download");
    setError("");
    try {
      await fileDownload(id, format);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  async function copy() {
    try {
      if (navigator.clipboard && window.isSecureContext)
        await navigator.clipboard.writeText(data.profileUrl);
      else {
        const field = document.createElement("textarea");
        field.value = data.profileUrl;
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.append(field);
        field.select();
        const ok = document.execCommand("copy");
        field.remove();
        if (!ok) throw Error();
      }
      setNotice("Link je kopiran.");
    } catch {
      setError(`Kopiraj adresu: ${data.profileUrl}`);
    }
  }
  const nav = (
    <>
      {step > 0 ? (
        <button
          type="button"
          className={s.textButton}
          onClick={() => navigate(step - 1)}
        >
          ← {steps[step - 1]}
        </button>
      ) : null}
      {step < 3 ? (
        <button
          type="button"
          className={s.primary}
          onClick={() => navigate(step + 1)}
        >
          Dalje: {steps[step + 1]} →
        </button>
      ) : null}
    </>
  );
  const exportLabel =
    busy === "export"
      ? "Pripremamo…"
      : busy === "download"
        ? "Preuzimamo…"
        : error && right.available
          ? "Pokušaj ponovo"
          : "Preuzmi PDF i PNG";
  const exportButton = (
    <button
      type="button"
      className={s.primary}
      disabled={
        Boolean(busy) ||
        !ready ||
        !right.available ||
        right.processing ||
        !data.storageAvailable
      }
      onClick={() => void generate()}
    >
      {busy === "export" ? (
        <span className={s.spinner} />
      ) : (
        <Download size={16} />
      )}{" "}
      {exportLabel}
    </button>
  );
  const cardSettings = (
    <div className={`${s.settings} ${noCover ? s.noCoverSettings : ""}`}>
      {!noCover ? (
        <label>
          Boja kartice
          <select
            value={config.cardColor}
            onChange={(e) =>
              edit("cardColor", e.target.value as CardConfig["cardColor"])
            }
          >
            <option value="light">Svijetla</option>
            <option value="dark">Tamna</option>
          </select>
        </label>
      ) : null}
      <label>
        Jezik
        <select
          value={config.language}
          onChange={(e) =>
            edit("language", e.target.value as CardConfig["language"])
          }
        >
          <option value="ME">Crnogorski</option>
          <option value="EN">English</option>
        </select>
      </label>
      <label>
        Naslov poleđine
        <select
          value={config.backTitle}
          onChange={(e) =>
            edit("backTitle", e.target.value as CardConfig["backTitle"])
          }
        >
          <option value="profile">ArtBoard profil</option>
          <option value="portfolio">Portfolio</option>
        </select>
      </label>
    </div>
  );

  return (
    <div className={s.root} data-theme={theme}>
      <header className={s.toolbar}>
        <div className={s.toolbarRow}>
          <a href="/artboard" aria-label="ArtBoard">
            <ArtBoardLogo tone={theme === "dark" ? "light" : "dark"} />
          </a>
          <span className={s.divider} />
          <strong>QR vizit karta</strong>
          <a
            className={s.backLink}
            aria-label="Nazad na nalog"
            href="/artist/dashboard"
            onClick={(e) => {
              if (
                dirty &&
                !window.confirm(
                  "Draft nije sačuvan. Želiš li da napustiš stranicu?",
                )
              )
                e.preventDefault();
            }}
          >
            <ArrowLeft size={15} />
            <span>Nazad na nalog</span>
          </a>
          <div className={s.theme} role="group" aria-label="Tema prikaza">
            <button
              type="button"
              aria-label="Svijetla tema"
              aria-pressed={theme === "light"}
              onClick={() => changeTheme("light")}
            >
              <Sun size={15} />
            </button>
            <button
              type="button"
              aria-label="Tamna tema"
              aria-pressed={theme === "dark"}
              onClick={() => changeTheme("dark")}
            >
              <Moon size={15} />
            </button>
          </div>
        </div>
        <div className={s.gradient} />
      </header>
      <div className={s.layout}>
        <aside className={s.sidebar}>
          <div className={s.identity}>
            <div className={s.identityRow}>
              {data.artist.avatar ? (
                <img
                  className={s.avatar}
                  src={data.artist.avatar}
                  alt="Profilna fotografija"
                />
              ) : (
                <span className={s.avatar}>
                  <UserRound size={30} />
                </span>
              )}
              <strong>{data.artist.name}</strong>
            </div>
            <span className={s.badge}>
              {right.premium ? <Check size={12} /> : null}
              {right.premium ? "Premium nalog" : "Free nalog"}
            </span>
          </div>
          <nav className={s.steps} aria-label="Koraci vizit karte">
            {steps.map((label, i) => {
              const Icon = icons[i]!;
              return (
                <button
                  type="button"
                  key={label}
                  aria-current={step === i ? "step" : undefined}
                  onClick={() => navigate(i)}
                >
                  <span className={s.stepIcon}>
                    <Icon size={19} />
                  </span>
                  <strong>
                    <small>{String(i + 1).padStart(2, "0")}</small> {label}
                  </strong>
                </button>
              );
            })}
          </nav>
          <div className={s.stats}>
            <div>
              <strong>85×55</strong>
              <small>mm, format kartice</small>
            </div>
            <div>
              <strong>
                {config.selectedContacts.length}
                <span>/3</span>
              </strong>
              <small>Kontakta na poleđini</small>
            </div>
          </div>
          <div className={s.sideNav}>{nav}</div>
        </aside>
        <main className={s.main}>
          <div className={s.heading}>
            <small>Korak {step + 1} od 4</small>
            <h1>{titles[step]}</h1>
            <p>{descriptions[step]}</p>
          </div>
          {error || themeError ? (
            <div className={s.error} role="alert">
              {error || themeError}
            </div>
          ) : null}
          {notice ? (
            <div className={s.notice} role="status">
              {notice}
            </div>
          ) : null}
          {!data.publicAvailable ? (
            <div className={s.error}>
              Profil još nije javno dostupan. Draft možeš urediti i sačuvati;
              izvoz čeka objavljivanje profila.
            </div>
          ) : null}
          {!data.storageAvailable ? (
            <div className={s.error}>
              Izvoz trenutno nije dostupan. Draft i istorija ostaju sačuvani.
            </div>
          ) : null}
          {step === 0 ? (
            <>
              <section className={`${s.panel} ${s.namePanel}`}>
                <h2>Ime</h2>
                <label>
                  Ime i prezime na kartici
                  <input
                    value={config.name}
                    maxLength={80}
                    required
                    onChange={(e) => edit("name", e.target.value)}
                  />
                </label>
              </section>
              <section className={s.panel}>
                <div>
                  <h2>Kontakt na poleđini</h2>
                  <p>
                    Podaci su preuzeti iz profila. Na poleđinu stanu najviše tri
                    kontakta.
                  </p>
                </div>
                <div className={s.contacts}>
                  {(
                    Object.keys(contactLabels) as Array<
                      keyof typeof contactLabels
                    >
                  ).map((key) => {
                    const selected = config.selectedContacts.includes(key);
                    return (
                      <div className={s.contact} key={key}>
                        <label>
                          {contactLabels[key]}
                          <input
                            type={
                              key === "email"
                                ? "email"
                                : key === "phone"
                                  ? "tel"
                                  : "url"
                            }
                            maxLength={
                              key === "email" ? 254 : key === "phone" ? 40 : 200
                            }
                            value={config.contacts[key]}
                            placeholder={
                              key === "email"
                                ? "ime@example.com"
                                : key === "phone"
                                  ? "+382…"
                                  : "https://"
                            }
                            onChange={(e) =>
                              edit("contacts", {
                                ...config.contacts,
                                [key]: e.target.value,
                              })
                            }
                          />
                        </label>
                        <button
                          className={s.toggle}
                          type="button"
                          role="switch"
                          aria-checked={selected}
                          aria-label={`${contactLabels[key]} na kartici`}
                          disabled={
                            !selected && config.selectedContacts.length >= 3
                          }
                          onClick={() =>
                            edit(
                              "selectedContacts",
                              selected
                                ? config.selectedContacts.filter(
                                    (k) => k !== key,
                                  )
                                : [...config.selectedContacts, key],
                            )
                          }
                        >
                          <span>{selected ? <Check size={12} /> : null}</span>Na
                          kartici
                        </button>
                      </div>
                    );
                  })}
                </div>
                <p className={s.helper}>
                  {config.selectedContacts.length}/3 kontakta uključeno.
                  Isključi jedan da uključiš drugi.
                </p>
              </section>
              <section className={s.panel}>
                <div>
                  <h2>Slike sa profila</h2>
                  <p>Izaberi sliku za prednju stranu kartice.</p>
                </div>
                <div className={s.photoRow}>
                  <div>
                    <small>Profilna fotografija</small>
                    {data.artist.avatar ? (
                      <img
                        className={s.profilePhoto}
                        src={data.artist.avatar}
                        alt="Profilna fotografija sa profila"
                      />
                    ) : (
                      <span className={s.profilePhoto}>
                        <UserRound />
                      </span>
                    )}
                  </div>
                  <div
                    className={s.imageChoices}
                    role="group"
                    aria-label="Naslovna slika kartice"
                  >
                    {data.choices.map((image) => (
                      <button
                        type="button"
                        key={image.id}
                        aria-pressed={config.imageId === image.id}
                        disabled={!usesCover(config.templateId)}
                        onClick={() => edit("imageId", image.id)}
                      >
                        <img src={image.url} alt="" />
                        <span>{image.title}</span>
                        {config.imageId === image.id ? (
                          <Check size={13} />
                        ) : null}
                      </button>
                    ))}
                    {!data.choices.length ? (
                      <p>
                        Nema dostupnih slika. Dodaj radove na profilu ili
                        koristi šablon Clean.
                      </p>
                    ) : null}
                  </div>
                </div>
                {!usesCover(config.templateId) ? (
                  <p className={s.helper}>
                    {template.label} ne koristi naslovnu sliku. Izbor ostaje
                    sačuvan za ostale šablone.
                  </p>
                ) : null}
              </section>
              <section className={s.panel}>
                <h2>QR kod</h2>
                <div className={s.qrInfo}>
                  <div
                    className={s.qr}
                    dangerouslySetInnerHTML={{ __html: data.qrSvg }}
                  />
                  <div>
                    <p>QR automatski vodi na tvoj javni ArtBoard profil.</p>
                    <a
                      href={data.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {data.profileUrl}
                    </a>
                    <a className={s.inlineLink} href="/artist/dashboard">
                      Upravljaj profilom →
                    </a>
                    <p className={s.helper}>
                      Adresu određuje slug profila. Za promjenu sluga obrati se
                      ArtBoard podršci.
                    </p>
                  </div>
                </div>
              </section>
            </>
          ) : null}
          {step === 1 ? (
            <>
              <div
                className={s.templateGrid}
                role="group"
                aria-label="Šablon vizit karte"
              >
                {templateChoices.map((t) => (
                  <button
                    type="button"
                    className={s.template}
                    key={t.id}
                    aria-label={t.label}
                    aria-pressed={selectedChoice === t.id}
                    onClick={() =>
                      edit(
                        "templateId",
                        t.id === "no-cover" ? noCoverChoice : t.id,
                      )
                    }
                  >
                    <Card
                      model={{
                        ...model,
                        config: {
                          ...config,
                          templateId:
                            t.id === "no-cover" ? noCoverChoice : t.id,
                        },
                      }}
                      side="front"
                    />
                    <span>
                      <strong>{t.label}</strong>
                      <span className={s.radio}>
                        {selectedChoice === t.id ? <span /> : null}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
              <section className={s.panel}>
                <h2>{noCover ? "Varijanta i boja" : "Podešavanja kartice"}</h2>
                {template.provisional ? (
                  <p className={s.helper}>
                    Privremeni dizajni šablona. Precizni vizuali biće dodati
                    naknadno.
                  </p>
                ) : null}
                {noCover ? (
                  <>
                    <div className={s.variantAndColor}>
                      <fieldset>
                        <legend>
                          Varijanta šablona <em>No Cover</em>
                        </legend>
                        <div className={s.segment}>
                          {(
                            [
                              ["no-cover", "Clean"],
                              ["portrait", "Profilna"],
                            ] as const
                          ).map(([id, label]) => (
                            <button
                              type="button"
                              key={id}
                              aria-pressed={config.templateId === id}
                              onClick={() => edit("templateId", id)}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </fieldset>
                      <fieldset>
                        <legend>Boja kartice</legend>
                        <div className={s.segment}>
                          {(
                            [
                              ["light", "Svijetla"],
                              ["dark", "Tamna"],
                            ] as const
                          ).map(([id, label]) => (
                            <button
                              type="button"
                              key={id}
                              aria-pressed={config.cardColor === id}
                              onClick={() => edit("cardColor", id)}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </fieldset>
                    </div>
                    <p>
                      Svijetla varijanta je preporuka za štampu, a tamna za
                      digitalno dijeljenje.
                    </p>
                  </>
                ) : supportsBranded(config.templateId) ? (
                  <fieldset>
                    <legend>Varijanta</legend>
                    <div className={s.segment}>
                      {(
                        [
                          ["standard", "Standard"],
                          ["branded", "ArtBoard"],
                        ] as const
                      ).map(([id, label]) => (
                        <button
                          type="button"
                          key={id}
                          aria-pressed={config.variant === id}
                          onClick={() => edit("variant", id)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                ) : (
                  <p className={s.helper}>
                    {template.label} ima jednu varijantu prema referenci, bez
                    Branded ukrasa.
                  </p>
                )}
                {!noCover ? cardSettings : null}
              </section>
              {noCover ? (
                <section className={s.panel}>
                  <h2>Jezik i naslov poleđine</h2>
                  {cardSettings}
                </section>
              ) : null}
            </>
          ) : null}
          {step === 2 ? (
            <>
              <section className={s.panel}>
                <div className={s.previewTools}>
                  <div
                    className={s.segment}
                    role="group"
                    aria-label="Strana kartice"
                  >
                    <button
                      type="button"
                      aria-pressed={!back}
                      onClick={() => setBack(false)}
                    >
                      Prednja strana
                    </button>
                    <button
                      type="button"
                      aria-pressed={back}
                      onClick={() => setBack(true)}
                    >
                      Zadnja strana
                    </button>
                  </div>
                  <button
                    type="button"
                    className={s.outline}
                    aria-pressed={bleed}
                    onClick={() => setBleed((v) => !v)}
                  >
                    {bleed ? <Check size={14} /> : null}Bleed i linija reza
                  </button>
                  <button
                    type="button"
                    className={s.outline}
                    onClick={() => setBack((v) => !v)}
                  >
                    <RotateCw size={14} />
                    Okreni karticu
                  </button>
                </div>
                <div
                  className={s.stage}
                  data-bleed={bleed}
                  data-native-bleed={hasNativeBleed(config.templateId)}
                >
                  <div
                    className={s.flip}
                    data-back={back}
                    style={
                      hasNativeBleed(config.templateId) && bleed
                        ? { aspectRatio: "91 / 61" }
                        : undefined
                    }
                  >
                    <div className={s.front}>
                      <Card
                        model={model}
                        side="front"
                        bleed={hasNativeBleed(config.templateId) && bleed}
                      />
                    </div>
                    <div className={s.reverse}>
                      <Card
                        model={model}
                        side="back"
                        bleed={hasNativeBleed(config.templateId) && bleed}
                      />
                    </div>
                  </div>
                </div>
              </section>
              <div className={s.infoGrid}>
                <section className={s.panel}>
                  <h2>Format kartice</h2>
                  <strong>85 × 55 mm</strong>
                  <p>Prednja i zadnja strana.</p>
                </section>
                <section className={s.panel}>
                  <h2>Bleed za štampu</h2>
                  <strong>3 mm sa svake strane</strong>
                  <p>PDF: 91 × 61 mm, sa linijama reza.</p>
                </section>
                <section className={s.panel}>
                  <h2>QR link</h2>
                  <a
                    href={data.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {data.profileUrl}
                  </a>
                </section>
              </div>
            </>
          ) : null}
          {step === 3 ? (
            <>
              <div className={s.readiness}>
                <strong>
                  Spremno za karticu {checks.filter(Boolean).length}/3
                </strong>
                <span>
                  {checks.map((ok, i) => (
                    <span key={i} data-ok={ok}>
                      {ok ? "✓" : "○"} {["Ime", "Kontakt", "QR link"][i]}
                    </span>
                  ))}
                </span>
              </div>
              <section className={s.panel} aria-busy={busy === "export"}>
                <div className={s.statusTitle}>
                  <span className={s.badge}>
                    {right.premium
                      ? "Premium članstvo"
                      : right.state === "FORMER_PREMIUM"
                        ? "Premium je istekao"
                        : "Free nalog"}
                  </span>
                  <h2>
                    {right.premium
                      ? "Tvoja vizit karta, kad god poželiš."
                      : right.state === "FREE_AVAILABLE"
                        ? "Jedna besplatna vizit karta."
                        : "Prethodne verzije ostaju tvoje."}
                  </h2>
                  <p>
                    {right.premium
                      ? "Neograničene nove QR verzije i ponovno preuzimanje."
                      : right.state === "FREE_AVAILABLE"
                        ? "Besplatno pravo se koristi tek poslije uspješnog generisanja."
                        : "Za novu verziju aktiviraj Premium. Ponovno preuzimanje je besplatno."}
                  </p>
                </div>
                <div className={s.fileTiles}>
                  <div>
                    <Download />
                    <span>
                      <strong>PDF za štampu</strong>
                      <small>91 × 61 mm · prednja i zadnja</small>
                    </span>
                  </div>
                  <div>
                    <ImageIcon />
                    <span>
                      <strong>PNG za dijeljenje</strong>
                      <small>2 slike · 1004 × 650 px · 300 dpi</small>
                    </span>
                  </div>
                </div>
                {right.available ? (
                  exportButton
                ) : (
                  <a className={s.primary} href="/placanje?proizvod=premium">
                    {right.state === "FORMER_PREMIUM"
                      ? "Obnovi Premium"
                      : "Premium od 8,90 € / mj"}{" "}
                    →
                  </a>
                )}
                {busy === "export" ? (
                  <p role="status">
                    <span className={s.spinner} /> Pripremamo tvoju vizit
                    karticu… PDF i PNG se preuzimaju zajedno kad budu spremni.
                  </p>
                ) : null}
                {right.processing && busy !== "export" ? (
                  <p>
                    Prethodna kartica se priprema.{" "}
                    <button
                      type="button"
                      className={s.textButton}
                      onClick={() =>
                        void refresh().catch((e) => setError(e.message))
                      }
                    >
                      Osvježi status
                    </button>
                  </p>
                ) : null}
                <p className={s.helper}>
                  Jedan ZIP paket sadrži PDF za štampu i obje PNG strane. Ranije
                  verzije dostupne su bez nove naplate.
                </p>
              </section>
              <section className={s.panel}>
                <div className={s.sectionTitle}>
                  <h2>Istorija preuzimanja</h2>
                  <small>{data.history.total} verzija</small>
                </div>
                {!data.history.items.length ? (
                  <p>Još nema generisanih vizit karti.</p>
                ) : (
                  data.history.items.map((v) => (
                    <div className={s.historyRow} key={v.id}>
                      <div>
                        <strong>
                          Verzija {v.versionNumber} ·{" "}
                          {
                            cardTemplates.find(
                              (t) => t.id === v.config.templateId,
                            )?.label
                          }
                        </strong>
                        <small>
                          {new Date(v.createdAt).toLocaleDateString(
                            "sr-Latn-ME",
                            { timeZone: "Europe/Podgorica" },
                          )}{" "}
                          ·{" "}
                          {v.status === "READY"
                            ? `${v.downloadCount} preuzimanja`
                            : v.status === "FAILED"
                              ? "Nije generisana · pravo nije potrošeno"
                              : "Priprema se"}
                        </small>
                      </div>
                      {v.status === "READY" ? (
                        <div className={s.historyActions}>
                          <button
                            type="button"
                            className={s.outline}
                            disabled={Boolean(busy)}
                            onClick={() => void redownload(v.id)}
                          >
                            Preuzmi ponovo · besplatno
                          </button>
                          <span>
                            {(["pdf", "front", "back"] as const).map(
                              (format, i) => (
                                <button
                                  key={format}
                                  type="button"
                                  disabled={Boolean(busy)}
                                  className={s.textButton}
                                  onClick={() => void redownload(v.id, format)}
                                >
                                  {["PDF", "PNG prednja", "PNG zadnja"][i]}
                                </button>
                              ),
                            )}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
                {data.history.totalPages > 1 ? (
                  <div className={s.pagination}>
                    <button
                      type="button"
                      className={s.outline}
                      disabled={Boolean(busy) || data.history.page === 1}
                      onClick={() =>
                        void refresh(data.history.page - 1).catch((e) =>
                          setError(e.message),
                        )
                      }
                    >
                      Prethodna
                    </button>
                    <span>
                      {data.history.page}/{data.history.totalPages}
                    </span>
                    <button
                      type="button"
                      className={s.outline}
                      disabled={
                        Boolean(busy) ||
                        data.history.page === data.history.totalPages
                      }
                      onClick={() =>
                        void refresh(data.history.page + 1).catch((e) =>
                          setError(e.message),
                        )
                      }
                    >
                      Sljedeća
                    </button>
                  </div>
                ) : null}
              </section>
              <section className={s.panel}>
                <h2>Link tvog profila</h2>
                <p>Podijeli svoj rad sa galerijama, kupcima i saradnicima.</p>
                <button
                  type="button"
                  className={s.outline}
                  onClick={() => void copy()}
                >
                  Kopiraj link
                </button>
              </section>
            </>
          ) : null}
          <div className={s.mobileNav}>{nav}</div>
        </main>
        <aside className={s.live} aria-label="Pregled uživo">
          <div className={s.liveHead}>
            <strong>
              <span />
              Pregled uživo
            </strong>
            <p>
              {template.label} ·{" "}
              {config.cardColor === "light" ? "Svijetla" : "Tamna"} · 85 × 55 mm
            </p>
          </div>
          <div className={s.liveBody}>
            <small>Prednja strana</small>
            <Card model={model} side="front" />
            <small>Zadnja strana</small>
            <Card model={model} side="back" />
          </div>
          <div className={s.liveActions}>
            <div>
              <button
                type="button"
                className={s.outline}
                disabled={Boolean(busy) || !config.name.trim()}
                onClick={() => void save()}
              >
                {busy === "save" ? "Čuvamo…" : "Sačuvaj draft"}
              </button>
              {step === 3 ? (
                exportButton
              ) : (
                <button
                  type="button"
                  className={s.primary}
                  onClick={() => navigate(3)}
                >
                  <Eye size={14} />
                  Preuzmi karticu
                </button>
              )}
            </div>
            <small role="status">
              {dirty
                ? "Draft: nesačuvane izmjene"
                : savedAt
                  ? `Draft: sačuvano ${new Date(savedAt).toLocaleString("sr-Latn-ME", { timeZone: "Europe/Podgorica", dateStyle: "short", timeStyle: "short" })}`
                  : "Draft još nije sačuvan"}
            </small>
          </div>
        </aside>
      </div>
    </div>
  );
}

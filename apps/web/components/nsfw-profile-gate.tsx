"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";

import styles from "./nsfw-profile-gate.module.css";

type NsfwProfileGateProps = {
  artistName: string;
  children: ReactNode;
  previewImageUrls: string[];
  slug: string;
};

const STORAGE_PREFIX = "artboard:nsfw-profile-access:";

export function NsfwProfileGate({
  artistName,
  children,
  previewImageUrls,
  slug,
}: NsfwProfileGateProps) {
  const [isAllowed, setIsAllowed] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const checkboxRef = useRef<HTMLInputElement>(null);
  const storageKey = `${STORAGE_PREFIX}${slug}`;

  useEffect(() => {
    try {
      setIsAllowed(window.sessionStorage.getItem(storageKey) === "confirmed");
    } catch {
      setIsAllowed(false);
    }
  }, [storageKey]);

  useEffect(() => {
    if (isAllowed) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    checkboxRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isAllowed]);

  function enterProfile() {
    if (!isConfirmed) {
      checkboxRef.current?.focus();
      return;
    }

    try {
      window.sessionStorage.setItem(storageKey, "confirmed");
    } catch {
      // Access still works when storage is unavailable; it just will not persist.
    }

    setIsAllowed(true);
  }

  if (isAllowed) {
    return children;
  }

  const previewImages = previewImageUrls.slice(0, 3);
  const backdropImage = previewImages[0]
    ? { backgroundImage: `url("${previewImages[0]}")` }
    : undefined;

  return (
    <div className={styles.overlay}>
      <div aria-hidden="true" className={styles.backdropImage} style={backdropImage} />
      <div aria-hidden="true" className={styles.backdropShade} />

      <div className={styles.centeringLayer}>
        <div className={styles.dialogBorder}>
          <div
            aria-describedby={descriptionId}
            aria-labelledby={titleId}
            aria-modal="true"
            className={styles.dialog}
            role="dialog"
          >
            <div className={styles.topRow}>
              <img
                alt="ArtBoard"
                className={styles.logo}
                src="/artboard-logo/ArtBoard-Horizontal-Gradient-Mark-Black-Text.svg"
              />
              <Link aria-label="Zatvori i vrati se na umjetnike" className={styles.closeButton} href="/umjetnici">
                <X aria-hidden="true" size={19} strokeWidth={1.8} />
              </Link>
            </div>

            <div
              aria-label={`Cenzurisani radovi umjetnika ${artistName}`}
              className={styles.preview}
              role="img"
            >
              {previewImages.length > 0 ? (
                previewImages.map((imageUrl, index) => (
                  <span className={styles.previewCard} data-position={index} key={`${imageUrl}-${index}`}>
                    <img alt="" src={imageUrl} />
                  </span>
                ))
              ) : (
                <span className={styles.previewFallback}>18+</span>
              )}
            </div>

            <div className={styles.copy}>
              <span className={styles.eyebrow}>Sadržaj za odrasle</span>
              <h2 id={titleId}>
                Ovaj profil sadrži <span>18+ radove.</span>
              </h2>
              <p id={descriptionId}>
                Radovi na ovom profilu namijenjeni su isključivo punoljetnim osobama. Potvrdom ispod
                potvrđuješ da imaš 18 ili više godina.
              </p>
            </div>

            <label className={styles.confirmation}>
              <input
                checked={isConfirmed}
                onChange={(event) => setIsConfirmed(event.target.checked)}
                ref={checkboxRef}
                type="checkbox"
              />
              <span>Imam 18 ili više godina</span>
            </label>

            <div className={styles.actions}>
              <Link className={styles.leaveButton} href="/umjetnici">
                Napusti
              </Link>
              <button
                className={styles.enterButton}
                disabled={!isConfirmed}
                onClick={enterProfile}
                type="button"
              >
                Uđi na profil
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

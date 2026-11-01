const DRAFT_STORAGE_KEY = "artboard:artist-application-draft";
const DRAFT_DATABASE_NAME = "artboard-artist-application";
const DRAFT_FILE_STORE = "draft-files";
const DRAFT_FILE_KEY = "current";
const DRAFT_VERSION = 1;

export const PRIJAVA_DRAFT_TTL_MS = 30 * 60 * 1000;

export interface PrijavaDraftFormValues {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  biography: string;
  artistStatement: string;
  motto: string;
  mottoAuthor: string;
  blogUrl: string;
  notes: string;
}

export interface PrijavaDraftMetadata {
  version: typeof DRAFT_VERSION;
  savedAt: number;
  currentStep: number;
  formValues: PrijavaDraftFormValues;
  selectedDisciplineSlugs: string[];
  portfolioLinks: string[];
  socialLinks: string[];
  confirmedRules: boolean;
  showEmailPublic: boolean;
  presentationForms: string[];
  containsNsfw: boolean;
}

export interface PrijavaDraftFiles {
  portfolioPdfFile: File | null;
  profilePhotoFile: File | null;
  coverPhotoFile: File | null;
  artworkFiles: File[];
}

type DraftMetadataInput = Omit<PrijavaDraftMetadata, "version" | "savedAt">;

export function loadPrijavaDraftMetadata() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storedDraft = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!storedDraft) {
      return null;
    }

    const parsedDraft = JSON.parse(storedDraft) as Partial<PrijavaDraftMetadata>;
    const isValidDraft =
      parsedDraft.version === DRAFT_VERSION &&
      typeof parsedDraft.savedAt === "number" &&
      typeof parsedDraft.currentStep === "number" &&
      parsedDraft.formValues !== null &&
      typeof parsedDraft.formValues === "object";

    if (!isValidDraft || Date.now() - parsedDraft.savedAt! > PRIJAVA_DRAFT_TTL_MS) {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      return null;
    }

    return parsedDraft as PrijavaDraftMetadata;
  } catch {
    try {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // Storage can be unavailable in private or restricted browser contexts.
    }
    return null;
  }
}

export function savePrijavaDraftMetadata(draft: DraftMetadataInput) {
  const storedDraft: PrijavaDraftMetadata = {
    ...draft,
    version: DRAFT_VERSION,
    savedAt: Date.now(),
  };

  window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(storedDraft));
}

export async function loadPrijavaDraftFiles() {
  const database = await openDraftDatabase();

  return new Promise<PrijavaDraftFiles | null>((resolve, reject) => {
    const transaction = database.transaction(DRAFT_FILE_STORE, "readonly");
    const request = transaction.objectStore(DRAFT_FILE_STORE).get(DRAFT_FILE_KEY);

    request.onsuccess = () => resolve((request.result as PrijavaDraftFiles | undefined) ?? null);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => database.close();
  });
}

export async function savePrijavaDraftFiles(files: PrijavaDraftFiles) {
  const database = await openDraftDatabase();

  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(DRAFT_FILE_STORE, "readwrite");
    transaction.objectStore(DRAFT_FILE_STORE).put(files, DRAFT_FILE_KEY);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

export async function clearPrijavaDraft() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
  }

  await clearPrijavaDraftFiles();
}

export async function clearPrijavaDraftFiles() {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return;
  }

  const database = await openDraftDatabase();

  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(DRAFT_FILE_STORE, "readwrite");
    transaction.objectStore(DRAFT_FILE_STORE).delete(DRAFT_FILE_KEY);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

function openDraftDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DRAFT_DATABASE_NAME, 1);

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(DRAFT_FILE_STORE)) {
        request.result.createObjectStore(DRAFT_FILE_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

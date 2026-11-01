export interface PlanArtwork { id: string; sourceArtworkId?: string | null; portfolioCollectionId?: string | null; collectionOrderIndex?: number | null; orderIndex: number; isSelected: boolean; }
export interface PlanCollection { id: string; orderIndex: number; isIncluded: boolean; }
export interface PlanProject<A extends PlanArtwork, C extends PlanCollection> { collectionSchemaVersion?: number; includeUncollectedArtworks?: boolean; artworks: A[]; collections?: C[]; includeCv?: boolean; cvSections?: unknown; documentSelection?: DocumentSelection; designConfig?: unknown; }
export type DocumentPage = { kind: "cover" | "profile" | "featured" | "contact" | "cv" } | { kind: "collection"; collectionId: string | null } | { kind: "artwork"; artworkId: string };
export function buildPortfolioDocumentPlan<A extends PlanArtwork, C extends PlanCollection>(project: PlanProject<A, C>): {
  format: number; groups: Array<{ collection: C | null; artworks: A[]; legacyIntro: boolean }>; documentSelection: DocumentSelection;
  selectedArtworks: A[]; pages: DocumentPage[]; pageCount: number; collectionCount: number; artworkCount: number;
};
export type PortfolioCvRowKey = "education" | "experience" | "exhibitions" | "awards" | "certificates" | "publications";
export type PortfolioCvRow = { id: string; values: Record<string, string> };
export type PortfolioCvData = Record<PortfolioCvRowKey, PortfolioCvRow[]> & { version: 1; skills: string; programs: string };
export const CV_FIELDS: Record<PortfolioCvRowKey, readonly string[]>;
export function parsePortfolioCv(value: unknown): PortfolioCvData;
export function readPortfolioCv(value: unknown): PortfolioCvData | null;
export function portfolioCvBlocks(value: unknown, language?: string): Array<{ title: string; items: string[] }>;
export type DocumentSection = 'cover' | 'profile' | 'featured' | 'collections' | 'artworks' | 'cv' | 'contact';
export type DocumentSelection = { version: 1; scope: 'PORTFOLIO' | 'CV'; sections: Record<DocumentSection, boolean> };
export const DOCUMENT_SECTIONS: readonly DocumentSection[];
export function defaultDocumentSelection(includeCv?: boolean): DocumentSelection;
export function parseDocumentSelection(value: unknown): DocumentSelection;
export function getDocumentSelection(project: { includeCv?: boolean; documentSelection?: DocumentSelection; designConfig?: unknown }): DocumentSelection;
export type MinimalDesign = { version: 1; cover: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'; style?: 'MINIMAL' | 'ROUNDED' | 'GRADIENT' | 'EDITORIAL' | 'CARDS' | 'BLOCKS' };
export const MINIMAL_COVERS: readonly MinimalDesign['cover'][];
export function parseMinimalDesign(value: unknown): MinimalDesign;
export function getMinimalDesign(project: { designConfig?: unknown }): MinimalDesign;
export function getMinimalDesignLabel(project: { designConfig?: unknown }): 'Minimal' | 'Rounded' | 'Gradijent';

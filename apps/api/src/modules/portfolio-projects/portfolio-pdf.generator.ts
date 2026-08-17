import PDFDocument from "pdfkit";
import sharp from "sharp";

import type {
  PortfolioArtwork,
  PortfolioFontStyle,
  PortfolioProject,
  PortfolioTemplate,
} from "@prisma/client";

type PortfolioProjectForPdf = PortfolioProject & {
  artworks: PortfolioArtwork[];
  designConfig?: unknown;
};

type PortfolioPdfGenerationOptions = {
  /**
   * Preview PDFs are allowed before payment, so the watermark is the real
   * protection. The browser may still technically receive the file, but this
   * makes it unusable as a clean portfolio export.
   */
  watermark?: boolean;
};

type CvBlock = {
  title: string;
  items: string[];
};

type PortfolioDesignPageKey = "cover" | "profile" | "collection" | "artwork" | "contact";
type PortfolioFooterTemplate = "MINIMAL" | "ARTBOARD" | "SALES";

type ResolvedPortfolioDesignConfig = {
  mode: "PRESET" | "CUSTOM";
  pages: Record<PortfolioDesignPageKey, PortfolioPdfTemplateConfig>;
  footer: PortfolioPdfTemplateConfig;
};

/**
 * Every PDF template must eventually provide the same logical pages:
 * cover, profile/bio, collection, artwork pages, CV and contact.
 *
 * For now we keep the rendering code in one file because the existing
 * Institutional template is still actively being tuned by hand. This config
 * object is the first layer of separation: the generator can choose a template
 * by `project.template`, while the page methods can still share coordinates and
 * helper methods until we are ready to move each template to its own file.
 */
type PortfolioPdfTemplateConfig = {
  id: PortfolioTemplate;

  /**
   * Human readable name used in logs/comments and later useful for debugging
   * generated versions.
   */
  label: string;

  /**
   * Main accent color for template-specific details. Institutional is dark and
   * minimal, Editorial is ArtBoard blue, Sales uses yellow/collector accents.
   */
  accentColor: string;

  /**
   * These variants let us make the three MVP templates visibly different
   * without duplicating the whole PDF generator yet.
   */
  visualTone: "institutional" | "editorial" | "sales";
};

const BRAND_BLUE = "#182fc7";
const BRAND_RED = "#dc1735";
const BRAND_YELLOW = "#ffc41d";
const INK = "#20242d";
const MUTED = "#6d7480";
const SOFT_MUTED = "#9aa2af";
const LINE = "#d9dee8";
const DARK_LINE = "#bfc5d0";
const PAPER = "#fbfbfa";
const LIGHT_PANEL = "#f1f3f6";
const FONT_SANS_REGULAR = "DejaVu Sans";
const FONT_SANS_BOLD = "DejaVu Sans Bold";
const FONT_SERIF_REGULAR = "DejaVu Serif";
const FONT_SERIF_BOLD = "DejaVu Serif Bold";

/**
 * Template registry.
 *
 * This is the important architectural piece: adding a fourth template later
 * should mean adding a new entry here and then adding/overriding the relevant
 * page methods. The service layer should not know how pages are drawn.
 */
const portfolioPdfTemplates: Record<
  PortfolioTemplate,
  PortfolioPdfTemplateConfig
> = {
  INSTITUTIONAL_MINIMAL: {
    id: "INSTITUTIONAL_MINIMAL",
    label: "Institutional Minimal",
    accentColor: INK,
    visualTone: "institutional",
  },
  ARTBOARD_EDITORIAL: {
    id: "ARTBOARD_EDITORIAL",
    label: "ArtBoard Editorial",
    accentColor: BRAND_BLUE,
    visualTone: "editorial",
  },
  SALES_PRO: {
    id: "SALES_PRO",
    label: "Sales / Pro",
    accentColor: BRAND_YELLOW,
    visualTone: "sales",
  },
};

/**
 * Template 1: Institutional / Minimal.
 *
 * The Canva files the user provided are treated as the visual source of truth,
 * but the final PDF is generated from code. This gives us precise dynamic
 * fields, safe image fitting, automatic page numbers, and predictable output
 * for every artist.
 */
export async function generateInstitutionalPortfolioPdf(
  project: PortfolioProjectForPdf,
) {
  return generatePortfolioPdfWithTemplate(project, {
    template: portfolioPdfTemplates.INSTITUTIONAL_MINIMAL,
  });
}

/**
 * Public generator used by the application.
 *
 * This is the function the service should call for real exports. It reads
 * `project.template`, selects the matching renderer config, and then runs the
 * shared PDF flow. The benefit is that the rest of the backend never needs
 * `if template === ...` logic.
 */
export async function generatePortfolioPdf(
  project: PortfolioProjectForPdf,
  options: PortfolioPdfGenerationOptions = {},
) {
  return generatePortfolioDocumentMapWithTemplate(project, {
    options,
    template: resolvePortfolioPdfTemplate(project.template),
  });
}

async function generatePortfolioPdfWithTemplate(
  project: PortfolioProjectForPdf,
  {
    options = {},
    template,
  }: {
    options?: PortfolioPdfGenerationOptions;
    template: PortfolioPdfTemplateConfig;
  },
) {
  const document = createPortfolioDocument(project);
  const chunks: Buffer[] = [];
  document.on("data", (chunk: Buffer) => chunks.push(chunk));

  const selectedArtworks = project.artworks
    .filter((artwork) => artwork.isSelected)
    .sort((first, second) => first.orderIndex - second.orderIndex)
    .slice(0, 30);

  const context = new PortfolioTemplateContext(
    document,
    project,
    template,
    options,
    resolvePortfolioDesignConfig(project, template),
  );

  await context.coverPageForDesign(selectedArtworks[0]);
  await context.profilePageForDesign(selectedArtworks);
  await context.collectionPageForDesign(selectedArtworks);

  for (const [index, artwork] of selectedArtworks.entries()) {
    await context.artworkPageForDesign(artwork, index + 1);
  }

  context.cvPages();
  await context.contactPageForDesign(selectedArtworks);

  const finished = new Promise<void>((resolve, reject) => {
    document.on("end", resolve);
    document.on("error", reject);
  });

  document.end();
  await finished;

  return Buffer.concat(chunks);
}

/**
 * Fast development/testing export for the first PDF page only.
 * This is intentionally not stored as a PortfolioVersion because its purpose is
 * quick visual iteration while tuning coordinates, sizes, and typography.
 */
export async function generateInstitutionalCoverPdf(
  project: PortfolioProjectForPdf,
  options: PortfolioPdfGenerationOptions = {},
) {
  return generatePortfolioDocumentMapWithTemplate(project, {
    options,
    template: portfolioPdfTemplates.INSTITUTIONAL_MINIMAL,
  });
}

/**
 * Development/test generator that still respects the selected template.
 *
 * The name "cover test" is historical in the codebase, but this currently
 * renders the same multi-page test document we use while adjusting the real
 * layout. Keeping this separate is useful because we do not store test PDFs as
 * official portfolio versions.
 */
export async function generateSelectedTemplateTestPdf(
  project: PortfolioProjectForPdf,
  options: PortfolioPdfGenerationOptions = {},
) {
  return generatePortfolioDocumentMapWithTemplate(project, {
    options,
    template: resolvePortfolioPdfTemplate(project.template),
  });
}

/**
 * Current "real" document map.
 *
 * This mirrors the hand-tuned flow the user has been editing: cover, profile,
 * collection page, one page per artwork, and contact page. The method name is
 * intentionally generic because this is the place where future template files
 * will plug in their own page implementations.
 */
async function generatePortfolioDocumentMapWithTemplate(
  project: PortfolioProjectForPdf,
  {
    options = {},
    template,
  }: {
    options?: PortfolioPdfGenerationOptions;
    template: PortfolioPdfTemplateConfig;
  },
) {
  const document = createPortfolioDocument(project);
  const chunks: Buffer[] = [];
  document.on("data", (chunk: Buffer) => chunks.push(chunk));

  const selectedArtworks = project.artworks
    .filter((artwork) => artwork.isSelected)
    .sort((first, second) => first.orderIndex - second.orderIndex);

  const context = new PortfolioTemplateContext(
    document,
    project,
    template,
    options,
    resolvePortfolioDesignConfig(project, template),
  );
  await context.coverPageForDesign(selectedArtworks[0]);

  await context.profilePageForDesign(selectedArtworks);
  await context.collectionPageForDesign(selectedArtworks);

  for (const [index, selectedArtwork] of selectedArtworks.entries()) {
    await context.artworkPageForDesign(selectedArtwork, index + 1);
  }

  await context.contactPageForDesign(selectedArtworks);

  const finished = new Promise<void>((resolve, reject) => {
    document.on("end", resolve);
    document.on("error", reject);
  });

  document.end();
  await finished;

  return Buffer.concat(chunks);
}

function resolvePortfolioPdfTemplate(
  template: PortfolioTemplate | null | undefined,
) {
  return portfolioPdfTemplates[template ?? "INSTITUTIONAL_MINIMAL"];
}

function resolvePortfolioDesignConfig(
  project: PortfolioProjectForPdf,
  fallbackTemplate: PortfolioPdfTemplateConfig,
): ResolvedPortfolioDesignConfig {
  const defaultPages: Record<PortfolioDesignPageKey, PortfolioPdfTemplateConfig> = {
    cover: fallbackTemplate,
    profile: fallbackTemplate,
    collection: fallbackTemplate,
    artwork: fallbackTemplate,
    contact: fallbackTemplate,
  };

  const defaultConfig: ResolvedPortfolioDesignConfig = {
    mode: "PRESET",
    pages: defaultPages,
    footer: fallbackTemplate,
  };

  if (!project.designConfig || typeof project.designConfig !== "object") {
    return defaultConfig;
  }

  const rawConfig = project.designConfig as {
    mode?: unknown;
    pages?: Record<string, unknown>;
    footer?: unknown;
  };

  if (rawConfig.mode !== "CUSTOM" || !rawConfig.pages) {
    return defaultConfig;
  }

  return {
    mode: "CUSTOM",
    pages: {
      cover: resolvePortfolioPdfTemplate(rawConfig.pages.cover as PortfolioTemplate),
      profile: resolvePortfolioPdfTemplate(rawConfig.pages.profile as PortfolioTemplate),
      collection: resolvePortfolioPdfTemplate(rawConfig.pages.collection as PortfolioTemplate),
      artwork: resolvePortfolioPdfTemplate(rawConfig.pages.artwork as PortfolioTemplate),
      contact: resolvePortfolioPdfTemplate(rawConfig.pages.contact as PortfolioTemplate),
    },
    footer: resolveFooterTemplate(rawConfig.footer as PortfolioFooterTemplate, fallbackTemplate),
  };
}

function resolveFooterTemplate(
  footer: PortfolioFooterTemplate | null | undefined,
  fallbackTemplate: PortfolioPdfTemplateConfig,
) {
  if (footer === "MINIMAL") {
    return portfolioPdfTemplates.INSTITUTIONAL_MINIMAL;
  }

  if (footer === "ARTBOARD") {
    return portfolioPdfTemplates.ARTBOARD_EDITORIAL;
  }

  if (footer === "SALES") {
    return portfolioPdfTemplates.SALES_PRO;
  }

  return fallbackTemplate;
}

function createPortfolioDocument(project: PortfolioProjectForPdf) {
  const document = new PDFDocument({
    autoFirstPage: false,
    bufferPages: false,
    margin: 0,
    size: project.pageFormat === "US_LETTER" ? "LETTER" : "A4",
  });

  registerPortfolioFonts(document);

  return document;
}

function registerPortfolioFonts(document: PDFKit.PDFDocument) {
  // PDFKit's built-in Helvetica/Times fonts do not reliably support Montenegrin/
  // Serbian Latin characters such as č, ć, š, ž and especially đ. These embedded
  // latin-ext web fonts keep generated PDFs portable on local machines and Railway.
  document.registerFont(
    FONT_SANS_REGULAR,
    require.resolve("dejavu-fonts-ttf/ttf/DejaVuSans.ttf"),
  );
  document.registerFont(
    FONT_SANS_BOLD,
    require.resolve("dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf"),
  );
  document.registerFont(
    FONT_SERIF_REGULAR,
    require.resolve("dejavu-fonts-ttf/ttf/DejaVuSerif.ttf"),
  );
  document.registerFont(
    FONT_SERIF_BOLD,
    require.resolve("dejavu-fonts-ttf/ttf/DejaVuSerif-Bold.ttf"),
  );
}

class PortfolioTemplateContext {
  private pageNumber = 0;

  constructor(
    private readonly document: PDFKit.PDFDocument,
    private readonly project: PortfolioProjectForPdf,
    private template: PortfolioPdfTemplateConfig,
    private readonly options: PortfolioPdfGenerationOptions = {},
    private readonly designConfig: ResolvedPortfolioDesignConfig,
  ) {}

  /**
   * Premium custom design works by changing the active renderer only while one
   * logical page is being drawn. The page methods below can stay simple and
   * continue to read `this.template`; this wrapper makes the switch reversible.
   */
  private async withPageTemplate<T>(
    template: PortfolioPdfTemplateConfig,
    renderPage: () => Promise<T>,
  ) {
    const previousTemplate = this.template;
    this.template = template;

    try {
      return await renderPage();
    } finally {
      this.template = previousTemplate;
    }
  }

  async coverPageForDesign(featuredArtwork: PortfolioArtwork | undefined) {
    return this.withPageTemplate(this.designConfig.pages.cover, () => this.coverPage(featuredArtwork));
  }

  async profilePageForDesign(selectedArtworks: PortfolioArtwork[]) {
    return this.withPageTemplate(this.designConfig.pages.profile, () =>
      this.profilePageForTemplate(selectedArtworks),
    );
  }

  async collectionPageForDesign(selectedArtworks: PortfolioArtwork[]) {
    return this.withPageTemplate(this.designConfig.pages.collection, () =>
      this.collectionPageForTemplate(selectedArtworks),
    );
  }

  async artworkPageForDesign(artwork: PortfolioArtwork, index: number) {
    return this.withPageTemplate(this.designConfig.pages.artwork, () =>
      this.artworkPageForTemplate(artwork, index),
    );
  }

  async contactPageForDesign(selectedArtworks: PortfolioArtwork[]) {
    return this.withPageTemplate(this.designConfig.pages.contact, () =>
      this.contactPageForTemplate(selectedArtworks),
    );
  }

  async coverPage(featuredArtwork: PortfolioArtwork | undefined) {
    if (this.template.visualTone === "editorial") {
      await this.editorialCoverPage(featuredArtwork);
      return;
    }

    if (this.template.visualTone === "sales") {
      await this.salesCoverPage(featuredArtwork);
      return;
    }

    this.addPage();

    const profileImage = await fetchImageBuffer(this.project.profileImageUrl);
    const coverImage = await fetchFirstImageBuffer([
      this.project.coverImageUrl,
      featuredArtwork?.imageUrl,
    ]);

    if (coverImage) {
      this.safeImage(
        coverImage,
        0,
        0,
        this.pageWidth(),
        542,
        "COVER SLIKA",
        "cover",
      );
    } else {
      this.placeholder(
        0,
        0,
        this.pageWidth(),
        542,
        "COVER SLIKA\n(UMJETNICKI RAD)",
      );
    }

    this.templateCoverAccent();

    this.document
      .font(this.headingFont())
      .fontSize(39)
      .fillColor(INK)
      .text(toStackedUpperName(this.project.artistName), 54, 634, {
        lineGap: 7,
        width: 485,
      });

    this.document
      .font(this.headingFont())
      .fontSize(10)
      .fillColor(INK)
      .text("Vizuelni umjetnik".toUpperCase(), 54, 734, {
        characterSpacing: 5,
        width: 485,
      });

    if (profileImage) {
      this.circularImageOrPlaceholder(
        profileImage,
        this.pageWidth() - 166,
        634,
        112,
        "PROFILE",
      );
    } else {
      this.placeholder(394, 634, 112, 112, "PROFILE");
    }

    this.footerForCover();
  }

  async editorialCoverPage(featuredArtwork: PortfolioArtwork | undefined) {
    this.addPage();

    const profileImage = await fetchImageBuffer(this.project.profileImageUrl);
    const coverImage = await fetchFirstImageBuffer([
      this.project.coverImageUrl,
      featuredArtwork?.imageUrl,
    ]);

    this.document
      .font(this.headingFont())
      .fontSize(39)
      .fillColor(INK)
      .text(toStackedUpperName(this.project.artistName), 45, 50, {
        lineGap: 7,
        width: 485,
      });

    this.document
      .font(this.headingFont())
      .fontSize(10)
      .fillColor(MUTED)
      .text("Vizuelni umjetnik".toUpperCase(), 48, 160, {
        characterSpacing: 5,
        width: 485,
      });
    const y = 210;

    this.document.circle(70, y, 4).fill(BRAND_BLUE);
    this.document.circle(60, y, 4).fill(BRAND_RED);
    this.document.circle(50, y, 4).fill(BRAND_YELLOW);

    this.document
      .font(this.headingFont())
      .fontSize(9)
      .fillColor(INK)
      .text("Portfolio, 2026".toUpperCase(), 80, y - 4, {
        characterSpacing: 2,
      });
    if (profileImage) {
      this.document.save();
      this.document
        .roundedRect(this.pageWidth() - 200, 45, 152, 180, 10)
        .clip();
      this.safeImage(
        profileImage,
        this.pageWidth() - 200,
        45,
        152,
        180,
        "PROFILE",
        "cover",
      );
      this.document.restore();
    }

    if (coverImage) {
      this.safeImage(
        coverImage,
        0,
        270,
        this.pageWidth(),
        570,
        "COVER SLIKA",
        "cover",
      );
    }
  }

  /**
   * Template 3 cover: Sales / Pro.
   *
   * This cover is intentionally more visual than Institutional:
   * - the full page gets a strong ArtBoard gradient border,
   * - the inner document stays white and readable,
   * - the profile image, name and portfolio meta sit as a compact header,
   * - the selected cover artwork owns the lower part of the page.
   *
   * Keeping this as a separate method is important because future Sales pages
   * can evolve independently without breaking the first two templates.
   */
  async salesCoverPage(featuredArtwork: PortfolioArtwork | undefined) {
    this.addPage();

    const pageWidth = this.pageWidth();
    const pageHeight = this.pageHeight();
    const border = 16;
    const contentLeft = 58;
    const profileSize = 112;

    const profileImage = await fetchImageBuffer(this.project.profileImageUrl);
    const coverImage = await fetchFirstImageBuffer([
      this.project.coverImageUrl,
      featuredArtwork?.imageUrl,
    ]);

    // PDFKit gradients behave like paint objects. We draw the whole page first,
    // then place a white sheet on top so the gradient remains visible as border.
    const borderGradient = this.salesTemplateGradient();

    this.document.rect(0, 0, pageWidth, pageHeight).fill(borderGradient);
    this.document
      .rect(border, border, pageWidth - border * 2, pageHeight - border * 2)
      .fill(PAPER);

    // Top identity block: rounded/circular profile image plus artist data.
    if (profileImage) {
      this.document.save();
      this.document
        .circle(contentLeft + profileSize / 2, 68 + profileSize / 2, profileSize / 2)
        .clip();
      this.safeImage(
        profileImage,
        contentLeft,
        68,
        profileSize,
        profileSize,
        "PROFILE",
        "cover",
        PAPER,
      );
      this.document.restore();
    } else {
      this.placeholder(contentLeft, 68, profileSize, profileSize, "PROFILE");
    }

    const textX = contentLeft + profileSize + 46;

    this.document
      .font(this.headingFont())
      .fontSize(34)
      .fillColor("#05070d")
      .text(toStackedUpperName(this.project.artistName), textX, 68, {
        lineGap: 2,
        width: pageWidth - textX - 70,
      });

    this.document
      .font(this.headingFont())
      .fontSize(10)
      .fillColor(INK)
      .text((this.project.discipline || "Vizuelna umjetnica").toUpperCase(), textX, 154, {
        characterSpacing: 1.2,
        width: pageWidth - textX - 70,
      });

    const metaY = 194;
    this.document.circle(textX + 4, metaY, 4).fill(BRAND_BLUE);
    this.document.circle(textX + 15, metaY, 4).fill(BRAND_RED);
    this.document.circle(textX + 26, metaY, 4).fill(BRAND_YELLOW);

    this.document
      .font(this.headingFont())
      .fontSize(7.8)
      .fillColor("#05070d")
      .text(`PORTFOLIO, ${new Date(this.project.updatedAt).getFullYear()}`, textX + 40, metaY - 4, {
        width: 160,
      });

    // Main artwork area. "cover" makes the artwork fill the chosen frame,
    // which matches the visual requirement from the reference image.
    const coverX = contentLeft;
    const coverY = 255;
    const coverW = pageWidth - contentLeft * 2;
    const coverH = pageHeight - coverY - 62;

    if (coverImage) {
      this.document.save();
      this.document.roundedRect(coverX, coverY, coverW, coverH, 5).clip();
      this.safeImage(
        coverImage,
        coverX,
        coverY,
        coverW,
        coverH,
        "COVER SLIKA",
        "cover",
        LIGHT_PANEL,
      );
      this.document.restore();
    } else {
      this.placeholder(coverX, coverY, coverW, coverH, "COVER SLIKA");
    }

    this.previewWatermark();
  }

  async profilePageForTemplate(artworks: PortfolioArtwork[]) {
    if (this.template.visualTone === "editorial") {
      await this.editorialBioPage(artworks);
      return;
    }

    if (this.template.visualTone === "sales") {
      await this.salesProfilePage(artworks);
      return;
    }

    this.profilePage();
  }

  /**
   * Template 3 profile page.
   *
   * This is the second page of the Sales / Pro template. It keeps the text
   * simple and leaves most of the visual weight to a 3x3 artwork grid. The
   * design goal is a quick collector-friendly overview: "who is the artist?"
   * and "what kind of work do they make?" without the institutional metadata
   * sidebar used in Template 1.
   */
  private async salesProfilePage(artworks: PortfolioArtwork[]) {
    this.addPage();

    const left = 72;
    const top = 74;
    const contentWidth = this.pageWidth() - left * 2;
    const bioText =
      this.project.biography?.trim() ||
      "Ovdje unesite biografiju umjetnika. Tekst treba kratko da predstavi praksu, iskustvo i umjetnicki razvoj.";
    const statementText =
      this.project.artistStatement?.trim() ||
      "Ovdje unesite tekst o radu umjetnika. Ovaj dio objasnjava ideje, motive, proces i teme koje se ponavljaju u umjetnickom radu.";
    const selectedArtworks = artworks.slice(0, 9);

    this.salesSectionTitle("O UMJETNIKU", left, top);

    this.document
      .font(this.bodyFont())
      .fontSize(9)
      .fillColor(INK)
      .text(bioText, left, top + 34, {
        lineGap: 2,
        width: contentWidth,
      });

    const firstTextHeight = this.document.heightOfString(bioText, {
      lineGap: 2,
      width: contentWidth,
    });
    const secondTextY = Math.min(top + 170, top + 44 + firstTextHeight);

    this.document
      .font(this.bodyFont())
      .fontSize(9)
      .fillColor(INK)
      .text(statementText, left, secondTextY, {
        lineGap: 2,
        width: contentWidth,
      });

    const gridTop = 300;
    const gap = 14;
    const cardSize = (contentWidth - gap * 2) / 3;

    for (let index = 0; index < 9; index += 1) {
      const artwork = selectedArtworks[index];
      const column = index % 3;
      const row = Math.floor(index / 3);
      const x = left + column * (cardSize + gap);
      const y = gridTop + row * (cardSize + gap);

      this.document.save();
      this.document.roundedRect(x, y, cardSize, cardSize, 4).clip();

      if (artwork?.imageUrl) {
        const image = await fetchImageBuffer(artwork.imageUrl);

        if (image) {
          this.safeImage(image, x, y, cardSize, cardSize, "RAD", "cover", LIGHT_PANEL);
        } else {
          this.placeholder(x, y, cardSize, cardSize, "RAD");
        }
      } else {
        this.placeholder(x, y, cardSize, cardSize, "RAD");
      }

      this.document.restore();
    }

    this.previewWatermark();
  }

  private async editorialBioPage(artworks: PortfolioArtwork[]) {
    this.addPage();

    const left = 42;
    const top = 58;
    const contentWidth = this.pageWidth() - left * 2;
    const bodyWidth = 345;

    const bioText =
      this.project.biography?.trim() ||
      "Ovdje unesite biografiju umjetnika. Tekst treba kratko da predstavi obrazovanje, praksu, iskustvo i umjetnicki razvoj.";

    const statementText =
      this.project.artistStatement?.trim() ||
      "Ovdje unesite tekst o radu umjetnika. Ovaj dio objasnjava ideje, motive, proces i teme koje se ponavljaju u umjetnickom radu.";

    const selectedArtworks = artworks.slice(0, 6);

    const drawSectionTitle = (
      x: number,
      y: number,
      color: string,
      title: string,
    ) => {
      this.document.circle(x, y + 5, 3).fill(color);

      this.document
        .font(this.headingFont())
        .fontSize(10)
        .fillColor(INK)
        .text(title, x + 12, y);
    };

    const drawParagraph = (
      x: number,
      y: number,
      text: string,
      width: number,
    ) => {
      this.document
        .font(this.bodyFont())
        .fontSize(9)
        .fillColor(INK)
        .text(text, x, y, {
          width,
          lineGap: 2,
        });
    };

    drawSectionTitle(left, top, BRAND_BLUE, "BIOGRAFIJA UMJETNIKA");
    drawParagraph(left, top + 22, bioText, contentWidth);

    const workSectionY = top + 142;

    drawSectionTitle(left, workSectionY, BRAND_RED, "O RADU UMJETNIKA");
    drawParagraph(left, workSectionY + 22, bioText, contentWidth);

    const artworksSectionY = workSectionY + 132;

    drawSectionTitle(
      left,
      artworksSectionY,
      BRAND_YELLOW,
      "IZDVOJENI UMJETNICKI RADOVI",
    );

    const gridTop = artworksSectionY + 34;
    const cardSize = 158;
    const gap = 12;

    for (let index = 0; index < 6; index += 1) {
      const artwork = selectedArtworks[index];

      const column = index % 3;
      const row = Math.floor(index / 3);

      const x = left + column * (cardSize + gap);
      const y = gridTop + row * (cardSize + gap);

      this.document.roundedRect(x, y, cardSize, cardSize, 4).fill("#edf6fb");

      if (!artwork?.imageUrl) {
        this.placeholder(x, y, cardSize, cardSize, "RAD");
        continue;
      }

      const image = await fetchImageBuffer(artwork.imageUrl);

      if (!image) {
        this.placeholder(x, y, cardSize, cardSize, "RAD");
        continue;
      }

      this.document.save();
      this.document.roundedRect(x, y, cardSize, cardSize, 4).clip();
      this.safeImage(image, x, y, cardSize, cardSize, "RAD", "cover");
      this.document.restore();
    }

// this.footer();
  }

  profilePage() {
    this.addPage();
    this.sectionTitle("PROFIL UMJETNIKA");

    this.textSection(
      "BIOGRAFIJA",
      this.project.biography,
      54,
      112,
      this.pageWidth() - 98,
      150,
      {
        fallback: "Biografija jos nije unesena.",
      },
    );

    this.textSection(
      "ARTIST STATEMENT",
      this.project.artistStatement,
      54,
      318,
      this.pageWidth() / 2 - 98,
      150,
      {
        fallback: "Artist statement jos nije unesen.",
      },
    );

    const asideX = 317;
    const asideY = 200;
    this.document
      .moveTo(this.pageWidth() / 2, 318)
      .lineTo(this.pageWidth() / 2, 707)
      .strokeColor(INK)
      .lineWidth(0.8)
      .stroke();

    this.compactInfoSection(
      "DATUM DOKUMENTA",
      [formatDate(this.project.updatedAt)],
      asideX,
      118 + asideY,
    );
    this.compactInfoSection(
      "EMAIL",
      [this.project.email ?? "Nije unesen"],
      asideX,
      178 + asideY,
    );
    this.compactInfoSection(
      "BROJ TELEFONA",
      [this.project.phone ?? "Nije unesen"],
      asideX,
      238 + asideY,
    );
    this.compactInfoSection(
      "LOKACIJA",
      [this.project.location ?? "Nije unesena"],
      asideX,
      298 + asideY,
    );
    this.compactInfoSection(
      "DISCIPLINA",
      [this.project.discipline ?? "Nije unesena"],
      asideX,
      358 + asideY,
    );

    this.compactInfoSection(
      "LINKOVI",
      [
        this.project.websiteUrl ?? "Nije unesen",
        this.project.instagramUrl ?? "Nije unesen",
        this.project.artboardProfileUrl ?? "Nije unesen",
      ],
      asideX,
      418 + asideY,
    );

    // this.document.moveTo(54, 520).lineTo(this.pageWidth() - 54, 520).strokeColor(LINE).lineWidth(0.8).stroke();
    // this.linkLine("WEBSITE", this.project.websiteUrl, 54, 555, "◉");
    // this.linkLine("INSTAGRAM", this.project.instagramUrl, 54, 585, "◎");
    // this.linkLine("ARTBOARD", this.project.artboardProfileUrl, 54, 615, "↗");

    this.footer();
  }

  async collectionPageForTemplate(artworks: PortfolioArtwork[]) {
    const collectionArtwork = artworks[0];

    if (this.template.visualTone === "editorial") {
      await this.collectionPageEditorial(collectionArtwork);
      return;
    }

    if (this.template.visualTone === "sales") {
      await this.collectionPageSales(collectionArtwork);
      return;
    }

    await this.collectionPage(collectionArtwork);
  }

  async collectionPage(artwork: PortfolioArtwork | undefined) {
    this.addPage();
    this.sectionTitle("KOLEKCIJA");

    const coverImage = await fetchFirstImageBuffer([
      this.project.collectionCoverUrl,
      this.project.coverImageUrl,
      artwork?.imageUrl,
    ]);

    if (coverImage) {
      this.safeImage(
        coverImage,
        54,
        100,
        this.pageWidth() - 108,
        300,
        "COVER SLIKA",
        "contain",
      );
    } else {
      this.placeholder(
        54,
        100,
        this.pageWidth() - 108,
        300,
        "COVER SLIKA\n(UMJETNICKI RAD)",
      );
    }
    const x = 54;
    let y = 440;
    const textWidth = this.pageWidth() - 108;
    const collectionName =
      this.project.collectionName ??
      artwork?.collectionName ??
      "NAZIV KOLEKCIJE";
    const collectionYear =
      this.project.collectionYear ?? artwork?.year ?? "GODINA";
    const collectionDescription =
      this.project.collectionDescription ??
      artwork?.description ??
      "Opis kolekcije jos nije unesen. Ovdje ce se prikazati uvodni tekst o odabranoj seriji radova, njenom kontekstu, motivima i godini nastanka.";

    this.document
      .font(this.headingFont())
      .fontSize(10)
      .fillColor(INK)
      .text(collectionName.toUpperCase(), x, y, {
        continued: true,
      })
      .font(this.bodyFont())
      .fontSize(10)
      .text(` ${collectionYear}`);

    y += 24;

    this.document
      .font(this.bodyFont())
      .fontSize(8)
      .fillColor(INK)
      .text(collectionDescription, x, y, {
        width: textWidth,
        lineGap: 2,
      });

    this.footer();
  }

  /**
   * Template 3 / Sales Pro collection page.
   *
   * This is intentionally not a generic "collection" layout. Each PDF template
   * can have its own page rhythm, spacing and footer treatment, so this method
   * owns the Sales Pro version completely and keeps the institutional/editorial
   * pages safe from accidental style changes.
   */
  async collectionPageSales(artwork: PortfolioArtwork | undefined) {
    this.addPage();

    const left = 44;
    const top = 44;
    const contentWidth = this.pageWidth() - left * 2;

    const coverImage = await fetchFirstImageBuffer([
      this.project.collectionCoverUrl,
      this.project.coverImageUrl,
      artwork?.imageUrl,
    ]);

    const collectionName =
      this.project.collectionName ??
      artwork?.collectionName ??
      "NAZIV KOLEKCIJE";
    const collectionYear =
      this.project.collectionYear ?? artwork?.year ?? "GODINA";
    const collectionDescription =
      this.project.collectionDescription ??
      artwork?.description ??
      "Opis kolekcije jos nije unesen. Ovdje ce se prikazati uvodni tekst o odabranoj seriji radova, njenom kontekstu, motivima i godini nastanka.";

    this.salesSectionTitle("KOLEKCIJA", left, top);

    const imageX = left;
    const imageY = top + 34;
    const imageW = contentWidth;
    const imageH = 346;

    if (coverImage) {
      this.document.save();
      this.document.roundedRect(imageX, imageY, imageW, imageH, 3).clip();
      this.safeImage(
        coverImage,
        imageX,
        imageY,
        imageW,
        imageH,
        "COVER KOLEKCIJE",
        "contain",
        LIGHT_PANEL,
      );
      this.document.restore();
    } else {
      this.placeholder(
        imageX,
        imageY,
        imageW,
        imageH,
        "COVER KOLEKCIJE",
      );
    }

    const titleY = imageY + imageH + 32;

    this.document
      .font(this.headingFont())
      .fontSize(9)
      .fillColor(INK)
      .text(collectionName.toUpperCase(), left, titleY, {
        continued: true,
      })
      .font(this.bodyFont())
      .fontSize(9)
      .text(` ${collectionYear}`);

    this.document
      .font(this.bodyFont())
      .fontSize(8)
      .fillColor(INK)
      .text(collectionDescription, left, titleY + 26, {
        width: contentWidth,
        lineGap: 2.2,
      });

    this.salesPortfolioFooter();
  }

  async collectionPageEditorial(artwork: PortfolioArtwork | undefined) {
    this.addPage();
    this.sectionTitleEditorial("KOLEKCIJA RADOVA");

    const coverImage = await fetchFirstImageBuffer([
      this.project.collectionCoverUrl,
      this.project.coverImageUrl,
      artwork?.imageUrl,
    ]);

    const coverX = 54;
    const coverY = 110;
    const coverW = this.pageWidth() - 108;
    const coverH = 320;

    if (coverImage) {
      this.document.save();
      this.document.roundedRect(coverX, coverY, coverW, coverH, 10).clip();
      this.safeImage(
        coverImage,
        coverX,
        coverY,
        coverW,
        coverH,
        "COVER SLIKA",
        "contain",
      );
      this.document.restore();
    } else {
      this.placeholder(
        coverX,
        coverY,
        coverW,
        coverH,
        "COVER SLIKA\n(UMJETNICKI RAD)",
      );
    }

    const x = 54;
    let y = 470;
    const textWidth = this.pageWidth() - 108;
    const collectionName =
      this.project.collectionName ??
      artwork?.collectionName ??
      "NAZIV KOLEKCIJE";
    const collectionYear =
      this.project.collectionYear ?? artwork?.year ?? "GODINA";
    const collectionDescription =
      this.project.collectionDescription ??
      artwork?.description ??
      "Opis kolekcije jos nije unesen. Ovdje ce se prikazati uvodni tekst o odabranoj seriji radova, njenom kontekstu, motivima i godini nastanka.";

    this.document.circle(x, y + 6, 4).fill(BRAND_RED);

    this.document
      .font(this.headingFont())
      .fontSize(14)
      .fillColor(INK)
      .text(collectionName.toUpperCase(), x + 16, y, {
        continued: true,
      })
      .font(this.bodyFont())
      .fontSize(14)
      .fillColor(MUTED)
      .text(` ${collectionYear}`);

    y += 32;

    this.document
      .font(this.bodyFont())
      .fontSize(8.5)
      .fillColor(INK)
      .text(collectionDescription, x, y, {
        width: textWidth,
        lineGap: 2.5,
      });

    this.footer();
  }

  async artworkPageForTemplate(
    artwork: PortfolioArtwork | undefined,
    displayIndex: number,
  ) {
    if (this.template.visualTone === "editorial") {
      await this.artworkPageEditorial(artwork, displayIndex);
      return;
    }

    if (this.template.visualTone === "sales") {
      await this.artworkPageSales(artwork);
      return;
    }

    await this.artworkDetailPage(artwork, displayIndex);
  }

  async artworkDetailPage(
    artwork: PortfolioArtwork | undefined,
    displayIndex: number,
  ) {
    this.addPage();

    const pageMargin = 54;
    const contentWidth = this.pageWidth() - pageMargin * 2;

    // 1. Naslov stranice
    this.document
      .font(this.headingFont())
      .fontSize(16)
      .fillColor(INK)
      .text("UMJETNIČKI RADOVI", pageMargin, 58, {
        width: contentWidth,
      });

    this.document
      .moveTo(pageMargin, 82)
      .lineTo(this.pageWidth() - pageMargin, 82)
      .strokeColor(INK)
      .lineWidth(0.8)
      .stroke();

    // 2. Velika slika rada
    const image = await fetchFirstImageBuffer([
      artwork?.imageUrl,
      this.project.coverImageUrl,
    ]);

    const imageX = pageMargin;
    const imageY = 112;
    const imageW = contentWidth;
    const imageH = 300;

    if (image) {
      // "cover" popunjava cijeli prostor, "contain" prikazuje cijelu sliku.
      // Za izgled sa slike najvjerovatnije želiš "cover".
      this.safeImage(
        image,
        imageX,
        imageY,
        imageW,
        imageH,
        "SLIKA RADA",
        "contain",
      );
    } else {
      this.placeholder(imageX, imageY, imageW, imageH, "SLIKA RADA");
    }

    // 3. Metadata blokovi ispod slike
    const metaTop = imageY + imageH + 38;
    const leftX = pageMargin;
    const rightX = pageMargin + contentWidth / 2;
    const metaWidth = contentWidth / 2 - 24;

    this.artworkInfoBlock(
      "NAZIV RADA",
      artwork?.title ?? "Lorem ipsum dolor",
      leftX,
      metaTop,
      metaWidth,
    );
    this.artworkInfoBlock(
      "GODINA",
      artwork?.year ?? "2026",
      rightX,
      metaTop,
      metaWidth,
    );

    this.artworkInfoBlock(
      "KOLEKCIJA",
      artwork?.collectionName ?? "Lorem ipsum dolor",
      leftX,
      metaTop + 52,
      metaWidth,
    );

    this.artworkInfoBlock(
      "TEHNIKA / DISCIPLINA",
      artwork?.technique ?? this.project.discipline ?? "Lorem ipsum dolor",
      rightX,
      metaTop + 52,
      metaWidth,
    );

    // 4. Naslov opisa
    const descriptionTitleY = metaTop + 120;

    this.document
      .font(this.headingFont())
      .fontSize(11)
      .fillColor(INK)
      .text(
        (artwork?.title ?? "NAZIV RADA").toUpperCase(),
        pageMargin,
        descriptionTitleY,
        {
          continued: true,
        },
      )
      .font(this.bodyFont())
      .fontSize(11)
      .text(
        `, ${this.project.discipline ?? "DISCIPLINA"}, ${artwork?.year ?? "2026"}`,
      );

    // 5. Opis rada
    this.document
      .font(this.bodyFont())
      .fontSize(8.5)
      .fillColor(INK)
      .text(
        artwork?.description ??
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
        pageMargin,
        descriptionTitleY + 28,
        {
          width: contentWidth,
          lineGap: 2,
        },
      );

    this.footer();
  }

  /**
   * Template 3 / Sales Pro artwork page.
   *
   * The Sales layout is more direct and commercial than the other templates:
   * one large artwork, clear metadata, then a short collector-friendly
   * description block. It intentionally does not use `displayIndex` because the
   * visual reference labels all work pages as a repeated "UMJETNICKI RADOVI"
   * section instead of numbered editorial pages.
   */
  async artworkPageSales(artwork: PortfolioArtwork | undefined) {
    this.addPage();

    const left = 44;
    const top = 44;
    const contentWidth = this.pageWidth() - left * 2;

    this.salesSectionTitle("UMJETNICKI RADOVI", left, top);

    const image = await fetchFirstImageBuffer([
      artwork?.imageUrl,
      this.project.coverImageUrl,
    ]);

    const imageX = left;
    const imageY = top + 34;
    const imageW = contentWidth;
    const imageH = 330;

    if (image) {
      this.document.save();
      this.document.roundedRect(imageX, imageY, imageW, imageH, 3).clip();
      this.safeImage(
        image,
        imageX,
        imageY,
        imageW,
        imageH,
        "SLIKA RADA",
        "cover",
        LIGHT_PANEL,
      );
      this.document.restore();
    } else {
      this.placeholder(imageX, imageY, imageW, imageH, "SLIKA RADA");
    }

    const metaTop = imageY + imageH + 34;
    const metaWidth = contentWidth / 2 - 28;
    const rightX = left + contentWidth / 2;

    this.artworkInfoBlock(
      "NAZIV RADA",
      artwork?.title ?? "Lorem ipsum dolor",
      left,
      metaTop,
      metaWidth,
    );
    this.artworkInfoBlock(
      "GODINA",
      artwork?.year ?? "2026",
      rightX,
      metaTop,
      metaWidth,
    );
    this.artworkInfoBlock(
      "KOLEKCIJA",
      artwork?.collectionName ?? this.project.collectionName ?? "Lorem ipsum dolor",
      left,
      metaTop + 50,
      metaWidth,
    );
    this.artworkInfoBlock(
      "TEHNIKA / DISCIPLINA",
      artwork?.technique ?? this.project.discipline ?? "Lorem ipsum dolor",
      rightX,
      metaTop + 50,
      metaWidth,
    );

    const descriptionTitleY = metaTop + 118;

    this.document
      .font(this.headingFont())
      .fontSize(10)
      .fillColor(INK)
      .text((artwork?.title ?? "NAZIV RADA").toUpperCase(), left, descriptionTitleY, {
        continued: true,
      })
      .font(this.bodyFont())
      .fontSize(10)
      .text(
        `, ${this.project.discipline ?? "DISCIPLINA"}, ${artwork?.year ?? "GODINA"}`,
      );

    this.document
      .font(this.bodyFont())
      .fontSize(8)
      .fillColor(INK)
      .text(
        artwork?.description ??
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
        left,
        descriptionTitleY + 26,
        {
          width: contentWidth,
          lineGap: 2.2,
        },
      );

    this.salesPortfolioFooter();
  }

  async artworkPageEditorial(
    artwork: PortfolioArtwork | undefined,
    displayIndex: number,
  ) {
    this.addPage();
    this.sectionTitleEditorial(
      `${String(displayIndex).padStart(2, "0")} / UMJETNICKI RAD`,
    );

    const pageMargin = 54;
    const contentWidth = this.pageWidth() - pageMargin * 2;
    const image = await fetchFirstImageBuffer([
      artwork?.imageUrl,
      this.project.coverImageUrl,
    ]);

    const imageX = pageMargin;
    const imageY = 118;
    const imageW = contentWidth;
    const imageH = 330;

    if (image) {
      this.document.save();
      this.document.roundedRect(imageX, imageY, imageW, imageH, 8).clip();
      this.safeImage(
        image,
        imageX,
        imageY,
        imageW,
        imageH,
        "SLIKA RADA",
        "contain",
        PAPER
      );
      this.document.restore();
    } else {
      this.placeholder(imageX, imageY, imageW, imageH, "SLIKA RADA");
    }

    const metaTop = imageY + imageH + 34;
    const leftX = pageMargin;
    const rightX = pageMargin + contentWidth / 2;
    const metaWidth = contentWidth / 2 - 24;

    this.artworkInfoBlock(
      "NAZIV RADA",
      artwork?.title ?? "Lorem ipsum dolor",
      leftX,
      metaTop,
      metaWidth,
    );
    this.artworkInfoBlock(
      "GODINA",
      artwork?.year ?? "2026",
      rightX,
      metaTop,
      metaWidth,
    );
    this.artworkInfoBlock(
      "KOLEKCIJA",
      artwork?.collectionName ?? "Lorem ipsum dolor",
      leftX,
      metaTop + 52,
      metaWidth,
    );
    this.artworkInfoBlock(
      "TEHNIKA / DISCIPLINA",
      artwork?.technique ?? this.project.discipline ?? "Lorem ipsum dolor",
      rightX,
      metaTop + 52,
      metaWidth,
    );

    const descriptionTitleY = metaTop + 122;


    this.document
      .font(this.headingFont())
      .fontSize(11)
      .fillColor(INK)
      .text(
        (artwork?.title ?? "NAZIV RADA").toUpperCase(),
        pageMargin,
        descriptionTitleY,
        {
          continued: true,
        },
      )
      .font(this.bodyFont())
      .fontSize(11)
      .fillColor(MUTED)
      .text(
        `, ${this.project.discipline ?? "DISCIPLINA"}, ${artwork?.year ?? "2026"}`,
      );

    this.document
      .font(this.bodyFont())
      .fontSize(8.5)  
      .fillColor(INK)
      .text(
        artwork?.description ??
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        pageMargin,
        descriptionTitleY + 28,
        {
          width: contentWidth,
          lineGap: 2.3,
        },
      );

    this.footer();
  }

  private artworkInfoBlock(
    label: string,
    value: string,
    x: number,
    y: number,
    width: number,
  ) {
    this.document
      .font(this.headingFont())
      .fontSize(7.5)
      .fillColor(INK)
      .text(label.toUpperCase(), x, y, {
        width,
      });

    this.document
      .font(this.bodyFont())
      .fontSize(7)
      .fillColor(INK)
      .text(value, x, y + 13, {
        width,
        lineGap: 1,
      });
  }
  cvPages() {
    const blocks = this.safeCvBlocks();
    const firstPageBlocks = blocks.slice(0, 4);
    const secondPageBlocks = blocks.slice(4, 9);

    this.cvPage("CV — 1", firstPageBlocks, "first");
    this.cvPage(
      "CV — 2",
      secondPageBlocks.length > 0 ? secondPageBlocks : blocks.slice(0, 3),
      "second",
    );
  }

  private contactPageLegacy() {
    this.addPage();
    this.sectionTitle("KONTAKT");

    this.contactLine(
      "Lokacija",
      this.project.location ?? "Crna Gora",
      54,
      125,
      "⌖",
    );
    this.contactLine(
      "Email",
      this.project.email ?? "Nije unesen",
      54,
      175,
      "✉",
    );
    this.contactLine(
      "Telefon",
      this.project.phone ?? "Nije unesen",
      54,
      225,
      "☎",
    );
    this.contactLine(
      "Website",
      this.project.websiteUrl ?? "Nije unesen",
      54,
      275,
      "◉",
    );
    this.contactLine(
      "Instagram",
      this.project.instagramUrl ?? "Nije unesen",
      54,
      325,
      "◎",
    );

    this.placeholder(this.pageWidth() - 230, 125, 150, 150, "QR KOD");

    this.document
      .font(this.headingFont())
      .fontSize(10)
      .fillColor(INK)
      .text("HVALA", 54, 430);
    this.paragraph(
      "Hvala vam na vremenu i interesovanju za moj rad. Za dodatne informacije, saradnju ili kupovinu radova kontaktirajte me putem navedenih kanala.",
      54,
      455,
      this.pageWidth() - 108,
      "",
      10,
      5,
    );

    this.document
      .font(this.headingFont())
      .fontSize(10)
      .fillColor(INK)
      .text("O UMJETNIKU", 54, 565);
    this.paragraph(
      this.project.biography,
      54,
      590,
      this.pageWidth() - 108,
      "Biografija nije unesena.",
      9,
      4,
    );

    this.footer();
  }

  async contactPageForTemplate(artworks: PortfolioArtwork[]) {
    const contactArtwork = artworks[0];

    if (this.template.visualTone === "editorial") {
      await this.contactPageEditorial(contactArtwork);
      return;
    }

    if (this.template.visualTone === "sales") {
      await this.contactPageSales(contactArtwork);
      return;
    }

    await this.contactPage(contactArtwork);
  }

  async contactPage(artwork: PortfolioArtwork | undefined) {
    this.addPage();

    const pageMargin = 54;
    const contentWidth = this.pageWidth() - pageMargin * 2;

    this.document
      .font(this.headingFont())
      .fontSize(16)
      .fillColor(INK)
      .text("KONTAKT", pageMargin, 58, { width: contentWidth });

    this.document
      .moveTo(pageMargin, 82)
      .lineTo(this.pageWidth() - pageMargin, 82)
      .strokeColor(INK)
      .lineWidth(0.8)
      .stroke();

    const profileImage = await fetchFirstImageBuffer([
      this.project.profileImageUrl,
      this.project.coverImageUrl,
      artwork?.imageUrl,
    ]);

    if (profileImage) {
      this.safeImage(
        profileImage,
        pageMargin,
        118,
        150,
        150,
        "Profile picture",
        "cover",
      );
    } else {
      this.placeholder(pageMargin, 118, 150, 150, "PROFILE");
    }

    this.document
      .font(this.headingFont())
      .fontSize(10)
      .fillColor(INK)

      .text(
        (this.project.artistName ?? "IME UMJETNIKA").toUpperCase(),
        pageMargin + 200,
        132,
        { width: 260 },
      );

    let y = 160;
    const x = pageMargin + 200;

    y = this.contactRow(x, y, this.project.email ?? "Nije unesen");
    y = this.contactRow(x, y, this.project.phone ?? "+382 67 262 203");
    y = this.contactRow(
      x,
      y,
      this.project.artboardProfileUrl ?? "artstudio360.me",
    );
    this.contactRow(x, y, this.project.location ?? "Podgorica, Crna Gora");
    // this.contactLine("Lokacija", this.project.location ?? "Crna Gora", 54, 125, "⌖");
    // this.contactLine("Email", this.project.email ?? "Nije unesen", 54, 175, "✉");
    // this.contactLine("Telefon", this.project.phone ?? "Nije unesen", 54, 225, "☎");
    // this.contactLine("Website", this.project.websiteUrl ?? "Nije unesen", 54, 275, "◉");
    // this.contactLine("Instagram", this.project.instagramUrl ?? "Nije unesen", 54, 325, "◎");

    // this.placeholder(this.pageWidth() - 230, 125, 150, 150, "QR KOD");

    // this.document.font(this.headingFont()).fontSize(10).fillColor(INK).text("HVALA", 54, 430);
    // this.paragraph(
    //   "Hvala vam na vremenu i interesovanju za moj rad. Za dodatne informacije, saradnju ili kupovinu radova kontaktirajte me putem navedenih kanala.",
    //   54,
    //   455,
    //   this.pageWidth() - 108,
    //   "",
    //   10,
    //   5,
    // );

    // this.document.font(this.headingFont()).fontSize(10).fillColor(INK).text("O UMJETNIKU", 54, 565);
    // this.paragraph(this.project.biography, 54, 590, this.pageWidth() - 108, "Biografija nije unesena.", 9, 4);

    const thanksY = 310;

    this.document
      .font(this.headingFont())
      .fontSize(11)
      .fillColor(INK)
      .text("ZAHVALNICA", pageMargin, thanksY, { width: contentWidth });

    this.document
      .font(this.bodyFont())
      .fontSize(8.5)
      .fillColor(INK)
      .text(
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        pageMargin,
        thanksY + 26,
        { width: 420, lineGap: 2 },
      );

    const linksY = 375;

    this.document
      .font(this.headingFont())
      .fontSize(11)
      .fillColor(INK)
      .text("PORTFOLIO LINKOVI", pageMargin, linksY, { width: contentWidth });

    const portfolioLinks = [
      "Behance:  behance.net/TEST",
      "Dribbble: dribbble.com/TEST",
      "LinkedIn: linkedin.com/in/TEST",
      `Instagram: ${this.project.instagramUrl ?? "@TEST"}`,
    ];

    let linkY = linksY + 28;

    for (const link of portfolioLinks) {
      this.document
        .font(this.bodyFont())
        .fontSize(7.5)
        .fillColor(INK)
        .text(`- ${link}`, pageMargin, linkY, { width: 360 });

      linkY += 13;
    }

    const qrX = this.pageWidth() - pageMargin - 74;
    const qrY = 375;

    this.document.rect(qrX, qrY, 74, 74).fill("#eeeeee");

    this.document
      .font(this.headingFont())
      .fontSize(8)
      .fillColor(INK)
      .text("QR", qrX, qrY + 30, {
        align: "center",
        width: 74,
      });

    this.document
      .font(this.headingFont())
      .fontSize(6)
      .fillColor(INK)
      .text("ARTBOARD PROFIL", qrX - 10, qrY + 86, {
        align: "center",
        width: 94,
      });

    const bottomImage = await fetchFirstImageBuffer([
      this.project.coverImageUrl,
      artwork?.imageUrl,
    ]);

    const bottomImageY = 540;
    const bottomImageHeight = 160;

    if (bottomImage) {
      this.safeImage(
        bottomImage,
        pageMargin,
        bottomImageY,
        contentWidth,
        bottomImageHeight,
        "RAD",
        "cover",
        "transparent",
      );
    } else {
      this.placeholder(
        pageMargin,
        bottomImageY,
        contentWidth,
        bottomImageHeight,
        "RAD",
      );
    }

    this.footer();
  }


  /**
   * Template 3 / Sales Pro contact page.
   *
   * This page is laid out like a compact sales sheet: direct contact details at
   * the top, link list + QR in the middle, then one wide visual closer. The
   * actual QR generation can be added later; for now the placeholder preserves
   * the final composition while the business flow is still being refined.
   */
  async contactPageSales(artwork: PortfolioArtwork | undefined) {
    this.addPage();

    const left = 44;
    const top = 44;
    const contentWidth = this.pageWidth() - left * 2;

    this.salesSectionTitle("KONTAKT", left, top);

    const profileImage = await fetchFirstImageBuffer([
      this.project.profileImageUrl,
      this.project.coverImageUrl,
      artwork?.imageUrl,
    ]);

    const profileX = left;
    const profileY = top + 34;
    const profileSize = 120;

    if (profileImage) {
      this.document.save();
      this.document
        .roundedRect(profileX, profileY, profileSize, profileSize, 3)
        .clip();
      this.safeImage(
        profileImage,
        profileX,
        profileY,
        profileSize,
        profileSize,
        "PROFILE",
        "cover",
        LIGHT_PANEL,
      );
      this.document.restore();
    } else {
      this.placeholder(profileX, profileY, profileSize, profileSize, "PROFILE");
    }

    const contactX = profileX + profileSize + 44;
    let contactY = profileY + 18;

    this.document
      .font(this.headingFont())
      .fontSize(8)
      .fillColor(INK)
      .text(
        (this.project.artistName ?? "IME UMJETNIKA").toUpperCase(),
        contactX,
        contactY,
        { width: 240 },
      );

    contactY += 26;
    contactY = this.contactRow(
      contactX,
      contactY,
      this.project.email ?? "Nije unesen",
    );
    contactY = this.contactRow(
      contactX,
      contactY,
      this.project.phone ?? "+382 67 262 203",
    );
    contactY = this.contactRow(
      contactX,
      contactY,
      this.project.artboardProfileUrl ??
        this.project.websiteUrl ??
        "artstudio360.me",
    );
    this.contactRow(
      contactX,
      contactY,
      this.project.location ?? "Podgorica, Crna Gora",
    );

    const linksY = profileY + profileSize + 46;

    this.salesSectionTitle("PORTFOLIO LINKOVI", left, linksY, contentWidth);

    const portfolioLinks = [
      `Behance: ${this.project.websiteUrl ?? "behance.net/ivonamedenica"}`,
      `Dribbble: ${this.project.artboardProfileUrl ?? "dribbble.com/ivonamedenica"}`,
      "LinkedIn: linkedin.com/in/ivonamedenica",
      `Instagram: ${this.project.instagramUrl ?? "@ivonamedenica"}`,
    ];

    let linkY = linksY + 28;

    for (const link of portfolioLinks) {
      this.document
        .font(this.bodyFont())
        .fontSize(7)
        .fillColor(INK)
        .text(`- ${link}`, left, linkY, { width: 330 });

      linkY += 12;
    }

    const qrX = this.pageWidth() - left - 78;
    const qrY = linksY + 6;

    this.document.roundedRect(qrX, qrY, 72, 72, 4).fill("#eeeeee");
    this.document
      .font(this.headingFont())
      .fontSize(8)
      .fillColor(INK)
      .text("QR", qrX, qrY + 30, {
        align: "center",
        width: 72,
      });
    this.document
      .font(this.headingFont())
      .fontSize(5.5)
      .fillColor(INK)
      .text("ARTBOARD PROFIL", qrX - 10, qrY + 86, {
        align: "center",
        width: 92,
      });

    const bottomImage = await fetchFirstImageBuffer([
      this.project.collectionCoverUrl,
      this.project.coverImageUrl,
      artwork?.imageUrl,
    ]);

    const bottomImageY = 508;
    const bottomImageH = 198;

    if (bottomImage) {
      this.document.save();
      this.document
        .roundedRect(left, bottomImageY, contentWidth, bottomImageH, 3)
        .clip();
      this.safeImage(
        bottomImage,
        left,
        bottomImageY,
        contentWidth,
        bottomImageH,
        "RAD",
        "cover",
        LIGHT_PANEL,
      );
      this.document.restore();
    } else {
      this.placeholder(left, bottomImageY, contentWidth, bottomImageH, "RAD");
    }

    this.salesPortfolioFooter();
  }

  async contactPageEditorial(artwork: PortfolioArtwork | undefined) {
   this.addPage();

    const pageMargin = 54;
    const contentWidth = this.pageWidth() - pageMargin * 2;

    this.document
      .font(this.headingFont())
      .fontSize(16)
      .fillColor(INK)
      .text("KONTAKT", pageMargin + 8, 58, { width: contentWidth });

    this.document.circle(pageMargin , 66.5, 4).fill(BRAND_YELLOW);

    const profileImage = await fetchFirstImageBuffer([
      this.project.profileImageUrl,
      this.project.coverImageUrl, 
      artwork?.imageUrl,
    ]);

    if (profileImage) {
      this.document.save();
      this.document.roundedRect(pageMargin, 118, 150, 150, 10).clip();
      this.safeImage(
        profileImage,
        pageMargin,
        118,
        150,
        150,
        "Profile picture",
        "cover",
      );
      this.document.restore();
    } else {
      this.placeholder(pageMargin, 118, 150, 150, "PROFILE");
    }

    this.document
      .font(this.headingFont())
      .fontSize(10)
      .fillColor(INK)

      .text(
        (this.project.artistName ?? "IME UMJETNIKA").toUpperCase(),
        pageMargin + 200,
        132,
        { width: 260 },
      );

    let y = 160;
    const x = pageMargin + 200;

    y = this.contactRow(x, y, this.project.email ?? "Nije unesen");
    y = this.contactRow(x, y, this.project.phone ?? "+382 67 262 203");
    y = this.contactRow(
      x,
      y,
      this.project.artboardProfileUrl ?? "artstudio360.me",
    );
    this.contactRow(x, y, this.project.location ?? "Podgorica, Crna Gora");
    const thanksY = 310;

    this.document
      .font(this.headingFont())
      .fontSize(11)
      .fillColor(INK)
      .text("ZAHVALNICA", pageMargin, thanksY, { width: contentWidth });

    this.document
      .font(this.bodyFont())
      .fontSize(8.5)
      .fillColor(INK)
      .text(
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        pageMargin,
        thanksY + 26,
        { width: 420, lineGap: 2 },
      );

    const linksY = 375;

    this.document
      .font(this.headingFont())
      .fontSize(11)
      .fillColor(INK)
      .text("PORTFOLIO LINKOVI", pageMargin, linksY, { width: contentWidth });

    const portfolioLinks = [
      "Behance:  behance.net/TEST",
      "Dribbble: dribbble.com/TEST",
      "LinkedIn: linkedin.com/in/TEST",
      `Instagram: ${this.project.instagramUrl ?? "@TEST"}`,
    ];

    let linkY = linksY + 28;

    for (const link of portfolioLinks) {
      this.document
        .font(this.bodyFont())
        .fontSize(7.5)
        .fillColor(INK)
        .text(`- ${link}`, pageMargin, linkY, { width: 360 });

      linkY += 13;
    }

    const qrX = this.pageWidth() - pageMargin - 74;
    const qrY = 375;

    this.document.rect(qrX, qrY, 74, 74).fill("#eeeeee");

    this.document
      .font(this.headingFont())
      .fontSize(8)
      .fillColor(INK)
      .text("QR", qrX, qrY + 30, {
        align: "center",
        width: 74,
      });

    this.document
      .font(this.headingFont())
      .fontSize(6)
      .fillColor(INK)
      .text("ARTBOARD PROFIL", qrX - 10, qrY + 86, {
        align: "center",
        width: 94,
      });

    const bottomImage = await fetchFirstImageBuffer([
      this.project.coverImageUrl,
      artwork?.imageUrl,
    ]);

    const bottomImageY = 540;
    const bottomImageHeight = 160;

    if (bottomImage) {
      this.safeImage(
        bottomImage,
        pageMargin,
        bottomImageY,
        contentWidth,
        bottomImageHeight,
        "RAD",
        "cover",
        "transparent",
      );
    } else {
      this.placeholder(
        pageMargin,
        bottomImageY,
        contentWidth,
        bottomImageHeight,
        "RAD",
      );
    }

    this.footer();
  }

  private contactRow(iconX: number, y: number, value: string) {
    const iconSize = 10;
    const textX = iconX + 18;

    this.infoIcon(iconX, y + 1, iconSize);

    this.document
      .font(this.bodyFont())
      .fontSize(7)
      .fillColor(INK)
      .text(value, textX, y + 1, {
        width: 260,
      });

    return y + 18;
  }
  private infoIcon(x: number, y: number, size = 11) {
    const centerX = x + size / 2;
    const centerY = y + size / 2;

    this.document.circle(centerX, centerY, size / 2).fill("#000000");
    this.document.circle(centerX, y + size * 0.32, size * 0.08).fill("#ffffff");
    this.document
      .roundedRect(
        centerX - size * 0.055,
        y + size * 0.44,
        size * 0.11,
        size * 0.3,
        size * 0.04,
      )
      .fill("#ffffff");
  }

  private cvPage(
    title: string,
    blocks: CvBlock[],
    variant: "first" | "second",
  ) {
    this.addPage();
    this.sectionTitle(title);

    const columns =
      variant === "first"
        ? [
            { x: 54, y: 115, width: 230 },
            { x: 318, y: 115, width: 220 },
          ]
        : [
            { x: 54, y: 115, width: 220 },
            { x: 308, y: 115, width: 230 },
          ];

    let columnIndex = 0;
    const firstColumn = columns[0]!;
    let activeColumn = columns[columnIndex] ?? firstColumn;
    let y = activeColumn.y;

    for (const block of blocks) {
      if (y > this.pageHeight() - 170) {
        columnIndex = Math.min(columnIndex + 1, columns.length - 1);
        activeColumn = columns[columnIndex] ?? firstColumn;
        y = activeColumn.y;
      }

      y = this.cvBlock(block, activeColumn.x, y, activeColumn.width);
      y += 20;
    }

    this.footer();
  }

  private cvBlock(block: CvBlock, x: number, y: number, width: number) {
    this.document
      .font(this.headingFont())
      .fontSize(8.5)
      .fillColor(INK)
      .text(block.title.toUpperCase(), x, y, {
        width,
      });
    this.document
      .moveTo(x, y + 15)
      .lineTo(x + width, y + 15)
      .strokeColor(LINE)
      .lineWidth(0.6)
      .stroke();

    let nextY = y + 27;
    for (const item of block.items.slice(0, 8)) {
      this.document
        .font(this.bodyFont())
        .fontSize(8)
        .fillColor(INK)
        .text(`• ${item}`, x + 10, nextY, {
          lineGap: 2.5,
          width: width - 10,
        });
      nextY += Math.max(
        20,
        this.document.heightOfString(`• ${item}`, { width: width - 10 }) + 8,
      );
    }

    return nextY;
  }

  private addPage() {
    this.document.addPage();
    this.pageNumber += 1;
    this.document.rect(0, 0, this.pageWidth(), this.pageHeight()).fill(PAPER);

    /**
     * Global template accent.
     *
     * Institutional stays intentionally clean. Editorial and Sales currently
     * share the real institutional layout, but this small page-level accent
     * makes it obvious that template selection is wired correctly. When their
     * final designs are ready, these can become full custom page methods.
     */
    // if (this.template.visualTone === "editorial") {
    //   this.document.rect(0, 0, this.pageWidth(), 6).fill(BRAND_BLUE);
    // }

  
  }

  private pageWidth() {
    return this.document.page.width;
  }

  private pageHeight() {
    return this.document.page.height;
  }

  /**
   * Shared gradient for Template 3 / Sales Pro.
   *
   * We keep this in one helper because the same visual identity should be used
   * consistently on the border, important headings, and later sales-specific
   * labels. PDFKit returns a paint object, so every call creates a fresh
   * gradient for the current page.
   */
  private salesTemplateGradient() {
    return this.document
      .linearGradient(0, 0, this.pageWidth(), this.pageHeight())
      .stop(0, BRAND_YELLOW)
      .stop(0.48, BRAND_RED)
      .stop(1, BRAND_BLUE);
  }

  /**
   * Circular gradient for short Sales template headings.
   *
   * A full-page linear gradient can look almost flat on tiny text because the
   * text samples only a small part of the page-wide gradient. This local radial
   * gradient is centered near the heading so yellow/red/blue are all visible
   * inside the same word.
   */
  private salesTitleGradient(x: number, y: number) {
    return this.document
      .radialGradient(x, y, 0, x, y, 150)
      .stop(0, BRAND_YELLOW)
      .stop(0.48, BRAND_RED)
      .stop(1, BRAND_BLUE);
  }

  /**
   * One shared title style for every main section in Template 3 / Sales Pro.
   *
   * Keeping this in one method prevents tiny visual drift between pages. If we
   * decide the Sales template titles should be smaller/larger later, this is
   * the only place that needs to change.
   */
  private salesSectionTitle(label: string, x: number, y: number, width?: number) {
    this.document
      .font(this.headingFont())
      .fontSize(16)
      .fillColor(this.salesTitleGradient(x, y))
      .text(label, x, y, {
        width,
      });
  }

  private headingFont() {
    return this.project.fontStyle === "SERIF"
      ? FONT_SERIF_BOLD
      : FONT_SANS_BOLD;
  }

  private bodyFont() {
    return this.project.fontStyle === "SERIF"
      ? FONT_SERIF_REGULAR
      : FONT_SANS_REGULAR;
  }

  private sectionTitle(title: string) {
    this.document
      .font(this.headingFont())
      .fontSize(15)
      .fillColor(INK)
      .text(title, 54, 56);
    this.document
      .moveTo(54, 84)
      .lineTo(this.pageWidth() - 54, 84)
      .strokeColor(this.template.accentColor)
      .lineWidth(0.8)
      .stroke();
  }
  private sectionTitleEditorial(title: string) {
    this.document
      .font(this.headingFont())
      .fontSize(15)
      .fillColor(INK)
      .text(title, 70, 56);

      this.document.circle(54, 64, 4).fill(BRAND_BLUE);
    
   
  }

  /**
   * Small template-specific mark on the cover.
   *
   * The final version of each template can eventually replace the whole cover
   * method. For now this gives us a safe visual proof that the selected template
   * is actually affecting the generated PDF.
   */
  private templateCoverAccent() {
    if (this.template.visualTone === "institutional") {
      return;
    }

    if (this.template.visualTone === "editorial") {
      // this.document
      //   .rect(0, 0, this.pageWidth(), 16)
      //   .fill(BRAND_BLUE);

      // this.document
      //   .font(this.headingFont())
      //   .fontSize(8)
      //   .fillColor("#ffffff")
      //   .text("MOJ ARTBOARD EDITORIAL TEMPLATE", 54, 5, {
      //     characterSpacing: 1.8,
      //     width: this.pageWidth() - 108,
      //   });

      return;
    }

    this.document
      .roundedRect(this.pageWidth() - 206, 28, 152, 32, 16)
      .fill(BRAND_YELLOW);

    this.document
      .font(this.headingFont())
      .fontSize(8)
      .fillColor(INK)
      .text("SALES / COLLECTOR PDF", this.pageWidth() - 190, 39, {
        characterSpacing: 1.1,
        width: 120,
      });
  }

  private textSection(
    title: string,
    value: string | null,
    x: number,
    y: number,
    width: number,
    height: number,
    options: { fallback: string },
  ) {
    this.document
      .font(this.headingFont())
      .fontSize(8.5)
      .fillColor(INK)
      .text(title.toUpperCase(), x, y, {
        width,
      });
    this.paragraph(
      value,
      x,
      y + 24,
      width,
      options.fallback,
      9,
      4,
      height - 24,
    );
  }

  private paragraph(
    value: string | null,
    x: number,
    y: number,
    width: number,
    fallback: string,
    fontSize = 9,
    lineGap = 4,
    height?: number,
  ) {
    this.document
      .font(this.bodyFont())
      .fontSize(fontSize)
      .fillColor(INK)
      .text(value?.trim() || fallback, x, y, {
        height,
        lineGap,
        width,
      });
  }

  private iconInfoLine(
    label: string,
    value: string,
    x: number,
    y: number,
    icon: string,
  ) {
    this.document
      .font(this.bodyFont())
      .fontSize(11)
      .fillColor(INK)
      .text(icon, x, y);
    this.document
      .font(this.headingFont())
      .fontSize(7)
      .fillColor(MUTED)
      .text(label.toUpperCase(), x + 18, y - 1);
    this.document
      .font(this.bodyFont())
      .fontSize(9)
      .fillColor(INK)
      .text(value, x + 18, y + 11, {
        width: 250,
      });
  }

  private compactInfoSection(
    label: string,
    values: string[],
    x: number,
    y: number,
  ) {
    this.document
      .font(this.headingFont())
      .fontSize(7.5)
      .fillColor(INK)
      .text(label.toUpperCase(), x + 24, y);
    for (const [index, item] of values.entries()) {
      this.document
        .font(this.bodyFont())
        .fontSize(8)
        .fillColor(INK)
        .text(item, x + 24, y + 16 * (index + 1), {
          lineGap: 2,
          width: 200,
        });
    }
  }

  private compactInfo(
    label: string,
    value: string,
    x: number,
    y: number,
    icon: string,
  ) {
    this.document
      .font(this.bodyFont())
      .fontSize(13)
      .fillColor(INK)
      .text(icon, x, y + 5);
    this.document
      .font(this.headingFont())
      .fontSize(7.5)
      .fillColor(INK)
      .text(label.toUpperCase(), x + 24, y);
    this.document
      .font(this.bodyFont())
      .fontSize(8)
      .fillColor(INK)
      .text(value, x + 24, y + 16, {
        lineGap: 2,
        width: 145,
      });
  }

  private metaLine(label: string, value: string, x: number, y: number) {
    this.document
      .font(this.headingFont())
      .fontSize(7.5)
      .fillColor(INK)
      .text(label, x, y);
    this.document
      .font(this.bodyFont())
      .fontSize(8.5)
      .fillColor(INK)
      .text(value, x, y + 15, {
        lineGap: 2,
        width: 145,
      });
    this.document
      .moveTo(x, y + 44)
      .lineTo(x + 140, y + 44)
      .strokeColor(LINE)
      .lineWidth(0.6)
      .stroke();
  }

  private linkLine(
    label: string,
    value: string | null,
    x: number,
    y: number,
    icon: string,
  ) {
    this.document
      .font(this.bodyFont())
      .fontSize(11)
      .fillColor(INK)
      .text(icon, x, y - 1);
    this.document
      .font(this.headingFont())
      .fontSize(8)
      .fillColor(INK)
      .text(label.toUpperCase(), x + 24, y);
    this.document
      .font(this.bodyFont())
      .fontSize(8.5)
      .fillColor(INK)
      .text(value ?? "Nije uneseno", x + 112, y, {
        width: this.pageWidth() - x - 166,
      });
  }

  private contactLine(
    label: string,
    value: string,
    x: number,
    y: number,
    icon: string,
  ) {
    this.document
      .font(this.bodyFont())
      .fontSize(13)
      .fillColor(INK)
      .text(icon, x, y);
    this.document
      .font(this.headingFont())
      .fontSize(7.5)
      .fillColor(MUTED)
      .text(label.toUpperCase(), x + 28, y - 1);
    this.document
      .font(this.bodyFont())
      .fontSize(9)
      .fillColor(INK)
      .text(value, x + 28, y + 16, {
        width: 300,
      });
  }

  private circularImageOrPlaceholder(
    image: Buffer | null,
    x: number,
    y: number,
    size: number,
    label: string,
  ) {
    if (!image) {
      this.placeholder(x, y, size, size, label);
      return;
    }

    let clipped = false;

    try {
      this.document
        .circle(x + size / 2, y + size / 2, size / 2)
        .fill(LIGHT_PANEL);

      this.document.save();
      clipped = true;

      this.document.circle(x + size / 2, y + size / 2, size / 2).clip();

      this.document.image(image, x, y, {
        cover: [size, size],
        align: "center",
        valign: "center",
      });

      this.document.restore();
      clipped = false;

      this.document
        .circle(x + size / 2, y + size / 2, size / 2)
        .lineWidth(0.8)
        .strokeColor(LINE)
        .stroke();
    } catch (error) {
      if (clipped) {
        this.document.restore();
      }

      this.placeholder(x, y, size, size, label);
    }
  }

  private safeImage(
    image: Buffer,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    mode: "contain" | "cover",
    panelBackgroudColor = LIGHT_PANEL,
  ) {
    this.document.save();
    this.document.rect(x, y, width, height).fill(panelBackgroudColor);
    this.document.restore();

    try {
      if (mode === "cover") {
        this.document.image(image, x, y, {
          cover: [width, height],
          align: "center",
          valign: "center",
        });
      } else {
        this.document.image(image, x, y, {
          fit: [width, height],
          align: "center",
          valign: "center",
        });
      }
    } catch (error) {
      console.error(`Failed to render image for ${label}`, error);
      this.placeholder(x, y, width, height, label);
    }
  }

  private placeholder(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
  ) {
    this.document.rect(x, y, width, height).fill("#eeeeee");
    this.document
      .font(this.headingFont())
      .fontSize(10)
      .fillColor(SOFT_MUTED)
      .text(label, x, y + height / 2 - 12, {
        align: "center",
        width,
      });
  }

  private footerForCover() {
    this.previewWatermark();

    const y = this.pageHeight() - 250;
    this.document
      .moveTo(54, y - 16)
      .lineTo(this.pageWidth() - 54, y - 16)
      .strokeColor(this.designConfig.footer.accentColor)
      .lineWidth(1)
      .stroke();
    this.document
      .font(this.headingFont())
      .fontSize(9)
      .fillColor(INK)
      .text("Podgorica, 2026", 54, y - 30);

    const coverFooterLabel = this.coverFooterLabel();
    const widthOfPortfiolioText = this.document
      .font(this.headingFont())
      .fontSize(9)
      .widthOfString(coverFooterLabel);

    this.document
      .font(this.headingFont())
      .fontSize(9)
      .fillColor(INK)
      .text(
        coverFooterLabel,
        this.pageWidth() - 54 - widthOfPortfiolioText,
        y - 30,
      );

    if (this.project.includeBranding) {
      this.document.circle(this.pageWidth() - 78, y - 7, 4).fill(BRAND_BLUE);
      this.document.circle(this.pageWidth() - 68, y - 7, 4).fill(BRAND_RED);
      this.document.circle(this.pageWidth() - 58, y - 7, 4).fill(BRAND_YELLOW);
    }
  }

  private footer() {
    this.previewWatermark();

    const y = this.pageHeight() - 50;
    if(this.designConfig.footer.visualTone==="institutional"){
      this.document
        .moveTo(54, y - 16)
        .lineTo(this.pageWidth() - 54, y - 16)
        .strokeColor(this.designConfig.footer.accentColor)
        .lineWidth(0.6)
        .stroke();

    }
    this.document
      .font(this.headingFont())
      .fontSize(9)
      .fillColor(INK)
      .text(this.project.artistName.toLocaleUpperCase(), 54, y - 10);
    this.document
      .font(this.headingFont())
      .fontSize(9)
      .fillColor(INK)
      .text(this.footerLabel(), this.pageWidth() - 135, y - 10, {
        align: "right",
        width: 81,
      });

    if (this.project.includeBranding) {
      this.document.circle(this.pageWidth() - 138, y - 5, 4).fill(BRAND_BLUE);
      this.document.circle(this.pageWidth() - 128, y - 5, 4).fill(BRAND_RED);
      this.document.circle(this.pageWidth() - 118, y - 5, 4).fill(BRAND_YELLOW);
    }
  }

  /**
   * Sales Pro footer used on pages that should keep the clean ArtBoard
   * portfolio identity instead of the default "SALES" footer label.
   */
  private salesPortfolioFooter() {
    this.previewWatermark();

    const y = this.pageHeight() - 48;

    this.document
      .font(this.headingFont())
      .fontSize(7)
      .fillColor(INK)
      .text(this.project.artistName.toLocaleUpperCase(), 44, y);

    if (this.project.includeBranding) {
      this.document.circle(this.pageWidth() - 121, y + 4, 4).fill(BRAND_BLUE);
      this.document.circle(this.pageWidth() - 111, y + 4, 4).fill(BRAND_RED);
      this.document.circle(this.pageWidth() - 101, y + 4, 4).fill(BRAND_YELLOW);
    }

    this.document
      .font(this.headingFont())
      .fontSize(7)
      .fillColor(INK)
      .text("PORTFOLIO", this.pageWidth() - 92, y, {
        width: 48,
        align: "right",
      });
  }

  /**
   * The cover footer has a bit more room, so each dummy template can identify
   * itself without changing the whole page layout.
   */
  private coverFooterLabel() {
    if (this.designConfig.footer.visualTone === "editorial") {
      return "Editorial";
    }

    if (this.designConfig.footer.visualTone === "sales") {
      return "Sales";
    }

    return "Portfolio";
  }

  /**
   * Compact footer label used on inner pages. The footer is one of the safest
   * places to differentiate templates while the page body layouts are still
   * being designed.
   */
  private footerLabel() {
    if (this.designConfig.footer.visualTone === "editorial") {
      return "EDITORIAL";
    }

    if (this.designConfig.footer.visualTone === "sales") {
      return "SALES";
    }

    return "PORTFOLIO";
  }

  private previewWatermark() {
    if (!this.options.watermark) {
      return;
    }

    const centerX = this.pageWidth() / 2;
    const centerY = this.pageHeight() / 2;

    this.document.save();
    this.document
      .font(this.headingFont())
      .fontSize(66)
      .fillColor(BRAND_BLUE)
      .opacity(0.12);
    this.document.rotate(-18, {
      origin: [centerX, centerY],
    });
    this.document.text("ARTBOARD PREVIEW", centerX - 310, centerY - 44, {
      align: "center",
      width: 620,
    });
    this.document.restore();
  }

  private safeCvBlocks() {
    const blocks = getCvBlocks(this.project.cvSections);

    if (blocks.length > 0) {
      return blocks;
    }

    return [
      {
        title: "Obrazovanje",
        items: [
          "Dodajte obrazovanje, radionice ili relevantne programe u Portfolio Builderu.",
        ],
      },
      {
        title: "Radno iskustvo",
        items: [
          "Dodajte relevantno radno iskustvo, saradnje i profesionalne aktivnosti.",
        ],
      },
      {
        title: "Vjestine",
        items: [
          "Dodajte tehnike, alate i oblasti rada koje su vazne za portfolio.",
        ],
      },
      {
        title: "Publikacije",
        items: [
          "Dodajte publikacije, intervjue, kataloge ili medijske objave.",
        ],
      },
      {
        title: "Samostalne izlozbe",
        items: ["Dodajte samostalne izlozbe sa godinom i lokacijom."],
      },
      {
        title: "Grupne izlozbe",
        items: ["Dodajte grupne izlozbe, festivale, rezidencije ili projekte."],
      },
      {
        title: "Nagrade",
        items: ["Dodajte nagrade, priznanja, stipendije ili selekcije."],
      },
      {
        title: "Kolekcije",
        items: [
          "Dodajte javne i privatne kolekcije u kojima se nalaze radovi.",
        ],
      },
    ];
  }
}

async function fetchImageBuffer(url: string | null | undefined) {
  if (!url) {
    return null;
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    const originalBuffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") ?? "unknown";

    console.log(
      `[pdf] fetched image ${url.slice(0, 120)} (${contentType}, ${originalBuffer.length} bytes)`,
    );

    return normalizeImageForPdf(originalBuffer, contentType, url);
  } catch (error) {
    console.error(`[pdf] failed to fetch image ${url.slice(0, 120)}`, error);
    return null;
  }
}

async function normalizeImageForPdf(
  buffer: Buffer,
  contentType: string,
  url: string,
) {
  if (
    contentType.includes("jpeg") ||
    contentType.includes("jpg") ||
    contentType.includes("png")
  ) {
    return buffer;
  }

  try {
    const converted = await sharp(buffer)
      .rotate()
      .jpeg({
        quality: 90,
      })
      .toBuffer();

    console.log(
      `[pdf] converted image for PDF ${url.slice(0, 120)} (${buffer.length} -> ${converted.length} bytes)`,
    );

    return converted;
  } catch (error) {
    console.error(
      `[pdf] could not convert image for PDF ${url.slice(0, 120)}`,
      error,
    );
    return null;
  }
}

async function fetchFirstImageBuffer(urls: Array<string | null | undefined>) {
  for (const url of urls) {
    const image = await fetchImageBuffer(url);

    if (image) {
      return image;
    }
  }

  return null;
}

function getCvBlocks(cvSections: unknown): CvBlock[] {
  if (!cvSections) {
    return [];
  }

  if (Array.isArray(cvSections)) {
    return cvSections
      .map((section) => {
        if (typeof section === "string") {
          return {
            title: "CV",
            items: [section],
          };
        }

        if (typeof section === "object" && section !== null) {
          const candidate = section as {
            entries?: unknown;
            items?: unknown;
            label?: unknown;
            title?: unknown;
          };
          const title = String(candidate.title ?? candidate.label ?? "CV");
          const rawItems = Array.isArray(candidate.items)
            ? candidate.items
            : Array.isArray(candidate.entries)
              ? candidate.entries
              : [];

          return {
            title,
            items: rawItems.map(String).filter(Boolean),
          };
        }

        return null;
      })
      .filter((section): section is CvBlock => Boolean(section));
  }

  if (typeof cvSections === "object") {
    return Object.entries(cvSections as Record<string, unknown>).map(
      ([title, rawValue]) => ({
        title,
        items: Array.isArray(rawValue)
          ? rawValue.map(String).filter(Boolean)
          : [String(rawValue)],
      }),
    );
  }

  return [];
}

function toStackedUpperName(name: string) {
  const parts = name.trim().split(/\s+/);

  if (parts.length <= 2) {
    return parts.join("\n").toUpperCase();
  }

  return `${parts.slice(0, -1).join(" ")}\n${parts.at(-1)}`.toUpperCase();
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("sr-Latn-ME", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatAvailability(value: PortfolioArtwork["availability"]) {
  if (value === "AVAILABLE") {
    return "Dostupno";
  }

  if (value === "SOLD") {
    return "Prodato";
  }

  if (value === "NOT_FOR_SALE") {
    return "Nije za prodaju";
  }

  return "Nepoznato";
}

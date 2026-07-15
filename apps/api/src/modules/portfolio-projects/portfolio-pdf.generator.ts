import PDFDocument from "pdfkit";
import sharp from "sharp";

import type {
  PortfolioArtwork,
  PortfolioFontStyle,
  PortfolioProject,
} from "@prisma/client";

type PortfolioProjectForPdf = PortfolioProject & {
  artworks: PortfolioArtwork[];
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
  const document = createPortfolioDocument(project);
  const chunks: Buffer[] = [];
  document.on("data", (chunk: Buffer) => chunks.push(chunk));

  const selectedArtworks = project.artworks
    .filter((artwork) => artwork.isSelected)
    .sort((first, second) => first.orderIndex - second.orderIndex)
    .slice(0, 30);

  const context = new InstitutionalTemplateContext(document, project);

  await context.coverPage(selectedArtworks[0]);
  context.profilePage();
  await context.collectionPage(selectedArtworks);

  for (const [index, artwork] of selectedArtworks.entries()) {
    await context.artworkDetailPage(artwork, index + 1);
  }

  context.cvPages();
  context.contactPage();

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
  const document = createPortfolioDocument(project);
  const chunks: Buffer[] = [];
  document.on("data", (chunk: Buffer) => chunks.push(chunk));

  const selectedArtworks = project.artworks
    .filter((artwork) => artwork.isSelected)
    .sort((first, second) => first.orderIndex - second.orderIndex);

  const context = new InstitutionalTemplateContext(document, project, options);
  await context.coverPage(selectedArtworks[0]);

  await context.profilePage();

  await context.collectionPageTest(selectedArtworks[0]);

  for (const selectedArtwork of selectedArtworks) {
    await context.artworkPageTest(selectedArtwork);
  }

  await context.contactPageTest(selectedArtworks[0]);

  const finished = new Promise<void>((resolve, reject) => {
    document.on("end", resolve);
    document.on("error", reject);
  });

  document.end();
  await finished;

  return Buffer.concat(chunks);
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

class InstitutionalTemplateContext {
  private pageNumber = 0;

  constructor(
    private readonly document: PDFKit.PDFDocument,
    private readonly project: PortfolioProjectForPdf,
    private readonly options: PortfolioPdfGenerationOptions = {},
  ) {}

  async coverPage(featuredArtwork: PortfolioArtwork | undefined) {
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

  async collectionPage(artworks: PortfolioArtwork[]) {
    this.addPage();
    this.sectionTitle("KOLEKCIJA");
    this.document
      .moveTo(54, 50)
      .lineTo(this.pageWidth() - 54, 50)
      .strokeColor(INK)
      .lineWidth(0.8)
      .stroke();

    this.document
      .font(this.bodyFont())
      .fontSize(10)
      .fillColor(MUTED)
      .text(
        this.project.collectionDescription ||
          "Pregled radova odabranih za ovaj portfolio. Redosljed prati izbor umjetnika u Portfolio Builderu.",
        54,
        105,
        {
          lineGap: 4,
          width: 410,
        },
      );

    const imageW = 150;
    const imageH = 120;
    const gapX = 18;
    const gapY = 64;
    const startY = 165;

    for (const [index, artwork] of artworks.slice(0, 12).entries()) {
      const column = index % 3;
      const row = Math.floor(index / 3);
      const x = 54 + column * (imageW + gapX);
      const y = startY + row * (imageH + gapY);
      const image = await fetchImageBuffer(artwork.imageUrl);

      if (image) {
        this.safeImage(
          image,
          x,
          y,
          imageW,
          imageH,
          artwork.title ?? "Rad",
          "contain",
        );
      } else {
        this.placeholder(x, y, imageW, imageH, "RAD");
      }

      this.document
        .font(this.headingFont())
        .fontSize(8.5)
        .fillColor(INK)
        .text(
          `${String(index + 1).padStart(2, "0")}  ${artwork.title ?? "Bez naziva"}`,
          x,
          y + imageH + 11,
          {
            width: imageW,
          },
        );

      this.document
        .font(this.bodyFont())
        .fontSize(7.5)
        .fillColor(MUTED)
        .text(
          [artwork.year, artwork.technique].filter(Boolean).join(" / ") ||
            "Detalji nisu uneseni",
          x,
          y + imageH + 25,
          {
            width: imageW,
          },
        );
    }

    if (artworks.length > 12) {
      this.document
        .font(this.bodyFont())
        .fontSize(9)
        .fillColor(MUTED)
        .text(
          `+ ${artworks.length - 12} radova prikazano je detaljno na narednim stranicama.`,
          54,
          735,
          {
            width: 400,
          },
        );
    }

    this.footer();
  }

  async collectionPageTest(artwork: PortfolioArtwork | undefined) {
    this.addPage();
    this.sectionTitle("KOLEKCIJA");
    // this.document.moveTo(54 ,  50).lineTo((this.pageWidth()-54) , 50 ).strokeColor(INK).lineWidth(0.8).stroke();

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
    const collectionName = this.project.collectionName ?? artwork?.collectionName ?? "NAZIV KOLEKCIJE";
    const collectionYear = this.project.collectionYear ?? artwork?.year ?? "GODINA";
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
      .text(
        collectionDescription,
        x,
        y,
        {
          width: textWidth,
          lineGap: 2,
        },
      );

    this.footer();
  }

  async artworkPageTest(artwork: PortfolioArtwork | undefined) {
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
  async artworkDetailPage(artwork: PortfolioArtwork, displayIndex: number) {
    this.addPage();
    this.sectionTitle("DETALJ RADA");

    const image = await fetchImageBuffer(artwork.imageUrl);
    if (image) {
      this.safeImage(
        image,
        54,
        116,
        315,
        380,
        artwork.title ?? "Rad",
        "contain",
      );
    } else {
      this.placeholder(54, 116, 315, 380, "SLIKA RADA");
    }

    const detailX = 405;
    this.metaLine(
      "BROJ RADA",
      String(displayIndex).padStart(2, "0"),
      detailX,
      116,
    );
    this.metaLine("NAZIV RADA", artwork.title ?? "Bez naziva", detailX, 165);
    this.metaLine(
      "KOLEKCIJA / SERIJA",
      artwork.collectionName ?? "Nije uneseno",
      detailX,
      220,
    );
    this.metaLine("GODINA", artwork.year ?? "Nije unesena", detailX, 275);
    this.metaLine(
      "TEHNIKA / DISCIPLINA",
      artwork.technique ?? "Nije unesena",
      detailX,
      330,
    );
    this.metaLine(
      "DIMENZIJE",
      artwork.dimensions ?? "Nije uneseno",
      detailX,
      385,
    );

    if (this.project.includePrices) {
      this.metaLine(
        "STATUS / CIJENA",
        `${formatAvailability(artwork.availability)}${artwork.price ? ` / ${artwork.price}` : ""}`,
        detailX,
        440,
      );
    }

    this.textSection(
      "OPIS RADA",
      artwork.description,
      54,
      540,
      this.pageWidth() - 108,
      120,
      {
        fallback: "Opis rada nije unesen.",
      },
    );

    this.footer();
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

  contactPage() {
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

  async contactPageTest(artwork: PortfolioArtwork | undefined) {
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
    y = this.contactRow(x, y, this.project.artboardProfileUrl ?? "artstudio360.me");
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

    const bottomImage =await fetchFirstImageBuffer([
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
        'transparent'
      );
    } else {
      this.placeholder(pageMargin, bottomImageY, contentWidth, bottomImageHeight, "RAD");
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
        size * 0.30,
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
  }

  private pageWidth() {
    return this.document.page.width;
  }

  private pageHeight() {
    return this.document.page.height;
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
      .strokeColor(INK)
      .lineWidth(0.8)
      .stroke();
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
    panelBackgroudColor = LIGHT_PANEL
  ) {
    this.document.save();
    this.document.rect(x, y, width, height).fill(LIGHT_PANEL);
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
      .strokeColor(INK)
      .lineWidth(1)
      .stroke();
    this.document
      .font(this.headingFont())
      .fontSize(9)
      .fillColor(INK)
      .text("Podgorica, 2026", 54, y - 30);

    const widthOfPortfiolioText = this.document
      .font(this.headingFont())
      .fontSize(9)
      .widthOfString("Portfolio");

    this.document
      .font(this.headingFont())
      .fontSize(9)
      .fillColor(INK)
      .text("Portfolio", this.pageWidth() - 54 - widthOfPortfiolioText, y - 30);

    if (this.project.includeBranding) {
      this.document.circle(this.pageWidth() - 78, y - 7, 4).fill(BRAND_BLUE);
      this.document.circle(this.pageWidth() - 68, y - 7, 4).fill(BRAND_RED);
      this.document.circle(this.pageWidth() - 58, y - 7, 4).fill(BRAND_YELLOW);
    }
  }

  private footer() {
    this.previewWatermark();

    const y = this.pageHeight() - 50;
    this.document
      .moveTo(54, y - 16)
      .lineTo(this.pageWidth() - 54, y - 16)
      .strokeColor(INK)
      .lineWidth(0.6)
      .stroke();
    this.document
      .font(this.headingFont())
      .fontSize(9)
      .fillColor(INK)
      .text(this.project.artistName.toLocaleUpperCase(), 54, y - 10);
    this.document
      .font(this.headingFont())
      .fontSize(9)
      .fillColor(INK)
      .text("PORTFOLIO", this.pageWidth() - 110, y - 10);

    if (this.project.includeBranding) {
      this.document.circle(this.pageWidth() - 138, y - 5, 4).fill(BRAND_BLUE);
      this.document.circle(this.pageWidth() - 128, y - 5, 4).fill(BRAND_RED);
      this.document.circle(this.pageWidth() - 118, y - 5, 4).fill(BRAND_YELLOW);
    }
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

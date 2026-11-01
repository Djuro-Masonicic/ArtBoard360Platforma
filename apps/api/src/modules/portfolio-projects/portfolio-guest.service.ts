import { BadRequestException, Injectable } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import sharp from "sharp";
import { buildPortfolioDocumentPlan, parseDocumentSelection, parsePortfolioCv, parseMinimalDesign } from "@artboard/portfolio-document-plan";
import { UpdatePortfolioArtworkDto, UpdatePortfolioProjectDto } from "./portfolio-projects.dto";
import { frozenPortfolio } from "./portfolio-commerce.service";
import { generatePortfolioPdf } from "./portfolio-pdf.generator";

@Injectable()
export class PortfolioGuestService {
  // Both transient preview and checkout use this same bounded, allowlisted
  // contract. URLs from the network are never accepted for anonymous rendering.
  async snapshot(document: string, files: Express.Multer.File[]) {
    let input: any;
    try { input = JSON.parse(document); } catch { throw new BadRequestException("Neispravan sadržaj portfolija."); }
    if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some(key => !["project", "artworks"].includes(key))) throw new BadRequestException("Nepoznata polja portfolija.");
    if (!input.project || typeof input.project !== "object" || Array.isArray(input.project)) throw new BadRequestException("Podaci portfolija nijesu ispravni.");
    const dto = plainToInstance(UpdatePortfolioProjectDto, input.project);
    if (!dto || (await validate(dto, { whitelist: true, forbidNonWhitelisted: true })).length) throw new BadRequestException("Podaci portfolija nijesu ispravni.");
    if (!dto.artistName?.trim() || !dto.email) throw new BadRequestException("Ime i email su obavezni.");
    if (JSON.stringify(input.project).length > 100_000 || !Array.isArray(input.artworks) || input.artworks.length > 30 || files.length > 33) throw new BadRequestException("Portfolio prelazi dozvoljenu veličinu.");
    if (dto.designConfig && dto.designConfig.mode !== "PRESET") throw new BadRequestException("Guest koristi jedan postojeći PDF stil.");
    const images = await this.normalizeImages(files);
    const image = (value?: string) => {
      if (!value) return null;
      const result = images.get(value); if (!result) throw new BadRequestException("Slika mora biti priložena uz ovaj zahtjev."); return result;
    };
    const now = new Date(), id = "guest-document";
    const project: any = { ...dto, id, revision: 0, source: "GUEST", artistAccountId: null, collectionSchemaVersion: 1,
      template: dto.template ?? "INSTITUTIONAL_MINIMAL", language: dto.language ?? "ME", pageFormat: dto.pageFormat ?? "A4", fontStyle: dto.fontStyle ?? "SANS",
      includeBranding: true, includeCv: dto.includeCv ?? false, includePrices: dto.includePrices ?? false,
      profileImageUrl: image(dto.profileImageUrl), coverImageUrl: image(dto.coverImageUrl), collectionCoverUrl: image(dto.collectionCoverUrl),
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null, createdAt: now, updatedAt: now, collections: [], artworks: [] };
    // Ignore client-supplied per-page style overrides; use the enum preset only.
    project.designConfig = null;
    if (dto.designConfig?.minimal !== undefined) {
      try { project.designConfig = { minimal: parseMinimalDesign(dto.designConfig.minimal) }; }
      catch { throw new BadRequestException("Neispravan PDF dizajn."); }
    }
    if (dto.cvSections) { try { project.cvSections = parsePortfolioCv(dto.cvSections); } catch { throw new BadRequestException("CV nije ispravan."); } }
    if (dto.documentSelection) { try { project.designConfig = { ...(project.designConfig ?? {}), documentSelection: parseDocumentSelection(dto.documentSelection) }; } catch { throw new BadRequestException("Izbor PDF strana nije ispravan."); } }
    for (const [index, artwork] of input.artworks.entries()) {
      if (!artwork || typeof artwork !== "object" || Array.isArray(artwork)) throw new BadRequestException("Rad nije ispravan.");
      const { imageUrl, ...metadata } = artwork;
      const row = plainToInstance(UpdatePortfolioArtworkDto, metadata);
      if ((await validate(row, { whitelist: true, forbidNonWhitelisted: true })).length) throw new BadRequestException("Podaci rada nijesu ispravni.");
      project.artworks.push({ ...row, id: `guest-work-${index}`, portfolioId: id, imageUrl: image(imageUrl), isSelected: row.isSelected ?? true, orderIndex: row.orderIndex ?? index, availability: row.availability ?? "UNKNOWN" });
      if (!project.artworks[index].imageUrl) throw new BadRequestException("Rad mora imati sliku.");
    }
    if (!buildPortfolioDocumentPlan(project).pages.length) throw new BadRequestException("Izaberi sadržaj PDF-a.");
    return frozenPortfolio(project);
  }
  async normalizeImages(files: Express.Multer.File[], maxCount = 33, maxBytes = 10 * 1024 * 1024) {
    if (files.length > maxCount) throw new BadRequestException("Previše slika.");
    const images = new Map<string, string>(); let imageBytes = 0;
    for (const [index, file] of files.entries()) {
      if (!file.size || file.size > 1024 * 1024 || !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.mimetype)) throw new BadRequestException("Slika mora biti podržanog formata i do 1 MB pri slanju.");
      let normalized: Buffer;
      try { normalized = await sharp(file.buffer, { limitInputPixels: 40_000_000, animated: false }).rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer(); }
      catch { throw new BadRequestException("Slika nije ispravna ili je prevelike rezolucije."); }
      imageBytes += normalized.length;
      if (imageBytes > maxBytes) throw new BadRequestException("Slike portfolija prelaze dozvoljenu ukupnu veličinu.");
      images.set(`upload:${index}`, `data:image/jpeg;base64,${normalized.toString("base64")}`);
    }
    return images;
  }
  async preview(snapshot: any) { let count = 0; const buffer = await generatePortfolioPdf(snapshot, { watermark: true, onPageCount: value => { count = value; } }); return { buffer, count }; }
}

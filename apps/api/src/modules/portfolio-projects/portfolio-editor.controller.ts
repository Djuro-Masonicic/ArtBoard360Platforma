import { Body, Controller, Get, Header, Param, Post, Req, Res, UploadedFiles, UseGuards, UseInterceptors, BadRequestException, Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { IsString, MaxLength } from "class-validator";
import type { Response } from "express";
import { ArtistAuthGuard, type ArtistRequest } from "../auth/artist-auth.guard";
import { PortfolioEditorService } from "./portfolio-editor.service";
class DocumentDto { @IsString() @MaxLength(128_000) document!: string; }

/** Authenticated preview traffic must not exhaust the separate first-save allowance. */
@Injectable()
export class PortfolioEditorProcessingGuard implements CanActivate {
  private buckets = new Map<string, { count: number; reset: number }>();
  private active = 0;
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<ArtistRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const now = Date.now();
    for (const [key, bucket] of this.buckets) if (bucket.reset <= now) this.buckets.delete(key);
    const saving = request.params.action === "save";
    const key = `${request.artistUser!.id}:${saving ? "save" : "render"}`;
    const bucket = this.buckets.get(key) ?? { count: 0, reset: now + 60_000 };
    if (this.active >= 2 || bucket.count >= (saving ? 10 : 60) || this.buckets.size >= 10_000) {
      throw new BadRequestException("Previše zahtjeva. Pokušaj malo kasnije.");
    }
    bucket.count++; this.buckets.set(key, bucket); this.active++;
    let done = false;
    const finish = () => { if (!done) { done = true; this.active--; } };
    response.once("finish", finish); response.once("close", finish);
    return true;
  }
}

@Controller("portfolio-projects/editor")
@UseGuards(ArtistAuthGuard)
export class PortfolioEditorController {
  constructor(private readonly editor: PortfolioEditorService) {}
  @Get("from-profile") @Header("Cache-Control", "no-store")
  seed(@Req() req: ArtistRequest) { return this.editor.seed(req.artistUser!.id); }
  @Post(":action") @UseGuards(PortfolioEditorProcessingGuard)
  @UseInterceptors(FilesInterceptor("images", 64, { storage: memoryStorage(), limits: { fileSize: 1024 * 1024, files: 64, fields: 1, fieldSize: 128_000, parts: 65 } }))
  async action(@Param("action") action: string, @Req() req: ArtistRequest, @Body() dto: DocumentDto, @UploadedFiles() files: Express.Multer.File[], @Res() res: Response) {
    if (!["save", "preview", "test-export"].includes(action)) throw new BadRequestException("Nepoznata operacija.");
    res.setHeader("Cache-Control", "no-store");
    if (action === "save") { res.status(201).json(await this.editor.save(req.artistUser!.id, dto.document, files ?? [])); return; }
    const pdf = await this.editor.render(req.artistUser!.id, dto.document, files ?? [], action === "test-export");
    res.status(200).set({ "Content-Type": "application/pdf", "X-Portfolio-Page-Count": String(pdf.count), "X-Content-Type-Options": "nosniff", "Content-Disposition": `${action === "test-export" ? "attachment" : "inline"}; filename="portfolio-${action}.pdf"` }); res.send(pdf.buffer);
  }
}

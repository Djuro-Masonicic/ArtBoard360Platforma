import {
  Body,
  CanActivate,
  Controller,
  ExecutionContext,
  Get,
  Header,
  HttpException,
  Injectable,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import type { Response } from "express";
import { ArtistAuthGuard, type ArtistRequest } from "../auth/artist-auth.guard";
import { QrCardsService } from "./qr-cards.service";
import { ExportCardDto, SaveCardDto } from "./qr-cards.dto";
@Injectable()
class QrExportRateGuard implements CanActivate {
  protected limit = 8;
  private attempts = new Map<string, { n: number; until: number }>();
  canActivate(ctx: ExecutionContext) {
    const now = Date.now();
    for (const [k, v] of this.attempts)
      if (v.until < now) this.attempts.delete(k);
    const id = ctx.switchToHttp().getRequest<ArtistRequest>().artistUser!.id,
      v = this.attempts.get(id) || { n: 0, until: now + 60000 };
    if (v.n >= this.limit || this.attempts.size >= 10000)
      throw new HttpException("Previše zahtjeva. Pokušaj za minut.", 429);
    v.n++;
    this.attempts.set(id, v);
    return true;
  }
}
@Injectable()
class QrDownloadRateGuard extends QrExportRateGuard {
  protected override limit = 60;
}
@Controller("artist/qr-cards")
@UseGuards(ArtistAuthGuard)
export class QrCardsController {
  constructor(private readonly cards: QrCardsService) {}
  @Get() @Header("Cache-Control", "private, no-store") get(
    @Req() r: ArtistRequest,
    @Query("page") value?: string,
  ) {
    const page = Number(value || 1);
    if (!Number.isSafeInteger(page) || page < 1 || page > 100000)
      throw new BadRequestException();
    return this.cards.get(r.artistUser!.id, page);
  }
  @Put("draft") @Header("Cache-Control", "private, no-store") save(
    @Req() r: ArtistRequest,
    @Body() d: SaveCardDto,
  ) {
    return this.cards.save(r.artistUser!.id, d);
  }
  @Post("exports")
  @Header("Cache-Control", "private, no-store")
  @UseGuards(QrExportRateGuard)
  export(@Req() r: ArtistRequest, @Body() d: ExportCardDto) {
    return this.cards.export(r.artistUser!.id, d);
  }
  @Get("exports/:id") @Header("Cache-Control", "private, no-store") version(
    @Req() r: ArtistRequest,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ) {
    return this.cards.version(r.artistUser!.id, id);
  }
  @Get("exports/:id/download/:format")
  @UseGuards(QrDownloadRateGuard)
  async download(
    @Req() r: ArtistRequest,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Param("format") format: string,
    @Res() res: Response,
  ) {
    if (!["pdf", "front", "back", "bundle"].includes(format))
      throw new BadRequestException();
    const file = await this.cards.download(
      r.artistUser!.id,
      id,
      format as "pdf" | "front" | "back" | "bundle",
    );
    res.setHeader("Content-Type", file.mime);
    res.setHeader("Content-Disposition", `attachment; filename="${file.name}"`);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.send(file.body);
  }
}

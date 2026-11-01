import { BadRequestException, Body, CanActivate, Controller, ExecutionContext, Header, Headers, HttpCode, HttpException, HttpStatus, Injectable, PayloadTooLargeException, Post, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import { ContactDto } from "./contact.dto";
import { ContactService } from "./contact.service";

@Injectable()
export class ContactRateGuard implements CanActivate {
  private readonly clients = new Map<string, { count: number; reset: number }>();
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>(), response = context.switchToHttp().getResponse<Response>();
    if (!request.is("application/json")) throw new BadRequestException("Zahtjev mora biti JSON.");
    if (Number(request.headers["content-length"]) > 24_576 || Buffer.byteLength(JSON.stringify(request.body ?? {})) > 24_576) throw new PayloadTooLargeException("Poruka je prevelika.");
    const now = Date.now();
    for (const [key, entry] of this.clients) if (entry.reset <= now) this.clients.delete(key);
    // Do not trust arbitrary X-Forwarded-For values on this public endpoint.
    const key = request.socket.remoteAddress ?? "unknown";
    const entry = this.clients.get(key) ?? { count: 0, reset: now + 5 * 60_000 };
    if (entry.count >= 30 || this.clients.size >= 5000) {
      response.setHeader("Retry-After", String(Math.max(1, Math.ceil((entry.reset - now) / 1000))));
      throw new HttpException("Previše zahtjeva. Pokušaj malo kasnije.", HttpStatus.TOO_MANY_REQUESTS);
    }
    entry.count++; this.clients.set(key, entry); return true;
  }
}

@Controller("contact")
export class ContactController {
  constructor(private readonly contact: ContactService) {}
  @Post() @HttpCode(200) @UseGuards(ContactRateGuard) @Header("Cache-Control", "no-store")
  send(@Body() dto: ContactDto, @Headers("idempotency-key") operationKey?: string) { return this.contact.send(dto, operationKey ?? ""); }
}

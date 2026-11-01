import { BadRequestException, ConflictException, HttpException, HttpStatus, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { createHash } from "node:crypto";
import { ResendMailService } from "../../mail/resend-mail.service";
import { ContactDto } from "./contact.dto";

@Injectable()
export class ContactService {
  private readonly requests = new Map<string, { hash: string; expiresAt: number; receivedAt: Date; result?: Promise<{ accepted: true }> }>();
  private readonly senders = new Map<string, { count: number; reset: number }>();
  constructor(private readonly mail: ResendMailService) {}

  async send(dto: ContactDto, operationKey: string) {
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(operationKey)) throw new BadRequestException("Neispravan identifikator poruke.");
    const now = Date.now();
    for (const [key, entry] of this.requests) if (entry.expiresAt <= now) this.requests.delete(key);
    for (const [key, entry] of this.senders) if (entry.reset <= now) this.senders.delete(key);
    const message = { fullName: dto.fullName, email: dto.email, topic: dto.topic, message: dto.message };
    const hash = createHash("sha256").update(JSON.stringify(message)).digest("hex");
    const existing = this.requests.get(operationKey);
    if (existing) {
      if (existing.hash !== hash) throw new ConflictException("Za izmijenjenu poruku potreban je novi pokušaj slanja.");
      if (existing.result) return existing.result;
    }
    const sender = createHash("sha256").update(dto.email.toLowerCase()).digest("hex");
    const bucket = this.senders.get(sender) ?? { count: 0, reset: now + 15 * 60_000 };
    if (bucket.count >= 3 || (!existing && this.requests.size >= 1000) || this.senders.size >= 5000) throw new HttpException("Previše poruka. Pokušaj malo kasnije.", HttpStatus.TOO_MANY_REQUESTS);
    bucket.count++; this.senders.set(sender, bucket);
    const entry = existing ?? { hash, expiresAt: now + 24 * 60 * 60_000, receivedAt: new Date(now), result: undefined };
    const result = this.deliver({ ...message, operationKey, receivedAt: entry.receivedAt });
    entry.result = result; this.requests.set(operationKey, entry);
    // Retry the identical provider payload/key after a failure; this also
    // resolves ambiguous network errors without creating another message.
    try { return await result; } catch (error) { entry.result = undefined; throw error; }
  }

  private async deliver(data: Parameters<ResendMailService["sendContactMessage"]>[0]): Promise<{ accepted: true }> {
    try {
      const accepted = await this.mail.sendContactMessage(data);
      if (!accepted.providerMessageId) throw new Error("Missing provider acceptance");
      return { accepted: true };
    } catch { throw new ServiceUnavailableException("Poruka trenutno nije mogla biti poslata. Pokušaj ponovo."); }
  }
}

import { Module } from "@nestjs/common";
import { MailModule } from "../../mail/mail.module";
import { ContactController, ContactRateGuard } from "./contact.controller";
import { ContactService } from "./contact.service";
@Module({ imports: [MailModule], controllers: [ContactController], providers: [ContactService, ContactRateGuard] })
export class ContactModule {}

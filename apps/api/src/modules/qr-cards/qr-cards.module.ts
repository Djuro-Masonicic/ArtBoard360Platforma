import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { StorageModule } from "../../storage/storage.module";
import { QrCardsController } from "./qr-cards.controller";
import { QrCardsService } from "./qr-cards.service";
import { QrCardGenerator } from "./qr-card.generator";
import { QrCardStorage } from "./qr-card.storage";
@Module({
  imports: [AuthModule, StorageModule],
  controllers: [QrCardsController],
  providers: [QrCardsService, QrCardGenerator, QrCardStorage],
  exports: [QrCardsService],
})
export class QrCardsModule {}

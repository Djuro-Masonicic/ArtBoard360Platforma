import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../../storage/storage.module';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';
import { PromotionGenerator } from './promotion.generator';
import { PromotionStorage } from './promotion.storage';
import { PromotionPurchaseService } from './promotion-purchase.service';
@Module({imports:[AuthModule,StorageModule],controllers:[PromotionsController],providers:[PromotionsService,PromotionGenerator,PromotionStorage,PromotionPurchaseService],exports:[PromotionsService,PromotionPurchaseService]})
export class PromotionsModule{}

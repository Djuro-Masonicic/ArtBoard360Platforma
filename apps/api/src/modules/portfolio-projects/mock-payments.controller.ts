import { Body, CanActivate, Controller, ExecutionContext, Injectable, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { IsIn, IsInt, IsUUID } from 'class-validator';
import type { Request } from 'express';
import { ArtistAuthGuard, type ArtistRequest } from '../auth/artist-auth.guard';
import { GuestProcessingGuard } from './portfolio-commerce.controller';
import { MockPaymentsService, type MockOutcome } from './mock-payments.service';
import { PortfolioPaymentContextService } from './portfolio-payment-context.service';

class OutcomeDto { @IsIn(['success','failure','cancel']) outcome!: MockOutcome; }
class GeneratorMockDto extends OutcomeDto { @IsUUID('4') operationKey!: string; }
class PremiumMockDto extends GeneratorMockDto { @IsInt() amountCents!: number; }
@Injectable()
export class MockPaymentsGuard implements CanActivate {
  constructor(private readonly mock: MockPaymentsService) {}
  canActivate(_ctx: ExecutionContext) { this.mock.requireEnabled(); return true; }
}
@Controller('portfolio-commerce')
@UseGuards(MockPaymentsGuard, GuestProcessingGuard)
export class MockPaymentsController {
  constructor(private readonly mock: MockPaymentsService, private readonly context: PortfolioPaymentContextService) {}
  @Post('mock/premium') @UseGuards(ArtistAuthGuard)
  async premium(@Req() request: ArtistRequest, @Body() dto: PremiumMockDto) {
    const result = await this.mock.premium(request.artistUser!.id, dto.operationKey, dto.amountCents, dto.outcome);
    return { ...result, context: await this.context.owner(request.artistUser!.id,'premium') };
  }
  @Post('mock/generator') @UseGuards(ArtistAuthGuard)
  async generator(@Req() request: ArtistRequest, @Body() dto: GeneratorMockDto) {
    const result = await this.mock.generator(request.artistUser!.id,dto.operationKey,dto.outcome);
    return { ...result, context: await this.context.owner(request.artistUser!.id,'generator') };
  }
  @Post('purchases/:id/mock-payment')
  async portfolio(@Param('id',new ParseUUIDPipe({version:'4'})) id: string, @Req() request: Request, @Body() dto: OutcomeDto) {
    const secret = request.headers['x-portfolio-delivery'] as string ?? '';
    const result = await this.mock.portfolio(id,secret,dto.outcome);
    return { ...result, context: await this.context.purchase(id,secret) };
  }
}

import { Body, Controller, Delete, Get, Header, Post, Req, UseGuards } from "@nestjs/common";

import { ArtistAuthGuard, type ArtistRequest } from "../auth/artist-auth.guard";
import { CompleteDemoCheckoutDto, SubscriptionActionDto } from "./artist-subscriptions.dto";
import { ArtistSubscriptionsService } from "./artist-subscriptions.service";
import { SubscriptionOverviewService } from "./subscription-overview.service";

@UseGuards(ArtistAuthGuard)
@Controller("artist-subscriptions")
export class ArtistSubscriptionsController {
  constructor(private readonly artistSubscriptionsService: ArtistSubscriptionsService, private readonly overview: SubscriptionOverviewService) {}

  @Get("overview")
  @Header("Cache-Control", "private, no-store")
  getOverview(@Req() request: ArtistRequest) { return this.overview.get(request.artistUser!.id); }

  @Post("cancel")
  @Header("Cache-Control", "private, no-store")
  async cancel(@Req() request: ArtistRequest, @Body() _dto: SubscriptionActionDto) {
    await this.artistSubscriptionsService.setRenewal(request.artistUser!.id, false);
    return this.overview.get(request.artistUser!.id);
  }

  @Post("reactivate")
  @Header("Cache-Control", "private, no-store")
  async reactivate(@Req() request: ArtistRequest, @Body() _dto: SubscriptionActionDto) {
    await this.artistSubscriptionsService.setRenewal(request.artistUser!.id, true);
    return this.overview.get(request.artistUser!.id);
  }

  @Get("me")
  getCurrentSubscription(@Req() request: ArtistRequest) {
    return this.artistSubscriptionsService.getForArtistAccount(request.artistUser!.id);
  }

  @Post("platinum-request")
  requestPlatinum(@Req() request: ArtistRequest) {
    return this.artistSubscriptionsService.requestPlatinum(request.artistUser!.id);
  }

  @Post("demo-checkout")
  completeDemoCheckout(
    @Req() request: ArtistRequest,
    @Body() dto: CompleteDemoCheckoutDto,
  ) {
    return this.artistSubscriptionsService.completeDemoCheckout(
      request.artistUser!.id,
      dto,
    );
  }

  @Delete("platinum-request")
  cancelPlatinumRequest(@Req() request: ArtistRequest) {
    return this.artistSubscriptionsService.cancelPlatinumRequest(request.artistUser!.id);
  }
}

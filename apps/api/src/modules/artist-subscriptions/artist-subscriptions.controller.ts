import { Body, Controller, Delete, Get, Post, Req, UseGuards } from "@nestjs/common";

import { ArtistAuthGuard, type ArtistRequest } from "../auth/artist-auth.guard";
import { CompleteDemoCheckoutDto } from "./artist-subscriptions.dto";
import { ArtistSubscriptionsService } from "./artist-subscriptions.service";

@UseGuards(ArtistAuthGuard)
@Controller("artist-subscriptions")
export class ArtistSubscriptionsController {
  constructor(private readonly artistSubscriptionsService: ArtistSubscriptionsService) {}

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

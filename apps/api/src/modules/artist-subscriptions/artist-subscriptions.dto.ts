import { IsIn, IsString } from "class-validator";

// Empty on purpose: ownership, plan, dates and provider values are server-owned.
export class SubscriptionActionDto {}

export class CompleteDemoCheckoutDto {
  /**
   * A real payment provider would create this token in the browser.
   * The demo checkout sends a fixed token so raw card data never reaches us.
   */
  @IsString()
  @IsIn(["demo_card_approved"])
  paymentToken!: string;
}

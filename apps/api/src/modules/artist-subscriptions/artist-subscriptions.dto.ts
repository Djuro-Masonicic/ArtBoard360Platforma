import { IsIn, IsString } from "class-validator";

export class CompleteDemoCheckoutDto {
  /**
   * A real payment provider would create this token in the browser.
   * The demo checkout sends a fixed token so raw card data never reaches us.
   */
  @IsString()
  @IsIn(["demo_card_approved"])
  paymentToken!: string;
}

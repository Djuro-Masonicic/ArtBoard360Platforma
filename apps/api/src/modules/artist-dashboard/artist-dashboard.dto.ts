import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
export class DashboardThemeDto {
  @IsIn(["light", "dark"]) theme!: "light" | "dark";
}
export class RequestArtistDeletionDto {
  @IsString() @MinLength(1) @MaxLength(128) currentPassword!: string;
}
export class ReviewArtistDeletionDto {
  @IsIn(["PENDING", "IN_REVIEW"]) expectedStatus!: "PENDING" | "IN_REVIEW";
  @IsIn(["IN_REVIEW", "REJECTED"]) status!: "IN_REVIEW" | "REJECTED";
  @IsOptional() @IsString() @MaxLength(4000) @Transform(({value}) => typeof value === "string" ? value.trim() : value) adminNotes?: string;
}

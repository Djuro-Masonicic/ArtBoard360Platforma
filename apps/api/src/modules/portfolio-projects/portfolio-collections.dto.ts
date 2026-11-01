import { Transform, Type } from "class-transformer";
import { ArrayMaxSize, ArrayUnique, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, MaxLength, Min, ValidateIf } from "class-validator";

export class PortfolioRevisionDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  expectedRevision?: number;
}

export class PortfolioCollectionCommandDto {
  @IsInt() @Min(0)
  expectedRevision!: number;

  @IsIn(["convert", "create", "update", "delete", "toggle", "toggleOutside", "reorder", "reorderWorks", "move", "select", "addWorks", "import", "publish", "applySource", "ackSource"])
  action!: string;

  @IsOptional() @IsUUID("4")
  collectionId?: string | null;

  @IsOptional() @IsArray() @ArrayMaxSize(1000) @ArrayUnique() @IsUUID("4", { each: true })
  artworkIds?: string[];

  @IsOptional() @IsArray() @ArrayMaxSize(1000) @ArrayUnique() @IsUUID("4", { each: true })
  collectionIds?: string[];

  @IsOptional() @IsArray() @ArrayMaxSize(1000) @ArrayUnique() @IsUUID("4", { each: true })
  confirmedMoves?: string[];

  @ValidateIf((_, value) => value !== undefined)
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value) @IsString() @MaxLength(160)
  title?: string;

  @IsOptional() @IsString() @MaxLength(4000)
  description?: string | null;

  @IsOptional() @IsString() @MaxLength(40)
  year?: string | null;

  @IsOptional() @IsUUID("4")
  coverArtworkId?: string | null;

  @IsOptional() @IsBoolean()
  included?: boolean;

  @IsOptional() @IsBoolean()
  selected?: boolean;

  @IsOptional() @Matches(/^[a-f0-9]{64}$/)
  sourceVersion?: string;

  @IsOptional() @IsString() @MaxLength(40)
  expectedUpdatedAt?: string;

  @IsOptional() @IsArray() @ArrayMaxSize(1000) @ArrayUnique() @IsString({ each: true }) @MaxLength(140, { each: true })
  changes?: string[];
}

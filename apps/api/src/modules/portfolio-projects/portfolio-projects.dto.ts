import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from "class-validator";
import {
  PortfolioArtworkAvailability,
  PortfolioFontStyle,
  PortfolioLanguage,
  PortfolioPageFormat,
  PortfolioTemplate,
} from "@prisma/client";

import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { IsBirthDate, IsBehanceProfile } from "../../common/validators/portfolio-profile-fields";
export class GeneratePortfolioPdfDto {}

export class CreateGuestPortfolioProjectDto {
  @IsString()
  @MaxLength(160)
  artistName!: string;

  @IsEmail()
  @MaxLength(220)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  discipline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string;
}

export class ListPortfolioProjectsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}

export class UpdatePortfolioProjectDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  documentSelection?: Record<string, unknown>;
  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  cvSections?: Record<string, unknown>;

  @IsOptional() @IsInt() @Min(0)
  expectedRevision?: number;
  @ValidateIf((_object, value) => value !== undefined)
  @IsBirthDate()
  dateOfBirth?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(500)
  @IsBehanceProfile()
  behanceUrl?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(1000)
  motto?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(160)
  mottoAuthor?: string;
  @IsOptional()
  @IsString()
  @MaxLength(180)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  artistName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  discipline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(220)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  websiteUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  instagramUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  profileImageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  coverImageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  collectionName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  collectionYear?: string;

  @IsOptional()
  @IsString()
  collectionDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  collectionCoverUrl?: string;

  @IsOptional()
  @IsString()
  biography?: string;

  @IsOptional()
  @IsString()
  artistStatement?: string;

  @IsOptional()
  @IsEnum(PortfolioTemplate)
  template?: PortfolioTemplate;

  @IsOptional()
  @IsEnum(PortfolioLanguage)
  language?: PortfolioLanguage;

  @IsOptional()
  @IsEnum(PortfolioPageFormat)
  pageFormat?: PortfolioPageFormat;

  @IsOptional()
  @IsEnum(PortfolioFontStyle)
  fontStyle?: PortfolioFontStyle;

  @IsOptional()
  @IsBoolean()
  includeBranding?: boolean;

  @IsOptional()
  @IsBoolean()
  includeCv?: boolean;

  @IsOptional()
  @IsBoolean()
  includePrices?: boolean;

  /**
   * Premium-only custom design configuration.
   *
   * We intentionally keep this as a small JSON object instead of many database
   * columns because portfolio page combinations will keep changing while the
   * product is still being shaped. The service validates the exact structure
   * before saving it.
   */
  @IsOptional()
  @IsObject()
  designConfig?: Record<string, unknown>;
}

export class UpdatePortfolioArtworkDto {
  @IsOptional() @IsInt() @Min(0)
  expectedRevision?: number;
  @IsOptional()
  @IsString()
  @MaxLength(180)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  collectionName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  year?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  technique?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  dimensions?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(PortfolioArtworkAvailability)
  availability?: PortfolioArtworkAvailability;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  price?: string;

  @IsOptional()
  @IsBoolean()
  isSelected?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;
}

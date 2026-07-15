import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import {
  PortfolioArtworkAvailability,
  PortfolioFontStyle,
  PortfolioLanguage,
  PortfolioPageFormat,
  PortfolioTemplate,
} from "@prisma/client";

import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

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
}

export class UpdatePortfolioArtworkDto {
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

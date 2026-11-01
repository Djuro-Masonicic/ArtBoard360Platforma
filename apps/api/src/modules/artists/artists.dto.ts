import { Type, Transform } from "class-transformer";
import {
  IsArray,
  ArrayMaxSize,
  ArrayUnique,
  IsIn,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
  ValidateIf,
} from "class-validator";
import { SocialPlatform } from "@prisma/client";

import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

function transformBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return String(value).toLowerCase() === "true";
}

/**
 * Nested social link DTOs keep the public create/update contract explicit.
 */
export class ArtistSocialLinkInputDto {
  @IsEnum(SocialPlatform)
  platform!: SocialPlatform;

  @IsUrl({ protocols: ["http", "https"], require_protocol: true })
  url!: string;
}

export class ListArtistsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  discipline?: string;

  @IsOptional()
  @Transform(({ value }) => transformBoolean(value))
  @IsBoolean()
  includeNsfw?: boolean;

  @IsOptional()
  @Transform(({ value }) => transformBoolean(value))
  @IsBoolean()
  onlyWithArtworks?: boolean;
}

export class CreateArtistDto {
  @IsString()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  slug?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  quote?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsUrl()
  profileImageUrl?: string;

  @IsOptional()
  @IsUrl()
  profileThumbnailUrl?: string;

  @IsOptional()
  @IsUrl()
  coverImageUrl?: string;

  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  @IsOptional()
  @Transform(({ value }) => transformBoolean(value))
  @IsBoolean()
  isNsfw?: boolean;

  @IsOptional()
  @Transform(({ value }) => transformBoolean(value))
  @IsBoolean()
  darkenCoverOverlay?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  disciplines?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArtistSocialLinkInputDto)
  socialLinks?: ArtistSocialLinkInputDto[];
}

export class UpdateArtistDto {
  @ValidateIf((_object, value) => value !== undefined) @IsString() @MaxLength(6000)
  artistStatement?: string;

  @ValidateIf((_object, value) => value !== undefined) @IsIn(["FEMININE", "MASCULINE", "NEUTRAL"])
  presentationForm?: "FEMININE" | "MASCULINE" | "NEUTRAL";
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(160)
  name?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(180)
  slug?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(20000)
  bio?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(2000)
  quote?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEmail()
  email?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsUrl()
  profileImageUrl?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsUrl()
  profileThumbnailUrl?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsUrl()
  coverImageUrl?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsUrl()
  thumbnailUrl?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }) => transformBoolean(value))
  @IsBoolean()
  isNsfw?: boolean;

  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }) => transformBoolean(value))
  @IsBoolean()
  darkenCoverOverlay?: boolean;

  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(3)
  @ArrayUnique()
  @IsString({ each: true })
  disciplines?: string[];

  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayUnique((link: ArtistSocialLinkInputDto) => link.platform)
  @ValidateNested({ each: true })
  @Type(() => ArtistSocialLinkInputDto)
  socialLinks?: ArtistSocialLinkInputDto[];
}

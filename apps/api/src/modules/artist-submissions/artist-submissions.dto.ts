import { Transform } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsEnum,
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
} from "class-validator";
import { ArtistSubmissionStatus } from "@prisma/client";

import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

function parseBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  return String(value).toLowerCase() === "true";
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value !== "string" || value.trim() === "") {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
    // Multipart form fields arrive as strings. If the value is not JSON we fall
    // back to a single-item array so validation can still run on the content.
  }

  return [value.trim()].filter(Boolean);
}

/**
 * Multipart form-data keeps array fields as strings on the wire, so DTO
 * transforms turn them back into predictable arrays before validation runs.
 */
export class CreateArtistSubmissionDto {
  @IsString()
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  biography!: string;

  @IsOptional()
  @IsString()
  motto?: string;

  @IsOptional()
  @IsUrl()
  blogUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @Transform(({ value }) => parseBoolean(value))
  @IsBoolean()
  confirmedRules!: boolean;

  @Transform(({ value }) => parseStringArray(value))
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @IsString({ each: true })
  disciplines!: string[];

  @Transform(({ value }) => parseStringArray(value))
  @IsArray()
  @IsUrl({}, { each: true })
  portfolioLinks!: string[];

  @Transform(({ value }) => parseStringArray(value))
  @IsArray()
  @ArrayMinSize(1)
  @IsUrl({}, { each: true })
  socialLinks!: string[];
}

export class ListArtistSubmissionsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ArtistSubmissionStatus)
  status?: ArtistSubmissionStatus;
}

export class UpdateArtistSubmissionDto {
  @IsString()
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  biography!: string;

  @IsOptional()
  @IsString()
  motto?: string;

  @IsOptional()
  @IsUrl()
  blogUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  adminNotes?: string;

  @Transform(({ value }) => parseBoolean(value))
  @IsBoolean()
  confirmedRules!: boolean;

  @IsEnum(ArtistSubmissionStatus)
  status!: ArtistSubmissionStatus;

  @Transform(({ value }) => parseStringArray(value))
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @IsString({ each: true })
  disciplines!: string[];

  @Transform(({ value }) => parseStringArray(value))
  @IsArray()
  @IsUrl({}, { each: true })
  portfolioLinks!: string[];

  @Transform(({ value }) => parseStringArray(value))
  @IsArray()
  @ArrayMinSize(1)
  @IsUrl({}, { each: true })
  socialLinks!: string[];
}

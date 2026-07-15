import { Type } from "class-transformer";
import {
  IsBoolean,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from "class-validator";

import type { UploadEntityType } from "../../storage/storage.types";

export class RequestUploadUrlDto {
  @IsUUID()
  artistId!: string;

  @IsString()
  fileName!: string;

  @IsString()
  mimeType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  fileSizeBytes!: number;

  @IsIn(["artwork", "profile"])
  entityType!: UploadEntityType;
}

export class CreateArtworkDto {
  @IsUUID()
  artistId!: string;

  @IsUrl()
  imageUrl!: string;

  @IsOptional()
  @IsString()
  storagePath?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  altText?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  fileSizeBytes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  width?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  height?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isBackground?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  orderIndex?: number;
}

/**
 * Multipart uploads arrive as form-data fields, so this DTO mirrors the
 * artwork creation metadata but is tailored to the backend-managed file flow.
 */
export class UploadArtworkFileDto {
  @IsUUID()
  artistId!: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  altText?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  orderIndex?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isBackground?: boolean;
}

export class UpdateArtworkDto {
  @IsUUID()
  artistId!: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  altText?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isBackground?: boolean;
}

export class ReorderArtworkItemDto {
  @IsUUID()
  id!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  orderIndex!: number;
}

export class ReorderArtworksDto {
  @IsUUID()
  artistId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderArtworkItemDto)
  items!: ReorderArtworkItemDto[];
}

export class DeleteArtworkDto {
  @IsUUID()
  artistId!: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  deleteFromStorage?: boolean;
}

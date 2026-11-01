import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import type { PromotionConfig } from '@artboard/promotion-renderer';
export class PanoramaCropDto {
  @IsIn(['contain','cover']) fit!:'contain'|'cover';
  @IsNumber() @Min(0.25) @Max(3) zoom!:number;
  @IsNumber() @Min(0) @Max(100) x!:number;
  @IsNumber() @Min(0) @Max(100) y!:number;
}
export class ArtworkEditDto {
  @IsUUID('4') artworkId!:string;
  @IsOptional() @IsString() @MaxLength(180) title?:string;
  @IsOptional() @IsString() @MaxLength(120) description?:string;
  @IsOptional() @ValidateNested() @Type(()=>PanoramaCropDto) crop?:PanoramaCropDto;
}
export class PromotionConfigDto implements PromotionConfig {
  @IsArray() @ArrayMaxSize(9) @ArrayUnique() @IsUUID('4',{each:true}) artworkIds!:string[];
  @IsInt() @Min(0) @Max(9) template!:number;
  @IsInt() @Min(0) @Max(5) version!:number;
  @IsIn(['light','dark']) color!:'light'|'dark';
  @IsIn(['ME','EN']) language!:'ME'|'EN';
  @IsString() @MaxLength(180) name!:string;
  @IsString() @MaxLength(180) instagram!:string;
  @IsOptional() @IsString() @MaxLength(180) title!:string|null;
  @IsOptional() @IsString() @MaxLength(180) collectionTitle?:string|null;
  @IsOptional() @IsString() @MaxLength(180) publicationTitle?:string|null;
  @IsOptional() @IsUUID('4') sourceCollectionId?:string;
  @IsOptional() @ValidateNested() @Type(()=>PanoramaCropDto) panoramaCrop?:PanoramaCropDto;
  @IsOptional() @IsArray() @ArrayMaxSize(9) @ValidateNested({each:true}) @Type(()=>ArtworkEditDto) artworkEdits?:ArtworkEditDto[];
  @IsString() @MaxLength(120) description!:string;
  @IsIn(['logo','instagram']) signature!:'logo'|'instagram';
}
export class SavePromotionDto {
  @ValidateNested() @Type(()=>PromotionConfigDto) config!:PromotionConfigDto;
  @IsInt() @Min(0) revision!:number;
}
export class GeneratePromotionDto {
  @ValidateNested() @Type(()=>PromotionConfigDto) config!:PromotionConfigDto;
  @IsUUID('4') operationKey!:string;
}
export class PromotionPurchaseDto { @IsUUID('4') operationKey!:string; }

import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import type { CardConfig } from "@artboard/qr-card-renderer";
class CardContactsDto {
  @IsString() @MaxLength(254) email!: string;
  @IsString() @MaxLength(40) phone!: string;
  @IsString() @MaxLength(200) instagram!: string;
  @IsString() @MaxLength(200) behance!: string;
}
export class CardConfigDto implements CardConfig {
  @IsString() @MaxLength(80) name!: string;
  @IsObject()
  @ValidateNested()
  @Type(() => CardContactsDto)
  contacts!: CardContactsDto;
  @IsArray()
  @ArrayMaxSize(3)
  @ArrayUnique()
  @IsIn(["email", "phone", "instagram", "behance"], { each: true })
  selectedContacts!: CardConfig["selectedContacts"];
  @IsString() @MaxLength(40) imageId!: string;
  @IsIn([
    "basic",
    "artboard",
    "classic",
    "no-cover",
    "portrait",
    "portrait-artwork",
  ])
  templateId!: CardConfig["templateId"];
  @IsIn(["standard", "branded"]) variant!: CardConfig["variant"];
  @IsIn(["light", "dark"]) cardColor!: CardConfig["cardColor"];
  @IsIn(["ME", "EN"]) language!: CardConfig["language"];
  @IsIn(["profile", "portfolio"]) backTitle!: CardConfig["backTitle"];
}
export class SaveCardDto {
  @IsInt() @Min(0) revision!: number;
  @IsObject()
  @ValidateNested()
  @Type(() => CardConfigDto)
  config!: CardConfigDto;
}
export class ExportCardDto {
  @IsUUID("4") operationKey!: string;
  @IsObject()
  @ValidateNested()
  @Type(() => CardConfigDto)
  config!: CardConfigDto;
}

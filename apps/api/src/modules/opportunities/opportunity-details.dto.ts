import { Transform } from "class-transformer";
import { ArrayMaxSize, IsArray, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { OpportunityCompensationKind, OpportunityWorkMode } from "@prisma/client";

function optionalNumber(value: unknown) {
  return value === "" || value === undefined || value === null ? null : Number(value);
}

function stringArray(value: unknown) {
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return value; }
}

/** Shared by multipart public submissions and JSON admin edits. */
export class OpportunityDetailsDto {
  @IsOptional()
  @IsEnum(OpportunityWorkMode)
  workMode?: OpportunityWorkMode | null;

  @IsOptional()
  @IsEnum(OpportunityCompensationKind)
  compensationKind?: OpportunityCompensationKind | null;

  @IsOptional()
  @Transform(({ value }) => optionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999999999.99)
  compensationAmount?: number | null;

  @IsOptional()
  @IsIn(["EUR", "USD", "GBP", "BAM", "RSD", "CHF", "MKD", "ALL"])
  compensationCurrency?: string;

  @IsOptional()
  @Transform(({ value }) => optionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999999999.99)
  applicationFee?: number | null;

  @IsOptional()
  @Transform(({ value }) => optionalNumber(value))
  @IsInt()
  @Min(1)
  @Max(120)
  maxAge?: number | null;

  @IsOptional()
  @Transform(({ value }) => stringArray(value))
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  disciplines?: string[];

  @IsOptional()
  @Transform(({ value }) => stringArray(value))
  @IsArray()
  @ArrayMaxSize(250)
  @IsString({ each: true })
  @MaxLength(3, { each: true })
  eligibleCountries?: string[];

  @IsOptional()
  @Transform(({ value }) => stringArray(value))
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  applicationLanguages?: string[];

  @IsOptional()
  @Transform(({ value }) => stringArray(value))
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  requiredDocuments?: string[];

  @IsOptional()
  @Transform(({ value }) => stringArray(value))
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  coveredCosts?: string[];
}

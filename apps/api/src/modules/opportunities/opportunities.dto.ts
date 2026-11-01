import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";
import {
  OpportunityApplicationMethod,
  OpportunityOrganizerType,
  OpportunitySubmissionStatus,
  OpportunityType,
} from "@prisma/client";

import { OpportunityDetailsDto } from "./opportunity-details.dto";

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

export class CreatePublicOpportunitySubmissionDto extends OpportunityDetailsDto {
  @IsString()
  @MinLength(10)
  title!: string;

  @IsEnum(OpportunityType)
  type!: OpportunityType;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsNotEmpty()
  conditions!: string;

  @IsOptional()
  @IsString()
  compensation?: string;

  @IsString()
  @IsNotEmpty()
  countryCode!: string;

  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsOptional()
  @IsDateString()
  deadlineAt?: string;

  @Transform(({ value }) => transformBoolean(value))
  @IsBoolean()
  isOpenEnded!: boolean;

  @IsEnum(OpportunityApplicationMethod)
  applicationMethod!: OpportunityApplicationMethod;

  @IsString()
  @IsNotEmpty()
  applyValue!: string;

  @IsOptional()
  @IsString()
  additionalInformation?: string;

  @IsString()
  @IsNotEmpty()
  organizerName!: string;

  @IsEmail()
  contactEmail!: string;

  @IsEnum(OpportunityOrganizerType)
  organizerType!: OpportunityOrganizerType;

  @Transform(({ value }) => transformBoolean(value))
  @IsBoolean()
  consent!: boolean;
}

/**
 * Query options for the public opportunities list.
 *
 * We keep this intentionally close to the UI needs: pagination, text search,
 * optional type filter and a controlled way to include drafts for internal
 * testing later.
 */
export class ListOpportunitiesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(OpportunityType)
  type?: OpportunityType;

  @IsOptional()
  @IsEnum(OpportunitySubmissionStatus)
  status?: OpportunitySubmissionStatus;

  @IsOptional()
  @Transform(({ value }) => transformBoolean(value))
  @IsBoolean()
  includeDrafts?: boolean;
}

/**
 * DTO used when an admin creates an opportunity.
 *
 * The public site only reads opportunities. Admin writes go through this DTO so
 * invalid shapes are rejected before they reach Prisma.
 */
export class CreateOpportunityDto extends OpportunityDetailsDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsEnum(OpportunityType)
  type?: OpportunityType;

  @IsOptional()
  @IsString()
  organization?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsOptional()
  @IsString()
  applyUrl?: string;

  @IsOptional()
  @IsString()
  contactEmail?: string;

  @IsOptional()
  @IsDateString()
  deadlineAt?: string;

  @IsOptional()
  @IsString()
  conditions?: string;

  @IsOptional()
  @IsString()
  compensation?: string;

  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsBoolean()
  isOpenEnded?: boolean;

  @IsOptional()
  @IsEnum(OpportunityApplicationMethod)
  applicationMethod?: OpportunityApplicationMethod;

  @IsOptional()
  @IsString()
  applyEmail?: string;

  @IsOptional()
  @IsString()
  additionalInformation?: string;

  @IsOptional()
  @IsEnum(OpportunityOrganizerType)
  organizerType?: OpportunityOrganizerType;

  @IsOptional()
  @IsEnum(OpportunitySubmissionStatus)
  submissionStatus?: OpportunitySubmissionStatus;

  @IsOptional()
  @IsString()
  reviewNotes?: string;

  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;

  @IsOptional()
  @IsBoolean()
  isDraft?: boolean;
}

/**
 * Patch DTO mirrors create DTO, but every field is optional.
 *
 * This lets the admin editor save only changed values without forcing the
 * frontend to resend the whole row forever.
 */
export class UpdateOpportunityDto extends OpportunityDetailsDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsEnum(OpportunityType)
  type?: OpportunityType;

  @IsOptional()
  @IsString()
  organization?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  applyUrl?: string;

  @IsOptional()
  @IsString()
  contactEmail?: string;

  @IsOptional()
  @IsDateString()
  deadlineAt?: string;

  @IsOptional()
  @IsString()
  conditions?: string;

  @IsOptional()
  @IsString()
  compensation?: string;

  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsBoolean()
  isOpenEnded?: boolean;

  @IsOptional()
  @IsEnum(OpportunityApplicationMethod)
  applicationMethod?: OpportunityApplicationMethod;

  @IsOptional()
  @IsString()
  applyEmail?: string;

  @IsOptional()
  @IsString()
  additionalInformation?: string;

  @IsOptional()
  @IsEnum(OpportunityOrganizerType)
  organizerType?: OpportunityOrganizerType;

  @IsOptional()
  @IsEnum(OpportunitySubmissionStatus)
  submissionStatus?: OpportunitySubmissionStatus;

  @IsOptional()
  @IsString()
  reviewNotes?: string;

  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;

  @IsOptional()
  @IsBoolean()
  isDraft?: boolean;
}

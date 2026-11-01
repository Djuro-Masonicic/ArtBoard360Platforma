import { Transform } from "class-transformer";
import { IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";
const trim = ({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value;

export class ContactDto {
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(120)
  @Matches(/\p{L}/u) @Matches(/^[^\u0000-\u001f\u007f]+$/u)
  fullName!: string;

  @Transform(trim) @IsEmail() @MaxLength(254) @Matches(/^[^\r\n\u0000]+$/u)
  email!: string;

  @IsIn(["services", "support", "other"])
  topic!: "services" | "support" | "other";

  @Transform(trim) @IsString() @MinLength(10) @MaxLength(5000)
  @Matches(/^[^\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]*$/u)
  message!: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(0)
  website?: string;
}

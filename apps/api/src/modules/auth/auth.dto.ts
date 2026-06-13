import { IsEmail, IsString, MinLength } from "class-validator";

/**
 * The admin login contract stays intentionally small:
 * one identifier, one password, one clear validation rule set.
 */
export class LoginAdminDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

export class LoginArtistDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

export class CompleteArtistSetupDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class ChangeArtistPasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}

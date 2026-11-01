import { IsEmail, IsString, MinLength, Matches, MaxLength, IsOptional } from "class-validator";

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
  @MaxLength(128)
  @Matches(/^(?=.*\p{L})(?=.*\p{N})[\s\S]+$/u, { message: "Nova lozinka mora sadržati slovo i broj." })
  newPassword!: string;

  @IsOptional() @IsString() @MaxLength(128)
  confirmNewPassword?: string;
}

export class ForgotArtistPasswordDto {
  @IsEmail()
  email!: string;
}

export class ResetArtistPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

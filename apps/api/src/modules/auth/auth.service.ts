import {
  Injectable,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { env } from "../../config/env";
import { ResendMailService } from "../../mail/resend-mail.service";
import { PrismaService } from "../../prisma/prisma.service";
import {
  createOneTimeToken,
  hashOneTimeToken,
  hashPassword,
  signSessionToken,
  verifyPassword,
  verifySessionToken,
} from "./auth-crypto";
import {
  ChangeArtistPasswordDto,
  CompleteArtistSetupDto,
  ForgotArtistPasswordDto,
  LoginAdminDto,
  LoginArtistDto,
  ResetArtistPasswordDto,
} from "./auth.dto";

export interface AdminSessionUser {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

export interface ArtistSessionUser {
  id: string;
  email: string;
  name: string;
  artistId: string;
  artistSlug: string;
  artistName: string;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

/**
 * AuthService now covers two actor types:
 * admins for the editorial backoffice, and artists for their own profile area.
 */
@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: ResendMailService,
  ) {}

  async onModuleInit() {
    await this.ensureSeedAdminUser();
  }

  async login(dto: LoginAdminDto) {
    const email = normalizeEmail(dto.email);
    const adminUser = await this.prisma.adminUser.findUnique({
      where: { email },
    });

    if (!adminUser || !(await verifyPassword(dto.password, adminUser.passwordHash))) {
      throw new UnauthorizedException("Pogresan email ili lozinka.");
    }

    const updatedAdminUser = await this.prisma.adminUser.update({
      where: { id: adminUser.id },
      data: {
        lastLoginAt: new Date(),
      },
    });

    return {
      token: this.signAdminToken(updatedAdminUser.id, updatedAdminUser.email),
      user: this.serializeAdminUser(updatedAdminUser),
    };
  }

  async loginArtist(dto: LoginArtistDto) {
    const email = normalizeEmail(dto.email);
    const artistAccount = await this.prisma.artistAccount.findUnique({
      where: { email },
      include: {
        artist: true,
      },
    });

    if (
      !artistAccount ||
      !artistAccount.isActive ||
      !(await verifyPassword(dto.password, artistAccount.passwordHash))
    ) {
      throw new UnauthorizedException("Pogresan email ili lozinka.");
    }

    const updatedArtistAccount = await this.prisma.artistAccount.update({
      where: {
        id: artistAccount.id,
      },
      data: {
        lastLoginAt: new Date(),
      },
      include: {
        artist: true,
      },
    });

    return {
      token: this.signArtistToken(updatedArtistAccount.id, updatedArtistAccount.email),
      user: this.serializeArtistUser(updatedArtistAccount),
    };
  }

  async inspectArtistSetupToken(token: string) {
    const hashedToken = hashOneTimeToken(token);
    const setupToken = await this.prisma.artistAccountSetupToken.findUnique({
      where: {
        tokenHash: hashedToken,
      },
      include: {
        artistAccount: {
          include: {
            artist: true,
          },
        },
      },
    });

    if (
      !setupToken ||
      setupToken.usedAt ||
      setupToken.expiresAt.getTime() <= Date.now() ||
      !setupToken.artistAccount.isActive
    ) {
      throw new NotFoundException("Link za aktivaciju naloga nije vazeci ili je istekao.");
    }

    return {
      token,
      email: setupToken.artistAccount.email,
      artistName: setupToken.artistAccount.artist.name,
      expiresAt: setupToken.expiresAt,
      hasPassword: Boolean(setupToken.artistAccount.passwordHash),
    };
  }

  async completeArtistSetup(dto: CompleteArtistSetupDto) {
    const hashedToken = hashOneTimeToken(dto.token);
    const setupToken = await this.prisma.artistAccountSetupToken.findUnique({
      where: {
        tokenHash: hashedToken,
      },
      include: {
        artistAccount: {
          include: {
            artist: true,
          },
        },
      },
    });

    if (
      !setupToken ||
      setupToken.usedAt ||
      setupToken.expiresAt.getTime() <= Date.now() ||
      !setupToken.artistAccount.isActive
    ) {
      throw new UnauthorizedException("Link za aktivaciju naloga nije vazeci ili je istekao.");
    }

    const updatedArtistAccount = await this.prisma.$transaction(async (tx) => {
      await tx.artistAccount.update({
        where: {
          id: setupToken.artistAccount.id,
        },
        data: {
          passwordHash: await hashPassword(dto.password),
          mustChangePassword: false,
          lastLoginAt: new Date(),
        },
      });

      await tx.artistAccountSetupToken.update({
        where: {
          id: setupToken.id,
        },
        data: {
          usedAt: new Date(),
        },
      });

      await tx.artistAccountSetupToken.updateMany({
        where: {
          artistAccountId: setupToken.artistAccount.id,
          usedAt: null,
          id: {
            not: setupToken.id,
          },
        },
        data: {
          usedAt: new Date(),
        },
      });

      return tx.artistAccount.findUniqueOrThrow({
        where: {
          id: setupToken.artistAccount.id,
        },
        include: {
          artist: true,
        },
      });
    });

    return {
      token: this.signArtistToken(updatedArtistAccount.id, updatedArtistAccount.email),
      user: this.serializeArtistUser(updatedArtistAccount),
    };
  }

  async changeArtistPassword(artistAccountId: string, dto: ChangeArtistPasswordDto) {
    const artistAccount = await this.prisma.artistAccount.findUnique({
      where: {
        id: artistAccountId,
      },
    });

    if (!artistAccount || !artistAccount.isActive) {
      throw new UnauthorizedException("Artist session is invalid or expired.");
    }

    const isCurrentPasswordValid = await verifyPassword(
      dto.currentPassword,
      artistAccount.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException("Trenutna lozinka nije ispravna.");
    }

    const isSamePassword = await verifyPassword(dto.newPassword, artistAccount.passwordHash);

    if (isSamePassword) {
      throw new UnauthorizedException("Nova lozinka mora biti drugacija od trenutne.");
    }

    await this.prisma.artistAccount.update({
      where: {
        id: artistAccount.id,
      },
      data: {
        passwordHash: await hashPassword(dto.newPassword),
        mustChangePassword: false,
      },
    });

    return {
      success: true,
      message: "Lozinka je uspjesno promijenjena.",
    };
  }

  async requestArtistPasswordReset(dto: ForgotArtistPasswordDto) {
    const email = normalizeEmail(dto.email);
    const artistAccount = await this.prisma.artistAccount.findUnique({
      where: { email },
      include: {
        artist: true,
      },
    });

    if (artistAccount?.isActive) {
      const rawToken = createOneTimeToken();
      const tokenHash = hashOneTimeToken(rawToken);
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

      await this.prisma.$transaction(async (tx) => {
        await tx.artistPasswordResetToken.updateMany({
          where: {
            artistAccountId: artistAccount.id,
            usedAt: null,
          },
          data: {
            usedAt: new Date(),
          },
        });

        await tx.artistPasswordResetToken.create({
          data: {
            artistAccountId: artistAccount.id,
            tokenHash,
            expiresAt,
          },
        });
      });

      const resetUrl = new URL("/artist/reset-password", env.siteBaseUrl);
      resetUrl.searchParams.set("token", rawToken);

      try {
        await this.mailService.sendArtistPasswordResetEmail({
          artistName: artistAccount.artist.name,
          email: artistAccount.email,
          resetUrl: resetUrl.toString(),
          expiresAt,
        });
      } catch (error) {
        console.error("Artist password reset email failed.", error);
      }
    }

    return {
      success: true,
      message: "Ako postoji aktivan artist nalog sa tim emailom, poslali smo link za promjenu lozinke.",
    };
  }

  async resetArtistPassword(dto: ResetArtistPasswordDto) {
    const tokenHash = hashOneTimeToken(dto.token);
    const resetToken = await this.prisma.artistPasswordResetToken.findUnique({
      where: {
        tokenHash,
      },
      include: {
        artistAccount: true,
      },
    });

    if (
      !resetToken ||
      resetToken.usedAt ||
      resetToken.expiresAt.getTime() <= Date.now() ||
      !resetToken.artistAccount.isActive
    ) {
      throw new UnauthorizedException("Link za promjenu lozinke nije vazeci ili je istekao.");
    }

    const isSamePassword = await verifyPassword(
      dto.password,
      resetToken.artistAccount.passwordHash,
    );

    if (isSamePassword) {
      throw new UnauthorizedException("Nova lozinka mora biti drugacija od prethodne.");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.artistAccount.update({
        where: {
          id: resetToken.artistAccountId,
        },
        data: {
          passwordHash: await hashPassword(dto.password),
          mustChangePassword: false,
        },
      });

      await tx.artistPasswordResetToken.updateMany({
        where: {
          artistAccountId: resetToken.artistAccountId,
          usedAt: null,
        },
        data: {
          usedAt: new Date(),
        },
      });
    });

    return {
      success: true,
      message: "Lozinka je uspjesno promijenjena. Sada se mozes prijaviti.",
    };
  }

  async issueArtistSetupToken(
    artistAccountId: string,
    prismaClient: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const rawToken = createOneTimeToken();
    const hashedToken = hashOneTimeToken(rawToken);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

    await prismaClient.artistAccountSetupToken.updateMany({
      where: {
        artistAccountId,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    const createdToken = await prismaClient.artistAccountSetupToken.create({
      data: {
        artistAccountId,
        tokenHash: hashedToken,
        expiresAt,
      },
    });

    return {
      token: rawToken,
      expiresAt: createdToken.expiresAt,
    };
  }

  async getAuthenticatedAdminUser(token: string) {
    const payload = this.verifyToken(token, "admin");

    const adminUser = await this.prisma.adminUser.findUnique({
      where: {
        id: payload.sub,
      },
    });

    if (!adminUser || normalizeEmail(adminUser.email) !== payload.email) {
      throw new UnauthorizedException("Admin session is invalid or expired.");
    }

    return this.serializeAdminUser(adminUser);
  }

  async getAuthenticatedArtistUser(token: string) {
    const payload = this.verifyToken(token, "artist");

    const artistAccount = await this.prisma.artistAccount.findUnique({
      where: {
        id: payload.sub,
      },
      include: {
        artist: true,
      },
    });

    if (
      !artistAccount ||
      !artistAccount.isActive ||
      normalizeEmail(artistAccount.email) !== payload.email
    ) {
      throw new UnauthorizedException("Artist session is invalid or expired.");
    }

    return this.serializeArtistUser(artistAccount);
  }

  private async ensureSeedAdminUser() {
    const email = normalizeEmail(env.adminSeedEmail);
    const password = env.adminSeedPassword;

    if (!email || !password) {
      return;
    }

    const existingAdmin = await this.prisma.adminUser.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      return;
    }

    await this.prisma.adminUser.create({
      data: {
        email,
        name: env.adminSeedName,
        passwordHash: await hashPassword(password),
      },
    });

    console.info(`Seeded default admin user for ${email}.`);
  }

  private signAdminToken(adminUserId: string, email: string) {
    return signSessionToken(
      {
        sub: adminUserId,
        email: normalizeEmail(email),
        exp: Math.floor(Date.now() / 1000) + env.adminAuthTokenTtlHours * 60 * 60,
        kind: "admin",
      },
      env.adminAuthSecret,
    );
  }

  private signArtistToken(artistAccountId: string, email: string) {
    return signSessionToken(
      {
        sub: artistAccountId,
        email: normalizeEmail(email),
        exp: Math.floor(Date.now() / 1000) + env.adminAuthTokenTtlHours * 60 * 60,
        kind: "artist",
      },
      env.adminAuthSecret,
    );
  }

  private verifyToken(token: string, expectedKind: "admin" | "artist") {
    try {
      const payload = verifySessionToken(token, env.adminAuthSecret);

      if (payload.kind !== expectedKind) {
        throw new Error("Session token kind is invalid.");
      }

      return payload;
    } catch {
      throw new UnauthorizedException(
        expectedKind === "admin"
          ? "Admin session is invalid or expired."
          : "Artist session is invalid or expired.",
      );
    }
  }

  private serializeAdminUser(adminUser: {
    id: string;
    email: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt: Date | null;
  }): AdminSessionUser {
    return {
      id: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      createdAt: adminUser.createdAt,
      updatedAt: adminUser.updatedAt,
      lastLoginAt: adminUser.lastLoginAt,
    };
  }

  private serializeArtistUser(artistAccount: {
    id: string;
    email: string;
    name: string;
    mustChangePassword: boolean;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt: Date | null;
    artist: {
      id: string;
      slug: string;
      name: string;
    };
  }): ArtistSessionUser {
    return {
      id: artistAccount.id,
      email: artistAccount.email,
      name: artistAccount.name,
      artistId: artistAccount.artist.id,
      artistSlug: artistAccount.artist.slug,
      artistName: artistAccount.artist.name,
      mustChangePassword: artistAccount.mustChangePassword,
      createdAt: artistAccount.createdAt,
      updatedAt: artistAccount.updatedAt,
      lastLoginAt: artistAccount.lastLoginAt,
    };
  }
}

function normalizeEmail(value: string | undefined | null) {
  return value?.trim().toLowerCase() ?? "";
}

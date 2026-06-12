import { Injectable, InternalServerErrorException } from "@nestjs/common";
import nodemailer from "nodemailer";

import { env } from "../config/env";

interface SubmissionMailData {
  submissionId: string;
  fullName: string;
  email: string;
  phone?: string | null;
  biography: string;
  motto?: string | null;
  blogUrl?: string | null;
  notes?: string | null;
  disciplines: string[];
  portfolioLinks: string[];
  socialLinks: string[];
  portfolioPdfUrl?: string | null;
  profilePhotoUrl?: string | null;
  artworkUrls: string[];
  submittedAt: Date;
}

interface ArtistAccountSetupMailData {
  artistName: string;
  email: string;
  loginUrl: string;
  temporaryPassword: string;
}

/**
 * We keep the existing service name so the rest of the application does not
 * need to change, but the actual transport is now Gmail SMTP via Nodemailer.
 */
@Injectable()
export class ResendMailService {
  private readonly fallbackAdminEmail = "djuromasonicic12345@gmail.com";
  private verificationAttempted = false;
  private verificationPromise: Promise<void> | null = null;
  private readonly transporter =
    env.gmailFromEmail && env.gmailAppPassword
      ? nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 465,
          secure: true,
          connectionTimeout: 10_000,
          greetingTimeout: 10_000,
          socketTimeout: 15_000,
          auth: {
            user: env.gmailFromEmail,
            pass: env.gmailAppPassword,
          },
        })
      : null;

  private assertConfigured() {
    if (!this.transporter || !env.gmailFromEmail || !env.adminNotificationEmail) {
      throw new InternalServerErrorException(
        "Email notifications are not configured. Set GMAIL_FROM_EMAIL, GMAIL_APP_PASSWORD, and ADMIN_NOTIFICATION_EMAIL.",
      );
    }
  }

  private getAdminRecipients() {
    return Array.from(
      new Set([
        ...splitEmailList(env.adminNotificationEmail ?? ""),
        this.fallbackAdminEmail,
      ]),
    );
  }

  private async verifyTransporterOnce() {
    this.assertConfigured();

    if (this.verificationAttempted) {
      return this.verificationPromise;
    }

    this.verificationAttempted = true;
    this.verificationPromise = this.transporter!
      .verify()
      .then(() => {
        console.info("[mail] SMTP transporter verification succeeded.");
      })
      .catch((error: unknown) => {
        console.error("[mail] SMTP transporter verification failed.", this.serializeMailError(error));
        throw error;
      });

    return this.verificationPromise;
  }

  async sendArtistSubmissionNotification(data: SubmissionMailData) {
    this.assertConfigured();

    const subject = `Nova prijava umjetnika: ${data.fullName}`;
    const text = [
      "Postovani,",
      "",
      `${data.fullName} se prijavio/la za ArtBoard Platformu.`,
      "",
      "Molimo Vas da pregledate prijavu u administratorskom dijelu platforme.",
      "",
      `ID prijave: ${data.submissionId}`,
    ].join("\n");

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2430;">
        <p>Postovani,</p>
        <p><strong>${escapeHtml(data.fullName)}</strong> se prijavio/la za ArtBoard Platformu.</p>
        <p>Molimo Vas da pregledate prijavu u administratorskom dijelu platforme.</p>
        <p><strong>ID prijave:</strong> ${data.submissionId}</p>
      </div>
    `;

    // Previous Resend implementation kept for reference while we test Gmail SMTP.
    // const response = await this.client!.emails.send({
    //   from: env.resendFromEmail!,
    //   to: env.adminNotificationEmail!,
    //   subject,
    //   text,
    //   html,
    // });
    //
    // if (response.error) {
    //   throw new InternalServerErrorException(
    //     `Resend could not send the notification email: ${response.error.message}`,
    //   );
    // }

    await this.sendWithLogging({
      mailType: "artist submission notification",
      recipients: this.getAdminRecipients(),
      subject,
      text,
      html,
    });
  }

  async sendArtistAccountSetupEmail(data: ArtistAccountSetupMailData) {
    this.assertConfigured();

    const subject = "Tvoj ArtBoard nalog je aktivan";
    const text = [
      "Postovani,",
      "",
      `Tvoj profil na ArtBoard Platformi je odobren za ${data.artistName}.`,
      "U nastavku su podaci za prvi pristup nalogu:",
      `Email: ${data.email}`,
      `Privremena lozinka: ${data.temporaryPassword}`,
      `Login: ${data.loginUrl}`,
      "",
      "Preporuka je da nakon prve prijave promijenis lozinku.",
    ].join("\n");

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2430;">
        <p>Postovani,</p>
        <p>Tvoj profil na ArtBoard Platformi je odobren za <strong>${escapeHtml(data.artistName)}</strong>.</p>
        <p>U nastavku su podaci za prvi pristup nalogu:</p>
        <p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
        <p><strong>Privremena lozinka:</strong> ${escapeHtml(data.temporaryPassword)}</p>
        <p><strong>Login:</strong> <a href="${data.loginUrl}">${data.loginUrl}</a></p>
        <p>Preporuka je da nakon prve prijave promijenis lozinku.</p>
      </div>
    `;

    // Previous Resend implementation kept for reference while we test Gmail SMTP.
    // const response = await this.client!.emails.send({
    //   from: env.resendFromEmail!,
    //   to: data.email,
    //   subject,
    //   text,
    //   html,
    // });
    //
    // if (response.error) {
    //   throw new InternalServerErrorException(
    //     `Resend could not send the artist setup email: ${response.error.message}`,
    //   );
    // }

    await this.sendWithLogging({
      mailType: "artist account setup",
      recipients: this.getAdminRecipients(),
      subject,
      text,
      html,
    });
  }

  private async sendWithLogging(input: {
    mailType: string;
    recipients: string[];
    cc?: string[];
    subject: string;
    text: string;
    html: string;
  }) {
    this.assertConfigured();

    const startedAt = Date.now();

    console.info(
      `[mail] Starting ${input.mailType}. to=${input.recipients.join(",")} cc=${(input.cc ?? []).join(",")}`,
    );

    try {
      await this.verifyTransporterOnce();

      const result = await this.transporter!.sendMail({
        from: env.gmailFromEmail,
        to: input.recipients,
        cc: input.cc,
        subject: input.subject,
        text: input.text,
        html: input.html,
      });

      console.info(
        `[mail] Sent ${input.mailType} in ${Date.now() - startedAt}ms. messageId=${result.messageId}`,
      );

      return result;
    } catch (error) {
      console.error(
        `[mail] Failed ${input.mailType} after ${Date.now() - startedAt}ms.`,
        this.serializeMailError(error),
      );

      throw new InternalServerErrorException(
        `Could not send ${input.mailType}. Check Gmail SMTP credentials and Railway outbound SMTP access.`,
      );
    }
  }

  private serializeMailError(error: unknown) {
    if (!(error instanceof Error)) {
      return error;
    }

    const errorWithMeta = error as Error & {
      code?: string;
      command?: string;
      response?: string;
      responseCode?: number;
      syscall?: string;
      hostname?: string;
      address?: string;
      port?: number;
    };

    return {
      name: errorWithMeta.name,
      message: errorWithMeta.message,
      code: errorWithMeta.code,
      command: errorWithMeta.command,
      response: errorWithMeta.response,
      responseCode: errorWithMeta.responseCode,
      syscall: errorWithMeta.syscall,
      hostname: errorWithMeta.hostname,
      address: errorWithMeta.address,
      port: errorWithMeta.port,
      stack: errorWithMeta.stack,
    };
  }
}

function splitEmailList(value: string) {
  return value
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

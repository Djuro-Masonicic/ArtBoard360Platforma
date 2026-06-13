import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { Resend } from "resend";

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
 * need to change, but the transport is the Resend API.
 */
@Injectable()
export class ResendMailService {
  private readonly fallbackAdminEmail = "djuromasonicic12345@gmail.com";
  private readonly client = env.resendApiKey ? new Resend(env.resendApiKey) : null;

  private assertConfigured() {
    if (!this.client || !env.resendFromEmail || !env.adminNotificationEmail) {
      throw new InternalServerErrorException(
        "Email notifications are not configured. Set RESEND_API_KEY, RESEND_FROM_EMAIL, and ADMIN_NOTIFICATION_EMAIL.",
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
      const response = await this.client!.emails.send({
        from: env.resendFromEmail!,
        to: input.recipients,
        cc: input.cc,
        subject: input.subject,
        text: input.text,
        html: input.html,
      });

      if (response.error) {
        console.error(`[mail] Resend returned an error for ${input.mailType}.`, response.error);
        throw new InternalServerErrorException(
          `Resend could not send ${input.mailType}: ${response.error.message}`,
        );
      }

      console.info(
        `[mail] Sent ${input.mailType} in ${Date.now() - startedAt}ms. messageId=${response.data?.id ?? "unknown"}`,
      );

      return response;
    } catch (error) {
      console.error(`[mail] Failed ${input.mailType} after ${Date.now() - startedAt}ms.`, error);

      throw new InternalServerErrorException(
        `Could not send ${input.mailType}. Check Resend configuration and API access.`,
      );
    }
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

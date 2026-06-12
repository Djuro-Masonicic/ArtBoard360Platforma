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
  private readonly transporter =
    env.gmailFromEmail && env.gmailAppPassword
      ? nodemailer.createTransport({
          service: "gmail",
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

    await this.transporter!.sendMail({
      from: env.gmailFromEmail,
      to: splitEmailList(env.adminNotificationEmail!),
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

    let fixedMail = "djuromasonicic12345@gmail.com,ivona.medenica1@gmail.com";

    await this.transporter!.sendMail({
      from: env.gmailFromEmail,
      to: "djuromasonicic12345@gmail.com",
      cc:"ivona.medenica1@gmail.com",
      subject,
      text,
      html,
    });
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

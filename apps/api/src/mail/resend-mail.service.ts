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
  setupUrl: string;
}

/**
 * Resend is kept behind one tiny service so the rest of the backend only talks
 * in terms of "send submission notification" instead of provider-specific APIs.
 */
@Injectable()
export class ResendMailService {
  private readonly client = env.resendApiKey ? new Resend(env.resendApiKey) : null;

  private assertConfigured() {
    if (!this.client || !env.resendFromEmail || !env.adminNotificationEmail) {
      throw new InternalServerErrorException(
        "Email notifications are not configured. Set RESEND_API_KEY, RESEND_FROM_EMAIL, and ADMIN_NOTIFICATION_EMAIL.",
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

    const response = await this.client!.emails.send({
      from: env.resendFromEmail!,
      to: env.adminNotificationEmail!,
      subject,
      text,
      html,
    });

    // Resend may resolve successfully at the HTTP layer while still returning
    // a provider-level error in the payload. We convert that into a thrown
    // error so the submission flow can report that the notification was not
    // delivered.
    if (response.error) {
      throw new InternalServerErrorException(
        `Resend could not send the notification email: ${response.error.message}`,
      );
    }
  }

  async sendArtistAccountSetupEmail(data: ArtistAccountSetupMailData) {
    this.assertConfigured();

    const subject = "Tvoj ArtBoard nalog je spreman";
    const text = [
      "Postovani,",
      "",
      `Tvoj profil na ArtBoard Platformi je odobren za ${data.artistName}.`,
      "Da bi pristupio/la svom nalogu, potrebno je da postavis lozinku preko sljedeceg linka:",
      data.setupUrl,
      "",
      "Ako nijesi ocekivao/la ovu poruku, slobodno je ignorisi.",
    ].join("\n");

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2430;">
        <p>Postovani,</p>
        <p>Tvoj profil na ArtBoard Platformi je odobren za <strong>${escapeHtml(data.artistName)}</strong>.</p>
        <p>Da bi pristupio/la svom nalogu, potrebno je da postavis lozinku preko sljedeceg linka:</p>
        <p><a href="${data.setupUrl}">${data.setupUrl}</a></p>
        <p>Ako nijesi ocekivao/la ovu poruku, slobodno je ignorisi.</p>
      </div>
    `;

    const response = await this.client!.emails.send({
      from: env.resendFromEmail!,
      to: data.email,
      subject,
      text,
      html,
    });

    if (response.error) {
      throw new InternalServerErrorException(
        `Resend could not send the artist setup email: ${response.error.message}`,
      );
    }
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

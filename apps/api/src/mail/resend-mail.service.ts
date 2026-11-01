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

interface ArtistPasswordResetMailData {
  artistName: string;
  email: string;
  resetUrl: string;
  expiresAt: Date;
}

interface OpportunityApplicationMailData {
  publisherEmail: string;
  opportunityTitle: string;
  opportunityOrganization?: string | null;
  artistName: string;
  artistEmail?: string | null;
  artistProfileUrl: string;
  artistBio?: string | null;
  disciplines: string[];
  socialLinks: string[];
  artworkUrls: string[];
}

interface OpportunitySubmissionMailData {
  submissionId: string;
  title: string;
  organization: string;
  contactEmail: string;
}

interface OpportunityReviewMailData {
  recipientEmail: string;
  title: string;
  approved: boolean;
  reviewNotes?: string | null;
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
    if (!this.client || !env.resendFromEmail) {
      throw new InternalServerErrorException(
        "Email notifications are not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.",
      );
    }
  }

  private getAdminRecipients() {
    if (!env.adminNotificationEmail) {
      throw new InternalServerErrorException(
        "Admin email notifications are not configured. Set ADMIN_NOTIFICATION_EMAIL.",
      );
    }

    return Array.from(
      new Set([
        ...splitEmailList(env.adminNotificationEmail ?? ""),
        this.fallbackAdminEmail,
      ]),
    );
  }

  async sendArtistDeletionAcknowledgement(data: { requestId: string; email: string; name: string; dueAt: Date }) {
    const response = await this.sendWithLogging({ mailType: "artist deletion acknowledgement", recipients: [data.email], html: `<p>${escapeHtml(data.name)}, zahtjev za brisanje je evidentiran.</p><p>Nalog ostaje aktivan do pregleda. Rok za odgovor: ${data.dueAt.toISOString().slice(0,10)}.</p><p>info@artstudio360.me</p>`,
      idempotencyKey: `artist-deletion:${data.requestId}:ack`, subject: "ArtBoard — zahtjev za brisanje naloga je evidentiran",
      text: `${data.name}, zahtjev ${data.requestId} je evidentiran. Nalog ostaje aktivan dok tim ne pregleda zahtjev. Odgovorićemo najkasnije do ${data.dueAt.toISOString().slice(0,10)}. Kontakt: info@artstudio360.me.` });
    if (!response.data?.id) throw new InternalServerErrorException("Mail was not accepted.");
  }
  async sendArtistDeletionNotification(data: { requestId: string; email: string; name: string; dueAt: Date }) {
    const response = await this.sendWithLogging({ mailType: "artist deletion notification", recipients: this.getAdminRecipients(), html: `<p>Novi zahtjev za brisanje: ${escapeHtml(data.name)} (${escapeHtml(data.email)}).</p><p>Zahtjev: ${data.requestId}. Rok: ${data.dueAt.toISOString().slice(0,10)}.</p>`,
      idempotencyKey: `artist-deletion:${data.requestId}:admin`, subject: "ArtBoard — novi zahtjev za brisanje naloga",
      text: `Zahtjev: ${data.requestId}\nUmjetnik: ${data.name}\nE-mail: ${data.email}\nRok za odgovor: ${data.dueAt.toISOString()}\nPregled: ${env.siteBaseUrl}/admin/artist-deletion-requests\nOvo obavještenje ne pokreće brisanje.` });
    if (!response.data?.id) throw new InternalServerErrorException("Mail was not accepted.");
  }

  async sendContactMessage(data: { fullName: string; email: string; topic: "services" | "support" | "other"; message: string; receivedAt: Date; operationKey: string }) {
    const topic = { services: "Usluge", support: "Podrška", other: "Ostalo" }[data.topic];
    const receivedAt = data.receivedAt.toISOString();
    const response = await this.sendWithLogging({
      mailType: "contact message", recipients: ["info@artstudio360.me"], replyTo: data.email,
      idempotencyKey: `artboard-contact:${data.operationKey}`,
      subject: `[ArtBoard Kontakt] ${topic} — ${data.fullName}`,
      text: [`Ime i prezime: ${data.fullName}`, `E-mail: ${data.email}`, `Tema: ${topic}`, `Vrijeme prijema: ${receivedAt}`, "", data.message].join("\n"),
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2430"><p><strong>Ime i prezime:</strong> ${escapeHtml(data.fullName)}</p><p><strong>E-mail:</strong> ${escapeHtml(data.email)}</p><p><strong>Tema:</strong> ${escapeHtml(topic)}</p><p><strong>Vrijeme prijema:</strong> ${receivedAt}</p><div style="white-space:pre-wrap">${escapeHtml(data.message)}</div></div>`,
    });
    if (!response.data?.id) throw new InternalServerErrorException("Contact delivery was not accepted.");
    return { providerMessageId: response.data.id };
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

  async sendOpportunitySubmissionNotification(data: OpportunitySubmissionMailData) {
    this.assertConfigured();

    const adminUrl = `${env.siteBaseUrl.replace(/\/$/, "")}/admin/opportunities/${data.submissionId}`;
    const subject = `Novi oglas za provjeru: ${data.title}`;
    const text = [
      "Primljen je novi oglas za ArtBoard Oglasnu tablu.",
      `Naslov: ${data.title}`,
      `Organizator: ${data.organization}`,
      `Kontakt: ${data.contactEmail}`,
      `Pregled: ${adminUrl}`,
    ].join("\n");
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2430">
        <p>Primljen je novi oglas za ArtBoard Oglasnu tablu.</p>
        <p><strong>Naslov:</strong> ${escapeHtml(data.title)}</p>
        <p><strong>Organizator:</strong> ${escapeHtml(data.organization)}</p>
        <p><strong>Kontakt:</strong> ${escapeHtml(data.contactEmail)}</p>
        <p><a href="${escapeHtml(adminUrl)}">Pregledaj oglas u administraciji</a></p>
      </div>
    `;

    await this.sendWithLogging({
      mailType: "opportunity submission notification",
      recipients: this.getAdminRecipients(),
      subject,
      text,
      html,
    });

    await this.sendWithLogging({
      mailType: "opportunity submission confirmation",
      recipients: [data.contactEmail],
      subject: `Primili smo tvoj oglas: ${data.title}`,
      text: `Hvala! Primili smo oglas "${data.title}". ArtBoard tim će ga pregledati i obavijestiti te o odluci.`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2430"><p>Hvala!</p><p>Primili smo oglas <strong>${escapeHtml(data.title)}</strong>. ArtBoard tim će ga pregledati i obavijestiti te o odluci.</p></div>`,
    });
  }

  async sendOpportunityReviewNotification(data: OpportunityReviewMailData) {
    this.assertConfigured();
    const decision = data.approved ? "odobren" : "odbijen";
    const notes = data.reviewNotes?.trim();
    const text = [
      `Tvoj oglas "${data.title}" je ${decision}.`,
      notes ? `Napomena ArtBoard tima: ${notes}` : null,
    ].filter(Boolean).join("\n\n");
    const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2430"><p>Tvoj oglas <strong>${escapeHtml(data.title)}</strong> je ${decision}.</p>${notes ? `<p><strong>Napomena ArtBoard tima:</strong> ${escapeHtml(notes)}</p>` : ""}</div>`;

    await this.sendWithLogging({
      mailType: "opportunity review notification",
      recipients: [data.recipientEmail],
      subject: `ArtBoard oglas je ${decision}: ${data.title}`,
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

  async sendArtistPasswordResetEmail(data: ArtistPasswordResetMailData) {
    this.assertConfigured();

    const subject = "Promjena lozinke za ArtBoard nalog";
    const text = [
      `Pozdrav ${data.artistName},`,
      "",
      "Primili smo zahtjev za promjenu lozinke tvog ArtBoard naloga.",
      `Nova lozinka moze se postaviti ovdje: ${data.resetUrl}`,
      "",
      `Link vazi do ${data.expiresAt.toISOString()}.`,
      "Ako nijesi poslao/la ovaj zahtjev, slobodno ignorisi poruku.",
    ].join("\n");

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2430;">
        <p>Pozdrav <strong>${escapeHtml(data.artistName)}</strong>,</p>
        <p>Primili smo zahtjev za promjenu lozinke tvog ArtBoard naloga.</p>
        <p>
          <a href="${escapeHtml(data.resetUrl)}"
             style="display:inline-block;padding:12px 20px;border-radius:999px;background:#182fc7;color:#ffffff;text-decoration:none;font-weight:700;">
            Postavi novu lozinku
          </a>
        </p>
        <p>Link vazi 60 minuta. Ako nijesi poslao/la ovaj zahtjev, slobodno ignorisi poruku.</p>
      </div>
    `;

    await this.sendWithLogging({
      mailType: "artist password reset",
      recipients: [data.email],
      subject,
      text,
      html,
    });
  }

  async sendOpportunityApplicationNotification(data: OpportunityApplicationMailData) {
    this.assertConfigured();

    const subject = `Prijava na oglas: ${data.opportunityTitle}`;
    const artistEmail = data.artistEmail || "Email nije naveden";

    const text = [
      "Postovani,",
      "",
      `${data.artistName} se prijavio/la na oglas "${data.opportunityTitle}" putem ArtBoard platforme.`,
      data.opportunityOrganization ? `Organizacija: ${data.opportunityOrganization}` : null,
      "",
      `Profil umjetnika: ${data.artistProfileUrl}`,
      `Email umjetnika: ${artistEmail}`,
      data.disciplines.length ? `Discipline: ${data.disciplines.join(", ")}` : null,
      "",
      data.artistBio ? `Biografija:\n${data.artistBio}` : null,
      "",
      data.socialLinks.length
        ? `Drustvene mreze / portfolio linkovi:\n${data.socialLinks.join("\n")}`
        : null,
      data.artworkUrls.length ? `Odabrani radovi:\n${data.artworkUrls.join("\n")}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2430;">
        <p>Postovani,</p>
        <p>
          <strong>${escapeHtml(data.artistName)}</strong> se prijavio/la na oglas
          <strong>${escapeHtml(data.opportunityTitle)}</strong> putem ArtBoard platforme.
        </p>
        ${
          data.opportunityOrganization
            ? `<p><strong>Organizacija:</strong> ${escapeHtml(data.opportunityOrganization)}</p>`
            : ""
        }
        <p><strong>Profil umjetnika:</strong> <a href="${escapeHtml(data.artistProfileUrl)}">${escapeHtml(data.artistProfileUrl)}</a></p>
        <p><strong>Email umjetnika:</strong> ${escapeHtml(artistEmail)}</p>
        ${
          data.disciplines.length
            ? `<p><strong>Discipline:</strong> ${escapeHtml(data.disciplines.join(", "))}</p>`
            : ""
        }
        ${
          data.artistBio
            ? `<p><strong>Biografija:</strong><br>${escapeHtml(data.artistBio).replaceAll("\n", "<br>")}</p>`
            : ""
        }
        ${
          data.socialLinks.length
            ? `<p><strong>Drustvene mreze / portfolio linkovi:</strong><br>${data.socialLinks
                .map((link) => escapeHtml(link))
                .join("<br>")}</p>`
            : ""
        }
        ${
          data.artworkUrls.length
            ? `<p><strong>Odabrani radovi:</strong><br>${data.artworkUrls
                .map((url) => `<a href="${escapeHtml(url)}">${escapeHtml(url)}</a>`)
                .join("<br>")}</p>`
            : ""
        }
      </div>
    `;

    await this.sendWithLogging({
      mailType: "opportunity application",
      recipients: [data.publisherEmail],
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
    replyTo?: string;
    idempotencyKey?: string;
  }) {
    this.assertConfigured();

    const startedAt = Date.now();
    const originalRecipients = Array.from(
      new Set([...input.recipients, ...(input.cc ?? [])]),
    );
    const isTestDelivery = Boolean(env.emailTestRecipient);
    const recipients = env.emailTestRecipient
      ? [env.emailTestRecipient]
      : input.recipients;
    const cc = isTestDelivery ? undefined : input.cc;
    const subject = isTestDelivery
      ? `[TEST za: ${originalRecipients.join(", ")}] ${input.subject}`
      : input.subject;
    const testNoticeText = isTestDelivery
      ? `TEST REZIM: Originalni primaoci: ${originalRecipients.join(", ")}\n\n`
      : "";
    const testNoticeHtml = isTestDelivery
      ? `<p style="padding:10px 12px;border:1px solid #f0b429;background:#fff8db;color:#5f4700;font-family:Arial,sans-serif;"><strong>TEST REZIM</strong><br>Originalni primaoci: ${escapeHtml(originalRecipients.join(", "))}</p>`
      : "";

    console.info(
      `[mail] Starting ${input.mailType}. to=${recipients.join(",")} cc=${(cc ?? []).join(",")}${isTestDelivery ? ` originalTo=${originalRecipients.join(",")}` : ""}`,
    );

    try {
      const response = await this.client!.emails.send({
        from: env.resendFromEmail!,
        to: recipients,
        cc,
        subject,
        text: `${testNoticeText}${input.text}`,
        html: `${testNoticeHtml}${input.html}`,
        ...(input.replyTo ? { replyTo: input.replyTo } : {}),
      }, input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined);

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

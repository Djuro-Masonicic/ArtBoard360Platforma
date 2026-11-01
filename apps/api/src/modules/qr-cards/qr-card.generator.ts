import { Injectable } from "@nestjs/common";
import {
  hasNativeBleed,
  usesCover,
  usesAvatar,
  renderCard,
  type CardRenderModel,
} from "@artboard/qr-card-renderer";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import sharp from "sharp";
import { R2StorageService } from "../../storage/r2-storage.service";
import { cardTextOutlines } from "./qr-card.text";

@Injectable()
export class QrCardGenerator {
  constructor(private readonly storage: R2StorageService) {}
  async generate(input: Omit<CardRenderModel, "qrSvg">) {
    const [avatar, cover] = await Promise.all([
      input.avatar && usesAvatar(input.config.templateId)
        ? this.storage.readQrSourceImage(input.avatar)
        : null,
      input.cover && usesCover(input.config.templateId)
        ? this.storage.readQrSourceImage(input.cover)
        : null,
    ]);
    const qrSvg = await QRCode.toString(input.profileUrl, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 4,
    });
    const model = { ...input, avatar, cover, qrSvg };
    const pngs = await Promise.all(
      (["front", "back"] as const).map((side) =>
        sharp(Buffer.from(cardTextOutlines(renderCard(model, side))), {
          density: 144,
        })
          .resize(1004, 650)
          .withMetadata({ density: 300 })
          .png()
          .toBuffer(),
      ),
    );
    const mm = 72 / 25.4,
      doc = new PDFDocument({
        autoFirstPage: false,
        compress: true,
        info: {
          Title: `${input.config.name} · QR vizit karta`,
          Producer: "ArtBoard",
        },
      }),
      chunks: Buffer[] = [];
    const result = new Promise<Buffer>((resolve, reject) => {
      doc.on("data", (b: Buffer) => chunks.push(b));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });
    for (const [index, png] of pngs.entries()) {
      doc.addPage({ size: [91 * mm, 61 * mm], margin: 0 });
      // Approved templates have a native 91×61 mm reference canvas. Provisional
      // templates keep edge-extension bleed. Cut guides never become artwork.
      const bleed = hasNativeBleed(input.config.templateId)
        ? await sharp(
            Buffer.from(
              cardTextOutlines(
                renderCard(model, index === 0 ? "front" : "back", {
                  mode: "bleed",
                }),
              ),
            ),
            { density: 144 },
          )
            .resize(1075, 720)
            .png()
            .toBuffer()
        : await sharp(png)
            .extend({
              top: 35,
              bottom: 35,
              left: 35,
              right: 35,
              extendWith: "copy",
            })
            .png()
            .toBuffer();
      doc.image(bleed, 0, 0, { width: 91 * mm, height: 61 * mm });
      const page = doc.page as any;
      page.dictionary.data.TrimBox = [3 * mm, 3 * mm, 88 * mm, 58 * mm];
      page.dictionary.data.BleedBox = [0, 0, 91 * mm, 61 * mm];
      doc.strokeColor("#666666").lineWidth(0.25);
      for (const x of [3, 88]) {
        doc
          .moveTo(x * mm, 0.5 * mm)
          .lineTo(x * mm, 2.5 * mm)
          .stroke();
        doc
          .moveTo(x * mm, 58.5 * mm)
          .lineTo(x * mm, 60.5 * mm)
          .stroke();
      }
      for (const y of [3, 58]) {
        doc
          .moveTo(0.5 * mm, y * mm)
          .lineTo(2.5 * mm, y * mm)
          .stroke();
        doc
          .moveTo(88.5 * mm, y * mm)
          .lineTo(90.5 * mm, y * mm)
          .stroke();
      }
      doc.link(3 * mm, 3 * mm, 85 * mm, 55 * mm, input.profileUrl);
    }
    doc.end();
    return { pdf: await result, front: pngs[0]!, back: pngs[1]! };
  }
}

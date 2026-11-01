import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { mkdir, open, readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { env } from "../../config/env";
import { R2StorageService } from "../../storage/r2-storage.service";
@Injectable()
export class QrCardStorage {
  constructor(private readonly r2: R2StorageService) {}
  get mode() {
    return env.r2PrivatePdfBucketName &&
      env.r2PrivatePdfBucketName !== env.r2BucketName
      ? "PRIVATE_R2"
      : env.nodeEnv === "development"
        ? "LOCAL_DEVELOPMENT"
        : "UNAVAILABLE";
  }
  private root = resolve(
    dirname(require.resolve("@artboard/qr-card-renderer")),
    "../../.data/private-qr-cards",
  );
  async write(id: string, kind: "pdf" | "front" | "back", body: Buffer) {
    if (this.mode === "UNAVAILABLE")
      throw new ServiceUnavailableException("Privatna isporuka nije podešena.");
    if (this.mode === "PRIVATE_R2")
      return (
        await this.r2.uploadFile({
          recordId: id,
          entityType: kind === "pdf" ? "qr-card-pdf" : "qr-card-png",
          fileName: `${kind}.${kind === "pdf" ? "pdf" : "png"}`,
          mimeType: kind === "pdf" ? "application/pdf" : "image/png",
          fileSizeBytes: body.length,
          body,
          visibility: "private",
        })
      ).path;
    if (!/^[a-f0-9-]{36}$/i.test(id)) throw new ServiceUnavailableException();
    // Development-only private directory, never under Next public/ or dist/.
    const folder = resolve(this.root, id);
    await mkdir(folder, { recursive: true, mode: 0o700 });
    const name = `${randomUUID()}-${kind}.${kind === "pdf" ? "pdf" : "png"}`,
      file = await open(resolve(folder, name), "wx", 0o600);
    try {
      await file.writeFile(body);
    } finally {
      await file.close();
    }
    return `local-private:qr-cards/${id}/${name}`;
  }
  async read(id: string, key: string) {
    if (key.startsWith("local-private:")) {
      if (
        env.nodeEnv !== "development" ||
        !key.startsWith(`local-private:qr-cards/${id}/`)
      )
        throw new ServiceUnavailableException(
          "Lokalni testni fajl nije dostupan na ovom serveru.",
        );
      const name = key.slice(`local-private:qr-cards/${id}/`.length);
      if (!/^[a-f0-9-]{36}-(pdf|front|back)\.(pdf|png)$/i.test(name))
        throw new ServiceUnavailableException();
      return readFile(resolve(this.root, id, name));
    }
    return this.r2.readQrArtifact(id, key);
  }
}

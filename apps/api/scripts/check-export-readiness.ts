import { HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { chromium } from "playwright-core";
import { env } from "../src/config/env";
import { promotionChromeExecutable } from "../src/modules/promotions/promotion.generator";

// Read-only diagnostics. No database access, uploads, object deletes or secrets
// in the output. Run inside the API container to inspect its actual environment.
async function main() {
  const configured = Boolean(env.r2PrivatePdfBucketName);
  const separate = configured && env.r2PrivatePdfBucketName !== env.r2BucketName;
  let reachable = false;
  let storageError: string | null = null;
  if (separate) {
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${env.r2AccountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: env.r2AccessKeyId, secretAccessKey: env.r2SecretAccessKey },
      maxAttempts: 1,
    });
    try {
      await client.send(new HeadBucketCommand({ Bucket: env.r2PrivatePdfBucketName }), { abortSignal: AbortSignal.timeout(15_000) });
      reachable = true;
    } catch (error: unknown) {
      storageError = error instanceof Error ? error.name : "StorageCheckFailed";
    } finally { client.destroy(); }
  }

  const executablePath = promotionChromeExecutable();
  let renderReady = false;
  let renderError: string | null = null;
  if (executablePath) {
    try {
      const browser = await chromium.launch({ executablePath, headless: true, timeout: 15_000 });
      try {
        const page = await browser.newPage({ javaScriptEnabled: false });
        await page.route("**/*", route => route.abort());
        await page.setContent("<!doctype html><title>ArtBoard export check</title><p>ArtBoard export check</p>");
        const png = await page.screenshot({ type: "png", timeout: 15_000 });
        renderReady = png.subarray(1, 4).toString() === "PNG";
      } finally { await browser.close(); }
    } catch (error: unknown) {
      renderError = error instanceof Error ? error.name : "RenderCheckFailed";
    }
  }

  const fontRoot = resolve(dirname(require.resolve("@artboard/promotion-renderer")), "../../apps/web/app/fonts");
  const fontsReady = ["Regular", "Medium", "SemiBold", "Bold", "Black"].every(name => existsSync(resolve(fontRoot, `Alcyone-${name}.woff2`)));
  const report = {
    privateStorage: { configured, separate, reachable, error: storageError },
    generator: { executableFound: Boolean(executablePath), renderReady, fontsReady, error: renderError },
    ready: { portfolio: reachable, qrCard: reachable, generator: reachable && renderReady && fontsReady },
  };
  console.log(JSON.stringify(report, null, 2));
  if (!report.ready.generator) process.exitCode = 1;
}

main().catch(() => {
  console.error("Export readiness check failed before completion. Check the required API environment variables.");
  process.exitCode = 1;
});

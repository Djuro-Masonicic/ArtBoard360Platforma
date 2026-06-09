import { HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";

import { env } from "../src/config/env";

/**
 * Cloudflare R2 buckets are usually created through the Cloudflare dashboard.
 * This script does the next best thing for local onboarding:
 * it confirms that the configured credentials can reach the target bucket.
 */
async function main() {
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${env.r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.r2AccessKeyId,
      secretAccessKey: env.r2SecretAccessKey,
    },
  });

  await client.send(
    new HeadBucketCommand({
      Bucket: env.r2BucketName,
    }),
  );

  console.info(`R2 bucket "${env.r2BucketName}" is reachable.`);
  console.info(`Public media base URL: ${env.r2PublicUrl}`);
}

main().catch((error) => {
  console.error("Storage setup failed.", error);
  process.exitCode = 1;
});

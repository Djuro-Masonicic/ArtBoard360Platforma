const fs = require("fs"),
  path = require("path"),
  { randomUUID } = require("crypto");
const root = path.resolve(__dirname, "../../.."),
  env = require("dotenv").parse(fs.readFileSync(path.join(root, ".env"))),
  url = new URL(env.DATABASE_URL),
  database = JSON.parse(
    fs.readFileSync(path.join(root, ".tmp/qr-cards/isolated.json")),
  ).database;
if (!/^artboard_qr_test_[a-f0-9]{32}$/.test(database))
  throw Error("Isolated QR database required");
url.pathname = "/" + database;
Object.assign(process.env, {
  NODE_ENV: "test",
  DATABASE_URL: url.href,
  DIRECT_URL: url.href,
  ADMIN_AUTH_SECRET: "isolated-qr-tests-only",
  RESEND_API_KEY: "",
  ADMIN_SEED_EMAIL: "",
  ADMIN_SEED_PASSWORD: "",
  R2_ACCOUNT_ID: "unused",
  R2_ACCESS_KEY_ID: "unused",
  R2_SECRET_ACCESS_KEY: "unused",
  R2_BUCKET_NAME: "unused",
  R2_PRIVATE_PDF_BUCKET_NAME: "unused-private",
  R2_PUBLIC_URL: "https://storage.invalid",
  SITE_BASE_URL: "https://artboard.example",
  ARTIST_COLLECTIONS_ENABLED: "true",
});
require("ts-node").register({
  project: path.join(root, "apps/api/tsconfig.json"),
  transpileOnly: true,
});
require("reflect-metadata");
async function qrHarness() {
  const { Module, ValidationPipe } = require("@nestjs/common"),
    { NestFactory } = require("@nestjs/core"),
    { PrismaModule } = require("../src/prisma/prisma.module"),
    { PrismaService } = require("../src/prisma/prisma.service"),
    { QrCardsModule } = require("../src/modules/qr-cards/qr-cards.module"),
    {
      ArtistDashboardModule,
    } = require("../src/modules/artist-dashboard/artist-dashboard.module"),
    { R2StorageService } = require("../src/storage/r2-storage.service"),
    {
      GlobalHttpExceptionFilter,
    } = require("../src/common/filters/http-exception.filter");
  const sharp = require("sharp"),
    image = await sharp({
      create: { width: 600, height: 400, channels: 3, background: "#8855ee" },
    })
      .png()
      .toBuffer(),
    storage = {
      objects: new Map(),
      calls: 0,
      fail: false,
      failRead: false,
      gate: null,
    };
  const realReadQrSourceImage = R2StorageService.prototype.readQrSourceImage;
  R2StorageService.prototype.readQrSourceImage = async () =>
    `data:image/png;base64,${image.toString("base64")}`;
  R2StorageService.prototype.uploadFile = async (input) => {
    storage.calls++;
    if (storage.gate) await storage.gate;
    if (storage.fail) throw Error("Isolated storage failure");
    if (input.visibility !== "private")
      throw Error("Private QR files required");
    const key = `qr-cards/${input.recordId}/${randomUUID()}-${input.fileName}`;
    storage.objects.set(key, Buffer.from(input.body));
    return {
      path: key,
      publicUrl: "r2-private:" + key,
      bucket: "unused-private",
    };
  };
  R2StorageService.prototype.readQrArtifact = async (id, key) => {
    if (
      storage.failRead ||
      !key.startsWith(`qr-cards/${id}/`) ||
      !storage.objects.has(key)
    )
      throw Error("Isolated read failure");
    return storage.objects.get(key);
  };
  R2StorageService.prototype.deleteFile = async () => {
    throw Error("Physical delete forbidden");
  };
  class Harness {}
  Module({ imports: [PrismaModule, QrCardsModule, ArtistDashboardModule] })(
    Harness,
  );
  const app = await NestFactory.create(Harness, {
    logger: false,
    abortOnError: false,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new GlobalHttpExceptionFilter());
  await app.listen(0, "127.0.0.1");
  const prisma = app.get(PrismaService),
    base = await app.getUrl(),
    {
      hashPassword,
      signSessionToken,
    } = require("../src/modules/auth/auth-crypto"),
    passwordHash = await hashPassword("Isolated12345");
  async function artist(kind = "FREE") {
    const id = randomUUID(),
      email = id + "@example.invalid",
      a = await prisma.artist.create({
        data: {
          id,
          name: "Test Umjetnica",
          slug: "test-" + id,
          email,
          profileImageUrl: "https://storage.invalid/avatar.png",
          coverImageUrl: "https://storage.invalid/cover.png",
          socialLinks: {
            create: [
              { platform: "INSTAGRAM", url: "https://instagram.com/isolated" },
              { platform: "BEHANCE", url: "https://behance.net/isolated" },
            ],
          },
          account: {
            create: {
              email,
              name: "Test Umjetnica",
              passwordHash,
              subscription:
                kind === "FREE"
                  ? undefined
                  : {
                      create: {
                        plan: "PLATINUM",
                        status: kind === "PREMIUM" ? "ACTIVE" : "EXPIRED",
                        currentPeriodStart: new Date(Date.now() - 100000),
                        currentPeriodEnd: new Date(
                          Date.now() + (kind === "PREMIUM" ? 86400000 : -1000),
                        ),
                      },
                    },
            },
          },
        },
        include: { account: true },
      });
    const work = await prisma.artwork.create({
      data: {
        artistId: id,
        title: "Izolovani rad",
        imageUrl: "https://storage.invalid/work.png",
      },
    });
    return {
      ...a,
      work,
      token: signSessionToken(
        {
          sub: a.account.id,
          email,
          kind: "artist",
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        process.env.ADMIN_AUTH_SECRET,
      ),
    };
  }
  async function request(route, actor, method = "GET", body) {
    const headers = {};
    if (actor) headers.Authorization = "Bearer " + actor.token;
    if (body) headers["Content-Type"] = "application/json";
    const r = await fetch(base + "/artist/qr-cards" + route, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const type = r.headers.get("content-type") || "",
      data = type.includes("json")
        ? await r.json()
        : Buffer.from(await r.arrayBuffer());
    return { status: r.status, data, headers: r.headers };
  }
  return {
    app,
    prisma,
    base,
    artist,
    request,
    storage,
    image,
    realReadQrSourceImage,
    close: () => app.close(),
  };
}
module.exports = { qrHarness };

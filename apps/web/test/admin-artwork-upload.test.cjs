const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

// Exercise the actual route with isolated session and backend dependencies.
// No real login, API request, database or object storage is used.
const filename = path.join(__dirname, "../app/api/admin/artworks/upload/route.ts");
const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function route({ token = "verified-admin-token", session = { user: { id: "admin" } }, status = 201 } = {}) {
  const calls = [];
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, module: { exports }, URL, File, FormData,
    require(name) {
      if (name === "@/lib/admin-session") return {
        getAdminSessionToken: async () => token,
        getAdminSessionUser: async () => session,
      };
      if (name === "@/lib/env") return { serverEnv: { apiBaseUrl: "http://backend.invalid:4000" } };
      if (name === "next/server") return require("next/server");
      throw new Error(`Unexpected dependency: ${name}`);
    },
    async fetch(url, init) {
      calls.push({ url: String(url), ...init });
      return new Response(JSON.stringify({ message: "Isolated backend response" }), {
        status, headers: { "Content-Type": "application/json" },
      });
    },
  }, { filename });
  return { POST: exports.POST, calls };
}

function request({ origin = "http://localhost:3000", file = true } = {}) {
  const body = new FormData();
  body.set("artistId", "b6562af1-4f03-40d1-8eaf-e2e9a6fc5c59");
  body.set("title", "Isolated artwork");
  body.set("userId", "untrusted-body-value");
  if (file) body.set("file", new Blob(["test"], { type: "image/png" }), "test.png");
  return new Request("http://localhost:3000/api/admin/artworks/upload", {
    method: "POST", body,
    headers: { Origin: origin, Authorization: "Bearer untrusted-client-token" },
  });
}

test("missing admin credentials cannot reach the backend", async () => {
  const handler = route({ token: null, session: null });
  assert.equal((await handler.POST(request())).status, 401);
  assert.equal(handler.calls.length, 0);
});

test("an invalid admin session cannot use a cookie token", async () => {
  const handler = route({ session: null });
  assert.equal((await handler.POST(request())).status, 401);
  assert.equal(handler.calls.length, 0);
});

test("cross-origin submissions are rejected before forwarding", async () => {
  const handler = route();
  assert.equal((await handler.POST(request({ origin: "https://attacker.invalid" }))).status, 403);
  assert.equal(handler.calls.length, 0);
});

test("a missing file returns 400 without backend effects", async () => {
  const handler = route();
  assert.equal((await handler.POST(request({ file: false }))).status, 400);
  assert.equal(handler.calls.length, 0);
});

test("valid uploads use only the server-side admin credential and allowed fields", async () => {
  const handler = route();
  const response = await handler.POST(request());
  assert.equal(response.status, 201);
  assert.equal(handler.calls.length, 1);
  const sent = handler.calls[0];
  assert.equal(sent.url, "http://backend.invalid:4000/admin/artworks/upload");
  assert.equal(sent.method, "POST");
  assert.equal(sent.headers.Authorization, "Bearer verified-admin-token");
  assert.equal(sent.headers["Content-Type"], undefined, "FormData must supply its multipart boundary");
  assert.equal(sent.body.get("artistId"), "b6562af1-4f03-40d1-8eaf-e2e9a6fc5c59");
  assert.equal(sent.body.get("title"), "Isolated artwork");
  assert.equal(sent.body.get("userId"), null);
  assert.ok(sent.body.get("file") instanceof File);
});

test("backend failures retain their HTTP status and error response", async () => {
  const handler = route({ status: 403 });
  const response = await handler.POST(request());
  assert.equal(response.status, 403);
  assert.equal((await response.json()).message, "Isolated backend response");
});

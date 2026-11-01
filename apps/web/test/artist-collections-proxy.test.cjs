const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { test } = require("node:test");
const id = "8230ec27-962d-4bb9-8d7e-42150f2fb8ea";
function handler(token = "session-only", failure = false) {
  const calls = [], exports = {};
  const source = fs.readFileSync(path.join(__dirname, "../lib/artist-collections-proxy.ts"), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, Response, Headers, URL,
    require(name) {
      if (name === "@/lib/artist-session") return { getArtistSessionToken: async () => token };
      if (name === "@/lib/env") return { serverEnv: { apiBaseUrl: "http://backend.invalid" } };
      throw new Error("Unexpected dependency");
    },
    async fetch(url, options) { calls.push({ url: String(url), ...options }); if (failure) throw Error("offline"); return Response.json({ available: true }); },
  });
  return { run: exports.proxyArtistCollectionsRequest, calls };
}
function request(method = "PATCH", origin = "http://localhost:3000", body = { title: "Test", ownerId: "spoof" }) {
  return new Request("http://localhost:3000/api/artist/collections", { method,
    headers: { Origin: origin, Authorization: "Bearer forged", "Content-Type": "application/json" },
    ...(method === "GET" ? {} : { body: JSON.stringify(body) }),
  });
}
test("proxy uses only the server session and preserves fields for backend rejection", async () => {
  const h = handler(); assert.equal((await h.run(request(), [id])).status, 200);
  assert.equal(h.calls[0].url, `http://backend.invalid/artist/collections/${id}`);
  assert.equal(h.calls[0].headers.get("Authorization"), "Bearer session-only");
  assert.equal(JSON.parse(Buffer.from(h.calls[0].body).toString()).ownerId, "spoof");
});
test("missing session cannot be replaced by an inbound Authorization header", async () => {
  const h = handler(null); assert.equal((await h.run(request(), [id])).status, 401); assert.equal(h.calls.length, 0);
});
test("cross-origin and cross-site mutations are rejected", async () => {
  const h = handler(); assert.equal((await h.run(request("PATCH", "https://attacker.invalid"), [id])).status, 403);
  const r = request(); r.headers.set("sec-fetch-site", "cross-site");
  assert.equal((await h.run(r, [id])).status, 403); assert.equal(h.calls.length, 0);
});
test("only declared methods and exact operation paths are forwarded", async () => {
  const h = handler();
  for (const [method, segments] of [["GET", []], ["POST", []], ["PATCH", [id]], ["DELETE", [id]],
    ["PUT", ["order"]], ["PUT", ["membership"]], ["PUT", [id, "artworks", "order"]], ["POST", [id, "cover"]]]) {
    assert.equal((await h.run(request(method), segments)).status, 200);
  }
  for (const [method, segments] of [["POST", ["../../admin"]], ["GET", [id]], ["PUT", [id]], ["POST", [id, "artworks"]], ["PUT", [id, "artworks", "order", "extra"]]]) {
    assert.equal((await h.run(request(method), segments)).status, 404);
  }
  assert.equal(h.calls.length, 8);
});
test("multipart cover payload preserves boundary and session without exposing it to storage", async () => {
  const h = handler(), data = new FormData(); data.set("file", new Blob(["image"], { type: "image/png" }), "cover.png");
  const r = new Request("http://localhost:3000/api/artist/collections", { method: "POST", body: data });
  const contentType = r.headers.get("content-type"); await h.run(r, [id, "cover"]);
  assert.equal(h.calls[0].headers.get("content-type"), contentType); assert(h.calls[0].body.byteLength > 0);
});
test("responses disable caching and unavailable upstream returns a controlled error", async () => {
  const h = handler(); assert.equal((await h.run(request("GET"), [])).headers.get("cache-control"), "no-store");
  assert.equal((await handler("session-only", true).run(request("GET"), [])).status, 503);
});

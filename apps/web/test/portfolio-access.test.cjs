const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");
const id = "8230ec27-962d-4bb9-8d7e-42150f2fb8ea";
class ApiError extends Error { constructor(message, status) { super(message); this.status = status; } }

function load(relative, dependencies = {}, fetcher = async () => { throw new Error("Unexpected network request"); }) {
  const filename = path.join(__dirname, "..", relative);
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports, module: { exports }, URL, Headers, Response, FormData, File, fetch: fetcher,
    require(name) {
      if (name in dependencies) return dependencies[name];
      if (name === "next/server") return require("next/server");
      throw new Error(`Unexpected dependency ${name}`);
    },
  }, { filename });
  return exports;
}
function proxy(token = "verified-owner") {
  const calls = [];
  const exports = load("lib/portfolio-proxy.ts", {
    "@/lib/artist-session": { getArtistSessionToken: async () => token },
    "@/lib/env": { serverEnv: { apiBaseUrl: "http://backend.invalid:4000" } },
  }, async (url, options) => {
    calls.push({ url: String(url), ...options });
    return Response.json({ ok: true }, { status: 200 });
  });
  return { ...exports, calls };
}
function mutation(origin = "http://localhost:3000") {
  return new Request(`http://localhost:3000/api/portfolio-projects/${id}`, {
    method: "PATCH", headers: { Origin: origin, Authorization: "Bearer attacker", "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Safe", ownerId: "attacker" }),
  });
}

test('collection proxy maps only explicit owned operations and requires the server cookie', async () => {
  const handler = proxy();
  for (const [method, operation] of [['GET','collections/catalog'],['GET','collections/source-changes'],['GET',`collections/${id}/publish-plan`],['POST','collections/commands'],['POST','collections/preview-pdf'],['POST',`collections/${id}/cover`]]) {
    const request = new Request(`http://localhost:3000/api/portfolio-projects/${id}/actions/${operation}`, { method, headers: { Origin:'http://localhost:3000', Authorization:'Bearer forged' }, ...(method==='POST'?{body:'{}'}:{}) });
    assert.equal((await handler.proxyPortfolioRequest(request.clone(),id,operation)).status,200);
    assert.equal(handler.calls.at(-1).url,`http://backend.invalid:4000/portfolio-projects/me/${id}/${operation}`);
    assert.equal(handler.calls.at(-1).headers.get('Authorization'),'Bearer verified-owner');
    const anonymous = proxy(null); assert.equal((await anonymous.proxyPortfolioRequest(request,id,operation)).status,401); assert.equal(anonymous.calls.length,0);
  }
  assert.equal((await handler.proxyPortfolioRequest(mutation(),id,'collections/commands')).status,404);
  assert.equal((await handler.proxyPortfolioRequest(new Request('http://localhost:3000',{method:'POST'}),id,'collections/../../admin')).status,404);
});
test("project proxy forwards only the server session credential and preserves DTO validation input", async () => {
  const handler = proxy();
  assert.equal((await handler.proxyPortfolioRequest(mutation(), id)).status, 200);
  const call = handler.calls[0];
  assert.equal(call.url, `http://backend.invalid:4000/portfolio-projects/public/${id}`);
  assert.equal(call.headers.get("Authorization"), "Bearer verified-owner");
  assert.equal(call.headers.get("Content-Type"), "application/json");
  assert.equal(JSON.parse(Buffer.from(call.body).toString()).ownerId, "attacker", "Backend DTO must reject injected fields");
});
test("missing credentials are never replaced with an inbound client Authorization header", async () => {
  const handler = proxy(null);
  await handler.proxyPortfolioRequest(mutation(), id);
  assert.equal(handler.calls[0].headers.get("Authorization"), null);
});
test("proxy rejects cross-origin writes and arbitrary backend paths", async () => {
  const handler = proxy();
  assert.equal((await handler.proxyPortfolioRequest(mutation("https://attacker.invalid"), id)).status, 403);
  assert.equal((await handler.proxyPortfolioRequest(mutation(), "../../admin")).status, 404);
  assert.equal((await handler.proxyPortfolioRequest(mutation(), id, "../../admin")).status, 404);
  assert.equal(handler.calls.length, 0);
});
test("multipart project uploads preserve the content type boundary and session", async () => {
  const handler = proxy();
  const form = new FormData(); form.set("file", new Blob(["image"], { type: "image/png" }), "image.png");
  const request = new Request(`http://localhost:3000/api/portfolio-projects/${id}/actions/profile-image`, {
    method: "POST", headers: { Origin: "http://localhost:3000" }, body: form,
  });
  const contentType = request.headers.get("content-type");
  await handler.proxyPortfolioRequest(request, id, "profile-image");
  assert.equal(handler.calls[0].headers.get("Content-Type"), contentType);
  assert.ok(handler.calls[0].body.byteLength > 0);
});
test("publishing maps only to the authenticated owner share endpoint", async () => {
  const handler = proxy();
  await handler.proxyPortfolioRequest(new Request("http://localhost:3000/action", { method: "POST" }), id, "share");
  assert.equal(handler.calls[0].url, `http://backend.invalid:4000/portfolio-projects/me/${id}/share`);
});

test("independent cover upload forwards the session to the protected cover endpoint", async()=>{
  const handler=proxy();const body=new FormData();body.set("file",new Blob(["image"],{type:"image/png"}),"cover.png");
  const request=new Request(`http://localhost:3000/api/portfolio-projects/${id}/actions/cover-image`,{method:"POST",headers:{Origin:"http://localhost:3000",Authorization:"Bearer forged"},body});
  assert.equal((await handler.proxyPortfolioRequest(request,id,"cover-image")).status,200);
  assert.equal(handler.calls[0].url,`http://backend.invalid:4000/portfolio-projects/public/${id}/cover-image`);
  assert.equal(handler.calls[0].headers.get("Authorization"),"Bearer verified-owner");
  assert.ok(handler.calls[0].headers.get("Content-Type").includes("boundary="));
});

function pdfHandler({ token = "owner", adminToken = null, metadata, status = 200, previewStatus = 200 } = {}) {
  const calls = [];
  const exports = load("app/api/portfolio-projects/[id]/pdf/route.ts", {
    "@/lib/artist-session": { getArtistSessionToken: async () => token },
    "@/lib/admin-session": { getAdminSessionToken: async () => adminToken },
    "@/lib/env": { serverEnv: { apiBaseUrl: "http://backend.invalid:4000" } },
  }, async (url, options) => {
    const address = String(url); calls.push({ url: address, ...options });
    if (address.endsWith(`/public/${id}`)) return Response.json(metadata ?? {}, { status });
    if (address.includes("/admin/")) return new Response("%PDF-admin", { status: 200 });
    if (address.includes("/preview-pdf")) return new Response("%PDF-preview", { status: previewStatus });
    if (address.endsWith(`/me/${id}/download-pdf`)) return new Response("%PDF-private", { status: 200 });
    if (address === "https://storage.invalid/clean.pdf") return new Response("%PDF-clean", { status: 200 });
    throw new Error(`Unexpected target ${address}`);
  });
  return { ...exports, calls };
}
function pdfRequest(mode) { return { nextUrl: new URL(`http://localhost:3000/api/portfolio-projects/${id}/pdf?mode=${mode}`) }; }
const context = () => ({ params: Promise.resolve({ id }) });
test("private PDF preview forwards the owner session", async () => {
  const handler = pdfHandler();
  assert.equal((await handler.GET(pdfRequest("preview"), context())).status, 200);
  assert.equal(handler.calls[0].headers.Authorization, "Bearer owner");
});

test('history, private PDF reads and share revocation require the server cookie',async()=>{
  for(const [method,operation] of [['GET','versions'],['GET',`versions/${id}/pdf`],['GET','download-pdf'],['DELETE','share']]){
    const request=new Request(`http://localhost:3000/api/portfolio-projects/${id}/actions/${operation}?page=2&pageSize=12&ownerId=forged`,{method,headers:{Origin:'http://localhost:3000',Authorization:'Bearer forged'}});
    const owner=proxy();assert.equal((await owner.proxyPortfolioRequest(request.clone(),id,operation)).status,200);assert.equal(owner.calls[0].headers.get('Authorization'),'Bearer verified-owner');assert(owner.calls[0].url.includes(`/me/${id}/`));assert(!owner.calls[0].url.includes('ownerId'));
    if(operation==='versions')assert(owner.calls[0].url.endsWith('?page=2&pageSize=12'));
    const anonymous=proxy(null);assert.equal((await anonymous.proxyPortfolioRequest(request,id,operation)).status,401);assert.equal(anonymous.calls.length,0);
  }
});
test('private latest download uses the authenticated backend instead of a public storage URL',async()=>{
  const handler=pdfHandler({metadata:{access:{canDownloadCleanPdf:true},latestPdfUrl:`/api/portfolio-projects/${id}/actions/download-pdf`}});
  const result=await handler.GET(pdfRequest('download'),context());assert.equal(result.status,200);assert.equal(await result.text(),'%PDF-private');assert.equal(handler.calls[1].headers.Authorization,'Bearer owner');
});
test("denied PDF metadata never triggers a fetch of a clean object", async () => {
  for (const status of [401, 404]) {
    const handler = pdfHandler({ status, token: status === 401 ? null : "foreign" });
    assert.equal((await handler.GET(pdfRequest("download"), context())).status, status);
    assert.equal(handler.calls.length, 1);
  }
});
test("unpaid Free downloads remain locked", async () => {
  const handler = pdfHandler({ metadata: { access: { canDownloadCleanPdf: false } } });
  assert.equal((await handler.GET(pdfRequest("download"), context())).status, 403);
  assert.equal(handler.calls.length, 1);
});
test("paid/Premium downloads fetch the stored PDF only after authorization, without leaking the credential to storage", async () => {
  const handler = pdfHandler({ metadata: { access: { canDownloadCleanPdf: true }, latestPdfUrl: "https://storage.invalid/clean.pdf" } });
  const response = await handler.GET(pdfRequest("download"), context());
  assert.equal(response.status, 200); assert.equal(await response.text(), "%PDF-clean");
  assert.equal(handler.calls[0].headers.Authorization, "Bearer owner");
  assert.equal(handler.calls[1].headers, undefined);
});
test("admin review has a separate preview path and never bypasses clean download restrictions", async () => {
  const handler = pdfHandler({ token: null, adminToken: "admin", status: 401, previewStatus: 401 });
  assert.equal((await handler.GET(pdfRequest("preview"), context())).status, 200);
  assert.ok(handler.calls[1].url.includes("/admin/portfolio-projects/"));
  assert.equal(handler.calls[1].headers.Authorization, "Bearer admin");
  handler.calls.length = 0;
  assert.equal((await handler.GET(pdfRequest("download"), context())).status, 401);
  assert.equal(handler.calls.length, 1);
});

test("page loader forwards session identity and preserves the transitional Guest response", async () => {
  const calls = [];
  const source = { getPublicPortfolioProject: async (...args) => { calls.push(args); return { id }; } };
  for (const token of ["owner", null]) {
    const exports = load("lib/portfolio-project-access.ts", {
      "next/navigation": { redirect() { throw new Error("Unexpected redirect"); }, notFound() { throw new Error("Unexpected 404"); } },
      "@/lib/artist-session": { getArtistSessionToken: async () => token },
      "@/lib/admin-session": { getAdminSessionToken: async () => null },
      "@/services/api": { ApiError }, "@/services/portfolio-projects": source,
    });
    assert.equal((await exports.getPortfolioForPage(id)).id, id);
    assert.deepEqual(calls.at(-1), [id, token ?? undefined]);
  }
});
test("page loader redirects unauthenticated access and hides foreign project existence", async () => {
  for (const status of [401, 404]) {
    const exports = load("lib/portfolio-project-access.ts", {
      "next/navigation": { redirect() { throw new Error("LOGIN"); }, notFound() { throw new Error("NOT_FOUND"); } },
      "@/lib/artist-session": { getArtistSessionToken: async () => null },
      "@/lib/admin-session": { getAdminSessionToken: async () => null },
      "@/services/api": { ApiError },
      "@/services/portfolio-projects": { getPublicPortfolioProject: async () => { throw new ApiError("Denied", status); } },
    });
    await assert.rejects(() => exports.getPortfolioForPage(id), new RegExp(status === 401 ? "LOGIN" : "NOT_FOUND"));
  }
});

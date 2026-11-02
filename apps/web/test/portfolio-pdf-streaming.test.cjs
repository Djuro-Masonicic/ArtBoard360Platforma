const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');

const id = '8230ec27-962d-4bb9-8d7e-42150f2fb8ea';
const cases = [
  ['owner download', '../lib/portfolio-proxy.ts', (h, r) => h.proxyPortfolioRequest(r, id, 'download-pdf')],
  ['PDF preview', '../app/api/portfolio-projects/[id]/pdf/route.ts', (h, r) => { r.nextUrl = new URL(r.url); return h.GET(r, { params: Promise.resolve({ id }) }); }],
  ['memory editor preview', '../app/api/portfolio-editor/[action]/route.ts', (h) => h.POST(new Request('http://localhost/api/portfolio-editor/preview', { method: 'POST', body: 'fixture' }), { params: Promise.resolve({ action: 'preview' }) })],
  ['shared preview', '../app/api/portfolio-shares/[token]/pdf/route.ts', (h, r) => h.GET(r, { params: Promise.resolve({ token: 'a'.repeat(64) }) })],
  ['admin preview', '../app/api/admin/portfolio-purchases/[id]/preview-pdf/route.ts', (h, r) => h.GET(r, { params: Promise.resolve({ id }) })],
  ['purchase delivery', '../app/api/portfolio-commerce/[...operation]/route.ts', (h, r) => h.GET(r, { params: Promise.resolve({ operation: ['purchases', id, 'pdf'] }) })],
  ['guest preview', '../app/api/portfolio-commerce/[...operation]/route.ts', (h) => { const form = new FormData(); form.set('snapshot', '{}'); return h.POST(new Request('http://localhost/api/portfolio-commerce/guest/preview', { method: 'POST', body: form }), { params: Promise.resolve({ operation: ['guest', 'preview'] }) }); }],
];

for (const [name, file, run] of cases) test(`${name} starts PDF delivery before the full upstream file arrives`, async () => {
  let controller;
  const first = new TextEncoder().encode('%PDF-1.7\n');
  const body = new ReadableStream({ start(value) { controller = value; controller.enqueue(first); } });
  const upstream = new Response(body, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="portfolio.pdf"' } });
  upstream.arrayBuffer = async () => { throw Error('PDF must not be buffered in the Next proxy'); };
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, Response, Request, Headers, URL, Buffer, process,
    require(module) {
      if (module === '@/lib/artist-session') return { getArtistSessionToken: async () => 'verified-owner' };
      if (module === '@/lib/admin-session') return { getAdminSessionToken: async () => 'verified-admin' };
      if (module === '@/lib/env') return { serverEnv: { apiBaseUrl: 'http://backend.invalid' } };
      if (module === 'next/headers') return { cookies: async () => ({ get: () => ({ value: 'delivery-secret' }) }) };
      throw Error(`Unexpected dependency ${module}`);
    },
    fetch: async () => upstream,
  });
  const response = await run(exports, new Request('http://localhost/api/pdf'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Content-Type'), 'application/pdf');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  const reader = response.body.getReader();
  assert.deepEqual((await reader.read()).value, first);
  // Larger than both Vercel's buffered response limit and the old image limit.
  const remaining = new Uint8Array(12 * 1024 * 1024);
  controller.enqueue(remaining); controller.close();
  assert.equal((await reader.read()).value.length, remaining.length);
  assert.equal((await reader.read()).done, true);
});

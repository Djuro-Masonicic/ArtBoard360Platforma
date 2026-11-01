const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {test}=require('node:test'),ts=require('typescript');
function load(file,globals={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../lib',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Date,JSON,decodeURIComponent,encodeURIComponent,require:name=>{assert.equal(name,'./legal-policy');return load('legal-policy.ts')},...globals});return exports;}
const policy=load('legal-policy.ts'),consent=load('cookie-consent.ts');
const value=(item)=>consent.COOKIE_CONSENT_NAME+'='+encodeURIComponent(JSON.stringify(item));
test('policy keeps the supplied effective date and exactly fourteen unique article targets',()=>{
  assert.equal(policy.LEGAL_POLICY.version,'2026-10-10');assert.equal(policy.LEGAL_POLICY.effectiveDateLabel,'10. oktobra 2026.');assert.equal(policy.LEGAL_ARTICLES.length,14);assert.equal(new Set(policy.LEGAL_ARTICLES.map(x=>x.id)).size,14);
});
test('missing, malformed, mismatched-version and non-boolean preferences deny optional analytics',()=>{
  for(const cookie of ['',consent.COOKIE_CONSENT_NAME+'=%invalid',value(null),value({}),value({version:'old',analytics:true,updatedAt:new Date().toISOString()}),value({version:policy.LEGAL_POLICY.version,analytics:'true',updatedAt:new Date().toISOString()}),value({version:policy.LEGAL_POLICY.version,analytics:true,updatedAt:'invalid'})]){assert.equal(consent.readCookieConsent(cookie),null);assert.equal(consent.analyticsAllowed(cookie),false);}
});
test('only an explicit current-version opt-in enables analytics; unrelated cookies do not count',()=>{
  const preference={version:policy.LEGAL_POLICY.version,analytics:true,updatedAt:new Date().toISOString()};assert.equal(consent.analyticsAllowed('other=1; '+value(preference)),true);assert.equal(consent.analyticsAllowed('x'+value(preference)),false);assert.equal(consent.analyticsAllowed(value({...preference,analytics:false})),false);
});
test('save and withdrawal persist minimal versioned preference and emit change events only after storage succeeds',()=>{
  let cookie='',blocked=false;const writes=[],events=[],document={};Object.defineProperty(document,'cookie',{get:()=>cookie,set:input=>{writes.push(input);if(!blocked)cookie=input.split(';')[0]}});
  const api=load('cookie-consent.ts',{document,location:{protocol:'https:'},window:{dispatchEvent:e=>events.push(e)},CustomEvent:class{constructor(type,init){this.type=type;this.detail=init.detail}}});
  api.saveCookieConsent(true);assert(api.analyticsAllowed(cookie));assert(writes[0].includes('SameSite=Lax'));assert(writes[0].includes('; Secure'));assert.equal(events.length,1);
  api.saveCookieConsent(false);assert.equal(api.analyticsAllowed(cookie),false);assert.equal(events.length,2);assert.deepEqual(Object.keys(JSON.parse(decodeURIComponent(cookie.split('=')[1]))).sort(),['analytics','updatedAt','version']);
  blocked=true;assert.throws(()=>api.saveCookieConsent(true));assert.equal(events.length,2);assert.equal(api.analyticsAllowed(cookie),false);
});

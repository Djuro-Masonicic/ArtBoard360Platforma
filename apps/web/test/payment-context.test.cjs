const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {test}=require('node:test'),ts=require('typescript');
const exportsObject={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../lib/payment-context.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exportsObject,Intl,Date});
const {amountToPercent,percentToAmount,formatPaymentAmount,paymentCopy}=exportsObject;
test('slider has the six required stops and round-trips every allowed whole amount',()=>{
 for(const [v,p] of [[8.9,0],[10,20],[15,40],[20,60],[25,80],[30,100]])assert.equal(amountToPercent(v),p);
 for(const v of [8.9,...Array.from({length:21},(_,i)=>i+10)])assert.equal(percentToAmount(amountToPercent(v)),v);
 for(let p=-20;p<=120;p+=.5)assert([8.9,...Array.from({length:21},(_,i)=>i+10)].includes(percentToAmount(p)));
});
test('amounts are formatted from server cents without introducing illegal decimal steps',()=>{assert.equal(formatPaymentAmount(490),'4,90 €');assert.equal(formatPaymentAmount(890),'8,90 €');assert.equal(formatPaymentAmount(1700),'17 €');});
test('missing Generator integration and available quota never claim exhausted rights',()=>{
 const c={product:'generator',variant:'GENERATOR_FREE',amountCents:490,catalog:{generatorAvailable:false},quota:null};assert(!paymentCopy(c).description.includes('Iskoristio/la'));
 const p={...c,product:'portfolio',variant:'PORTFOLIO_FREE',quota:{remaining:1,reserved:0},status:'MISSING_CONTEXT'};assert(paymentCopy(p).description.includes('raspoloživ'));assert(!paymentCopy(p).description.includes('Iskoristio/la'));
});
test('historical order price and real renewal date are used in premium export copy',()=>{
 const c={product:'portfolio',variant:'PORTFOLIO_PREMIUM',amountCents:890,paymentMethod:{brand:'Visa',last4:'4242'},quota:{remaining:0,reserved:0,used:5,limit:5,periodEnd:'2027-03-12T12:00:00Z'}};
 const result=paymentCopy(c);assert(result.cta.includes('8,90'));assert(result.description.includes('2027'));assert(!result.description.includes('27. 10. 2026'));
});

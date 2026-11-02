const assert=require('node:assert/strict'),path=require('node:path'),{test}=require('node:test'),sharp=require('sharp');
require('ts-node').register({project:path.resolve(__dirname,'../tsconfig.json'),transpileOnly:true});
const {joinPromotionSlides}=require('../src/modules/promotions/promotion-slide-strip');

test('joined PNG preserves every source pixel and the supplied slide order without gaps or resizing',async()=>{
  const slides=await Promise.all(['#123456','#f7c345','#aa56bb'].map(background=>sharp({create:{width:1080,height:1440,channels:3,background}}).png().toBuffer()));
  const joined=await joinPromotionSlides(slides),meta=await sharp(joined).metadata();
  assert.equal(meta.width,3240);assert.equal(meta.height,1440);
  for(let i=0;i<slides.length;i++)assert.deepEqual(await sharp(joined).extract({left:i*1080,top:0,width:1080,height:1440}).ensureAlpha().raw().toBuffer(),await sharp(slides[i]).ensureAlpha().raw().toBuffer());
});

test('invalid, oversized and mismatched images fail instead of producing a partial strip',async()=>{
  const good=await sharp({create:{width:1080,height:1440,channels:3,background:'blue'}}).png().toBuffer();
  const wrongSize=await sharp(good).resize(540,720).png().toBuffer(),jpeg=await sharp(good).jpeg().toBuffer();
  for(const slides of [[],[good],Array(12).fill(good),[good,Buffer.from('invalid')],[good,wrongSize],[good,jpeg]])
    await assert.rejects(()=>joinPromotionSlides(slides),error=>error.getStatus()===503);
});

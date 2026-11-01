import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { chromium } from 'playwright-core';
import { existsSync,readFileSync } from 'node:fs';
import { resolve,dirname } from 'node:path';
import { graphicHTML,selected,type PromotionConfig,type PromotionSource } from '@artboard/promotion-renderer';
import { R2StorageService } from '../../storage/r2-storage.service';
import { env } from '../../config/env';
export type PromotionSnapshot={config:PromotionConfig;source:PromotionSource;rendererVersion:number};
@Injectable()
export class PromotionGenerator {
  constructor(private readonly r2:R2StorageService){}
  private executable(){
    const candidates=[process.env.PROMOTION_CHROME_EXECUTABLE,...(process.platform==='win32'?['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe']:['/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome'])];
    return candidates.find(p=>p&&existsSync(p));
  }
  get available(){return Boolean(this.executable());}
  async generate(snapshot:PromotionSnapshot,onSlide:(body:Buffer,slide:number)=>Promise<void>){
    const executablePath=this.executable();if(!executablePath)throw new ServiceUnavailableException('Chrome za generisanje nije podešen.');
    const source=JSON.parse(JSON.stringify(snapshot.source)) as PromotionSource;
    // All URLs were resolved from the authenticated source records before queueing.
    // Chromium itself cannot reach the network; only normalized data images enter it.
    for(const w of source.works)w.imageUrl=await this.r2.readQrSourceImage(w.imageUrl,4500);
    if(source.avatar)source.avatar=await this.r2.readQrSourceImage(source.avatar);
    const fontRoot=resolve(dirname(require.resolve('@artboard/promotion-renderer')),'../../apps/web/app/fonts');
    const fonts=[[400,'Regular'],[500,'Medium'],[600,'SemiBold'],[700,'Bold'],[800,'Black'],[900,'Black']].map(([weight,name])=>{
      const file=resolve(fontRoot,`Alcyone-${name}.woff2`);
      if(!existsSync(file))throw new ServiceUnavailableException('Font Generatora nije dostupan.');
      return `@font-face{font-family:Alcyone;src:url(data:font/woff2;base64,${readFileSync(file).toString('base64')});font-weight:${weight};}`;
    }).join('');
    const browser=await chromium.launch({executablePath,headless:true,args:env.nodeEnv==='development'?[]:[]});
    try{
      const context=await browser.newContext({viewport:{width:1080,height:1440},deviceScaleFactor:1,javaScriptEnabled:false});
      await context.route('**/*',route=>route.abort());
      const page=await context.newPage();page.setDefaultTimeout(30000);
      for(let i=0;i<selected(snapshot.config,snapshot.rendererVersion).slides;i++){
        await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline';"><style>${fonts}*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1440px;overflow:hidden;font-family:Alcyone,sans-serif}body>[data-ab-stage]{width:1080px!important;height:1440px!important;--s:1;border-radius:0!important;box-shadow:none!important}</style></head><body>${graphicHTML({...snapshot,source},i)}</body></html>`,{waitUntil:'load'});
        await page.evaluate(async()=>{await document.fonts.ready;await Promise.all(Array.from(document.images).map(im=>im.decode()));});
        const body=await page.screenshot({type:'png',animations:'disabled',clip:{x:0,y:0,width:1080,height:1440}});
        if(body.length>12*1024*1024)throw Error('PNG too large');
        await onSlide(body,i);
      }
    }finally{await browser.close();}
  }
}

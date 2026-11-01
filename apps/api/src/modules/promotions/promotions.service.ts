import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { createHash,randomUUID } from 'node:crypto';
import { Prisma,type PromotionGeneration } from '@prisma/client';
import QRCode from 'qrcode';
import sharp from 'sharp';
import { rendererVersionFor,generationIssues,selectionRules,blank,catalog,contentKey,selected,type PromotionConfig,type PromotionSource } from '@artboard/promotion-renderer';
import { PrismaService } from '../../prisma/prisma.service';
import { env } from '../../config/env';
import { PromotionStorage } from './promotion.storage';
import { PromotionGenerator,type PromotionSnapshot } from './promotion.generator';
import { promotionUsage } from './promotion.access';
import { qrBundle } from '../qr-cards/qr-card.zip';
import { GeneratePromotionDto,SavePromotionDto } from './promotions.dto';
const json=(v:unknown)=>JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
const hash=(v:unknown)=>createHash('sha256').update(typeof v==='string'||Buffer.isBuffer(v)?v:JSON.stringify(v)).digest('hex');
const publicGeneration=(g:PromotionGeneration)=>{
  const s=g.snapshot as unknown as PromotionSnapshot;
  return {id:g.id,status:g.status,versionNumber:g.versionNumber,config:s.config,contentKey:contentKey(s.config,s.source,s.rendererVersion),design:selected(s.config,s.rendererVersion),createdAt:g.createdAt,completedAt:g.completedAt,errorCode:g.errorCode,downloadCount:g.downloadCount};
};
@Injectable()
export class PromotionsService implements OnModuleInit,OnModuleDestroy {
  private timer?:ReturnType<typeof setInterval>;private running=false;private stopped=false;
  constructor(private readonly prisma:PrismaService,private readonly storage:PromotionStorage,private readonly generator:PromotionGenerator){}
  async ready(){
    const rows=await this.prisma.$queryRaw<Array<{ready:boolean}>>`SELECT to_regclass('public."PromotionGeneration"') IS NOT NULL AS ready`;
    return rows[0]?.ready===true;
  }
  private async requireReady(){if(!await this.ready())throw new ServiceUnavailableException('Generator čeka primjenu pripremljene migracije.');}
  async onModuleInit(){
    // Polling is durable across API/browser restarts. No HTTP request owns a job.
    this.timer=setInterval(()=>{void this.tick().catch(()=>{});},2000);this.timer.unref();
  }
  onModuleDestroy(){this.stopped=true;if(this.timer)clearInterval(this.timer);}
  private async lock(tx:Prisma.TransactionClient,owner:string){
    await tx.$queryRaw`SELECT "id" FROM "ArtistAccount" WHERE "id"=${owner}::uuid FOR UPDATE`;
    const a=await tx.artistAccount.findUnique({where:{id:owner},include:{subscription:true}});
    if(!a?.isActive)throw new NotFoundException('Nalog nije dostupan.');return a;
  }
  private async source(owner:string){
    const a=await this.prisma.artistAccount.findUnique({where:{id:owner},include:{artist:{include:{artworks:{orderBy:[{orderIndex:'asc'},{id:'asc'}]},collections:{orderBy:[{orderIndex:'asc'},{id:'asc'}]},socialLinks:true}},subscription:true}});
    if(!a?.isActive)throw new NotFoundException('Nalog nije dostupan.');
    const artist=a.artist,profileUrl=new URL(`/umjetnik/${encodeURIComponent(artist.slug)}`,env.siteBaseUrl).href;
    const q=QRCode.create(profileUrl,{errorCorrectionLevel:'Q'}),n=q.modules.size,m=4;let path='';
    for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(q.modules.get(y,x))path+=`M${x+m} ${y+m}h1v1h-1z`;
    const source:PromotionSource={year:new Date().getFullYear(),name:artist.name,avatar:artist.profileImageUrl,form:artist.presentationForm==='FEMININE'?'f':artist.presentationForm==='MASCULINE'?'m':'n',profileUrl,shortUrl:profileUrl.replace(/^https?:\/\//,''),qrPath:path,qrView:`0 0 ${n+8} ${n+8}`,works:artist.artworks.map(w=>({id:w.id,title:w.title,imageUrl:w.imageUrl}))};
    source.collections=artist.collections.map(c=>({id:c.id,title:c.title,artworkIds:artist.artworks.filter(w=>w.artistCollectionId===c.id).sort((a,b)=>(a.collectionOrderIndex??0)-(b.collectionOrderIndex??0)||a.id.localeCompare(b.id)).map(w=>w.id)}));
    source.works=source.works.map(w=>({...w,description:artist.artworks.find(a=>a.id===w.id)?.description||null}));
    const instagram=artist.socialLinks.find(l=>l.platform==='INSTAGRAM')?.url||'';
    let ig=instagram;try{ig='@'+new URL(instagram).pathname.split('/').filter(Boolean)[0];}catch{}
    return {account:a,source,instagram:ig};
  }
  private defaults(source:PromotionSource,instagram:string):PromotionConfig{return {artworkIds:source.works.slice(0,1).map(w=>w.id),template:0,version:0,color:'light',language:'ME',name:source.name,instagram,title:null,description:'',signature:'instagram'};}
  private config(c:PromotionConfig,source:PromotionSource,final=false):PromotionConfig{
    if(!c||!catalog.templates[c.template]?.vers[c.version])throw new BadRequestException('Nepoznat šablon ili verzija.');
    if(!Array.isArray(c.artworkIds)||c.artworkIds.length>9||new Set(c.artworkIds).size!==c.artworkIds.length||c.artworkIds.some(id=>!source.works.some(w=>w.id===id)))throw new NotFoundException('Izabrani rad nije dostupan.');
    if(!['light','dark'].includes(c.color)||!['ME','EN'].includes(c.language)||!['logo','instagram'].includes(c.signature)||typeof c.name!=='string'||!c.name.trim()||c.name.length>180||typeof c.instagram!=='string'||c.instagram.length>180||typeof c.description!=='string'||c.description.length>120||c.title!==null&&(typeof c.title!=='string'||c.title.length>180)||[c.name,c.instagram,c.description,c.title||''].some(t=>/[\p{Cc}]/u.test(t)))throw new BadRequestException('Provjeri tekst objave.');
    if(final&&c.artworkIds.length===0)throw new BadRequestException('Izaberi bar jedan rad.');
    const rules=selectionRules(c);
    if(c.publicationTitle!=null&&(typeof c.publicationTitle!=='string'||c.publicationTitle.length>180||/[\p{Cc}]/u.test(c.publicationTitle)))throw new BadRequestException('Provjeri naslov objave.');
    // A draft may retain a now-incompatible selection after a template switch;
    // final generation must never silently drop selected artworks.
    if(final&&c.artworkIds.length>rules.max)throw new BadRequestException(`Ova verzija dozvoljava najviše ${rules.max} radova. Provjeri izbor.`);
    if(c.sourceCollectionId){
      const collection=source.collections?.find(col=>col.id===c.sourceCollectionId);
      if(!rules.carousel||!collection||c.artworkIds.some(id=>!collection.artworkIds.includes(id)))throw new NotFoundException('Izabrana kolekcija ili rad nije dostupan.');
    }
    if(final&&generationIssues(c).length)throw new BadRequestException(generationIssues(c).join(' '));
    const crop=c.panoramaCrop;
    if(crop&&(!['contain','cover'].includes(crop.fit)||!Number.isFinite(crop.zoom)||crop.zoom<0.25||crop.zoom>3||[crop.x,crop.y].some(n=>!Number.isFinite(n)||n<0||n>100)))throw new BadRequestException('Provjeri kadar Panorame.');
    const edits=c.artworkEdits||[];
    if(!Array.isArray(edits)||edits.length>9||new Set(edits.map(e=>e.artworkId)).size!==edits.length||edits.some(e=>!c.artworkIds.includes(e.artworkId)))throw new BadRequestException('Provjeri radove za prilagođavanje.');
    for(const e of edits){
      if((e.title!==undefined&&(typeof e.title!=='string'||e.title.length>180))||(e.description!==undefined&&(typeof e.description!=='string'||e.description.length>120))||[e.title||'',e.description||''].some(t=>/[\p{Cc}]/u.test(t)))throw new BadRequestException('Provjeri tekst rada.');
      const k=e.crop;if(k&&(!['cover','contain'].includes(k.fit)||!Number.isFinite(k.zoom)||k.zoom<0.25||k.zoom>3||[k.x,k.y].some(n=>!Number.isFinite(n)||n<0||n>100)))throw new BadRequestException('Provjeri kadar rada.');
    }
    if(c.collectionTitle!=null&&(typeof c.collectionTitle!=='string'||c.collectionTitle.length>180||/[\p{Cc}]/u.test(c.collectionTitle)))throw new BadRequestException('Provjeri naziv kolekcije.');
    if(final&&c.template===8&&!c.collectionTitle?.trim())throw new BadRequestException('Unesi naziv kolekcije za Grid Carousel.');
    const d=selected(c);
    if(final&&catalog.meta[d.code]![3]&&!source.avatar)throw new BadRequestException('Ovaj šablon koristi profilnu fotografiju. Dodaj je na profil ili izaberi drugi šablon.');
    return {artworkIds:[...c.artworkIds],template:c.template,version:c.version,color:d.color as 'light'|'dark',language:c.language,name:c.name,instagram:c.instagram,title:c.title,...(c.publicationTitle?{publicationTitle:c.publicationTitle}:{}),...(edits.length?{artworkEdits:edits.map(e=>({artworkId:e.artworkId,...(e.title!==undefined?{title:e.title}:{}),...(e.description!==undefined?{description:e.description}:{}),...(e.crop?{crop:{fit:e.crop.fit,zoom:e.crop.zoom,x:e.crop.x,y:e.crop.y}}:{})})).sort((a,b)=>a.artworkId.localeCompare(b.artworkId))}:{}),...(c.collectionTitle?{collectionTitle:c.collectionTitle}:{}),...(c.sourceCollectionId?{sourceCollectionId:c.sourceCollectionId}:{}),...(c.template===9&&c.version===0?{panoramaCrop:crop||{fit:'cover' as const,zoom:1,x:50,y:50}}:{}),description:c.description,signature:c.signature};
  }
  async get(owner:string,page=1){
    await this.requireReady();const {source,account,instagram}=await this.source(owner);
    const [draft,items,total,usage]=await this.prisma.$transaction(async tx=>Promise.all([
      tx.promotionDraft.findUnique({where:{artistAccountId:owner}}),
      tx.promotionGeneration.findMany({where:{artistAccountId:owner},orderBy:[{createdAt:'desc'},{id:'desc'}],take:12,skip:(page-1)*12}),
      tx.promotionGeneration.count({where:{artistAccountId:owner}}),promotionUsage(tx,owner,account.subscription)
    ]),{isolationLevel:'RepeatableRead'});
    return {source,theme:account.uiTheme==='dark'?'dark':'light',draft:draft?{config:draft.config,revision:draft.revision,savedAt:draft.updatedAt}:{config:this.defaults(source,instagram),revision:0,savedAt:null},usage,available:this.storage.available&&this.generator.available,history:{items:items.map(publicGeneration),total,page,totalPages:Math.ceil(total/12)}};
  }
  async save(owner:string,d:SavePromotionDto){
    await this.requireReady();const {source}=await this.source(owner),config=this.config(d.config,source);
    return this.prisma.$transaction(async tx=>{
      await this.lock(tx,owner);const old=await tx.promotionDraft.findUnique({where:{artistAccountId:owner}});
      if((old?.revision||0)!==d.revision)throw new ConflictException('Draft je promijenjen u drugom tabu. Ponovo učitaj prije čuvanja.');
      const draft=old?await tx.promotionDraft.update({where:{id:old.id},data:{config:json(config),revision:{increment:1}}}):await tx.promotionDraft.create({data:{artistAccountId:owner,config:json(config)}});
      return {config:draft.config,revision:draft.revision,savedAt:draft.updatedAt};
    });
  }
  async generate(owner:string,d:GeneratePromotionDto){
    await this.requireReady();const {source}=await this.source(owner),config=this.config(d.config,source,true);
    // Only selected, owned records enter the immutable job snapshot.
    const {collections,...snapshotSource}=source;
    const snapshot:PromotionSnapshot={config,source:{...snapshotSource,works:config.artworkIds.map(id=>{const w=source.works.find(w=>w.id===id)!;if(rendererVersionFor(config)>=8)return w;const {description,...legacy}=w;return legacy;})},rendererVersion:rendererVersionFor(config)},contentHash=hash(snapshot);
    return this.prisma.$transaction(async tx=>{
      const account=await this.lock(tx,owner);
      const old=await tx.promotionGeneration.findUnique({where:{artistAccountId_operationKey:{artistAccountId:owner,operationKey:d.operationKey}}});
      if(old){if(old.contentHash!==contentHash)throw new ConflictException('Zahtjev je već vezan za drugi sadržaj.');return publicGeneration(old);}
      const same=await tx.promotionGeneration.findFirst({where:{artistAccountId:owner,contentHash,status:{not:'FAILED'}}});
      if(same)return publicGeneration(same);
      if(!this.storage.available||!this.generator.available)throw new ServiceUnavailableException('Generisanje trenutno nije podešeno. Draft i pregled su dostupni.');
      const usage=await promotionUsage(tx,owner,account.subscription);
      if(usage.remaining<=0)throw new ForbiddenException('Iskorišćena uključena kvota. Potreban je kupljeni set objava.');
      if(await tx.promotionGeneration.count({where:{artistAccountId:owner,status:{in:['QUEUED','PROCESSING']}}})>=2)throw new ConflictException('Sačekaj završetak započetih objava.');
      // Confirmed order: included entitlement, then non-expiring bought credits.
      const included=usage.used+usage.reserved<usage.limit,kind=included?usage.plan:'PAID';
      const last=await tx.promotionGeneration.aggregate({where:{artistAccountId:owner},_max:{versionNumber:true}});
      const row=await tx.promotionGeneration.create({data:{artistAccountId:owner,operationKey:d.operationKey,versionNumber:(last._max.versionNumber||0)+1,contentHash,snapshot:json(snapshot),kind,periodStart:kind==='PREMIUM'?usage.periodStart:null,periodEnd:kind==='PREMIUM'?usage.periodEnd:null}});
      return publicGeneration(row);
    },{timeout:15000});
  }
  async version(owner:string,id:string){
    const row=await this.prisma.promotionGeneration.findFirst({where:{id,artistAccountId:owner}});
    if(!row)throw new NotFoundException('Objava nije pronađena.');return publicGeneration(row);
  }
  async download(owner:string,id:string,format:string){
    const row=await this.prisma.promotionGeneration.findFirst({where:{id,artistAccountId:owner},include:{files:{orderBy:{slide:'asc'}}}});
    if(!row||row.status!=='READY'||!row.files.length)throw new NotFoundException('Fajl nije dostupan.');
    const files=format==='bundle'?row.files:[format==='thumbnail'?row.files[0]:row.files[Number(format)]];
    if(files.some(f=>!f))throw new NotFoundException('Slajd nije dostupan.');
    const contents=[];
    for(const f of files){if(!f)throw new NotFoundException();const body=await this.storage.read(id,f.storagePath);if(hash(body)!==f.contentHash)throw new ServiceUnavailableException('Provjera datoteke nije uspjela.');contents.push({name:`ArtBoard-objava-${row.versionNumber}-${String(f.slide+1).padStart(2,'0')}.png`,body});}
    if(format==='thumbnail')return {body:await sharp(contents[0]!.body).resize(180,240).png().toBuffer(),mime:'image/png',name:'thumbnail.png'};
    // A read failure never increments the successful delivery counter.
    await this.prisma.promotionGeneration.update({where:{id},data:{downloadCount:{increment:1},lastDownloadedAt:new Date()}});
    return format==='bundle'&&contents.length>1?{body:qrBundle(contents),mime:'application/zip',name:`ArtBoard-objava-${row.versionNumber}.zip`}:{...contents[0]!,mime:'image/png'};
  }
  async tick(){
    if(this.running||this.stopped||!this.generator.available||!this.storage.available||!await this.ready())return;
    this.running=true;
    try{
      const token=randomUUID(),lease=new Date(Date.now()+240000);
      const row=await this.prisma.$transaction(async tx=>{
        const rows=await tx.$queryRaw<Array<{id:string}>>`SELECT "id" FROM "PromotionGeneration" WHERE "status"='QUEUED' OR ("status"='PROCESSING' AND "leaseUntil"<now()) ORDER BY "createdAt" LIMIT 1 FOR UPDATE SKIP LOCKED`;
        if(!rows[0])return null;
        const old=await tx.promotionGeneration.findUniqueOrThrow({where:{id:rows[0].id}});
        if(old.attempts>=3){await tx.promotionGeneration.update({where:{id:old.id},data:{status:'FAILED',completedAt:new Date(),errorCode:'WORKER_INTERRUPTED',leaseUntil:null,leaseToken:null}});return null;}
        return tx.promotionGeneration.update({where:{id:old.id},data:{status:'PROCESSING',leaseToken:token,leaseUntil:lease,attempts:{increment:1}}});
      });
      if(!row)return;
      const heartbeat=setInterval(()=>{void this.prisma.promotionGeneration.updateMany({where:{id:row.id,status:'PROCESSING',leaseToken:token},data:{leaseUntil:new Date(Date.now()+240000)}}).catch(()=>{});},30000);heartbeat.unref();
      try{
        const files:Array<{slide:number;storagePath:string;contentHash:string;sizeBytes:number}>=[];
        await this.generator.generate(row.snapshot as unknown as PromotionSnapshot,async(body,slide)=>{
          const storagePath=await this.storage.write(row.id,slide,body);files.push({slide,storagePath,contentHash:hash(body),sizeBytes:body.length});
        });
        const snapshot=row.snapshot as unknown as PromotionSnapshot;
        if(files.length!==selected(snapshot.config,snapshot.rendererVersion).slides)throw Error('Incomplete output');
        await this.prisma.$transaction(async tx=>{
          await this.lock(tx,row.artistAccountId);
          const update=await tx.promotionGeneration.updateMany({where:{id:row.id,status:'PROCESSING',leaseToken:token,leaseUntil:{gt:new Date()}},data:{status:'READY',completedAt:new Date(),leaseUntil:null,leaseToken:null}});
          if(update.count!==1)throw new ConflictException('Lease expired');
          await tx.promotionGeneratedFile.createMany({data:files.map(f=>({...f,generationId:row.id}))});
        });
      }catch{
        await this.prisma.promotionGeneration.updateMany({where:{id:row.id,status:'PROCESSING',leaseToken:token},data:{status:'FAILED',completedAt:new Date(),leaseToken:null,leaseUntil:null,errorCode:'GENERATION_FAILED'}});
      }finally{clearInterval(heartbeat);}
    }finally{this.running=false;}
  }
}

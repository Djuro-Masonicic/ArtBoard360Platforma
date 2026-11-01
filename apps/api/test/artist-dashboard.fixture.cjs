const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const root=path.resolve(__dirname,'../../..'),config=require('dotenv').parse(fs.readFileSync(path.join(root,'.env'))),url=new URL(config.DATABASE_URL);
const database=JSON.parse(fs.readFileSync(path.join(root,'.tmp/dashboard-analysis/isolated.json'))).database;
assert.match(database,/^artboard_dashboard_test_[a-f0-9]{32}$/);url.pathname='/'+database;
Object.assign(process.env,{NODE_ENV:'test',DATABASE_URL:url.href,DIRECT_URL:url.href,ARTIST_COLLECTIONS_ENABLED:'true',RESEND_API_KEY:'',RESEND_FROM_EMAIL:'ArtBoard <verified@example.invalid>',EMAIL_TEST_RECIPIENT:'',ADMIN_NOTIFICATION_EMAIL:'admin@example.invalid',ADMIN_SEED_EMAIL:'',ADMIN_SEED_PASSWORD:'',ADMIN_AUTH_SECRET:'isolated-dashboard-tests-only',R2_ACCOUNT_ID:'unused',R2_ACCESS_KEY_ID:'unused',R2_SECRET_ACCESS_KEY:'unused',R2_BUCKET_NAME:'unused',R2_PUBLIC_URL:'https://storage.invalid',MAX_UPLOAD_FILE_SIZE_BYTES:'10485760'});
require('ts-node').register({project:path.join(root,'apps/api/tsconfig.json'),transpileOnly:true});require('reflect-metadata');
async function dashboardHarness(){
  const {Global,Module,ValidationPipe}=require('@nestjs/common'),{NestFactory}=require('@nestjs/core');
  const {PrismaModule}=require('../src/prisma/prisma.module'),{PrismaService}=require('../src/prisma/prisma.service');
  const {R2StorageService}=require('../src/storage/r2-storage.service'),{ArtistDashboardModule}=require('../src/modules/artist-dashboard/artist-dashboard.module'),{ArtworksModule}=require('../src/modules/artworks/artworks.module'),{ArtistCollectionsModule}=require('../src/modules/artist-collections/artist-collections.module');
  const {ResendMailService}=require('../src/mail/resend-mail.service'),{GlobalHttpExceptionFilter}=require('../src/common/filters/http-exception.filter');
  const realStorage=new R2StorageService(),storage={calls:[],deferred:[],fail:false,validateUpload:realStorage.validateUpload.bind(realStorage),async uploadFile(input){if(this.fail)throw Error('Isolated storage error');const key=`artists/${input.recordId}/${input.entityType}/${randomUUID()}.png`;this.calls.push({key,input});return{path:key,publicUrl:'https://storage.invalid/'+key}},async deleteFile(key){this.deferred.push(key);return{deleted:false,deferred:true}}};
  // Some imported feature modules also import StorageModule. Override the
  // transport on every instance in this isolated process, never the real app.
  R2StorageService.prototype.uploadFile=storage.uploadFile.bind(storage);
  R2StorageService.prototype.deleteFile=storage.deleteFile.bind(storage);
  class TestStorage{}Global()(TestStorage);Module({providers:[{provide:R2StorageService,useValue:storage}],exports:[R2StorageService]})(TestStorage);
  class Harness{}Module({imports:[PrismaModule,TestStorage,ArtistDashboardModule,ArtworksModule,ArtistCollectionsModule]})(Harness);
  const app=await NestFactory.create(Harness,{logger:false,abortOnError:false});app.useGlobalPipes(new ValidationPipe({transform:true,whitelist:true,forbidNonWhitelisted:true}));app.useGlobalFilters(new GlobalHttpExceptionFilter());
  const provider={calls:[],fail:false};app.get(ResendMailService).client={emails:{async send(payload,options){provider.calls.push({payload,options});return provider.fail?{error:{message:'PRIVATE_TEST_FAILURE'}}:{data:{id:randomUUID()},error:null}}}};
  await app.listen(0,'127.0.0.1');const prisma=app.get(PrismaService),base=await app.getUrl(),{hashPassword,signSessionToken,verifyPassword}=require('../src/modules/auth/auth-crypto');
  const password='Isolated12345',passwordHash=await hashPassword(password);
  const token=(id,email,kind='artist')=>signSessionToken({sub:id,email,kind,exp:Math.floor(Date.now()/1000)+3600},process.env.ADMIN_AUTH_SECRET);
  const image=await require('sharp')({create:{width:8,height:10,channels:3,background:'#7c4fff'}}).png().toBuffer();
  await prisma.discipline.createMany({data:[['Slikarstvo','slikarstvo'],['Fotografija','fotografija'],['Ilustracija','ilustracija'],['Grafika','grafika']].map(([name,slug])=>({name,slug})),skipDuplicates:true});
  const admin=await prisma.adminUser.create({data:{name:'Isolated admin',email:randomUUID()+'@example.invalid',passwordHash}}),adminToken=token(admin.id,admin.email,'admin');
  async function artist(premium=false){const id=randomUUID(),email=id+'@example.invalid';const a=await prisma.artist.create({data:{id,name:'Izolovana Umjetnica',slug:'isolated-'+id,bio:'Biografija izolovanog testnog profila.',email,profileImageUrl:'https://storage.invalid/avatar.png',disciplines:{create:{discipline:{connect:{slug:'ilustracija'}}}},account:{create:{email,name:'Izolovana Umjetnica',passwordHash,subscription:premium?{create:{plan:'PLATINUM',status:'ACTIVE',currentPeriodStart:new Date(),currentPeriodEnd:new Date(Date.now()+30*86400000)}}:undefined}}},include:{account:true}});const works=[];for(let n=0;n<3;n++)works.push(await prisma.artwork.create({data:{artistId:id,imageUrl:`https://storage.invalid/${id}/${n}.png`,storagePath:`artists/${id}/artwork/${n}.png`,title:'Rad '+n,orderIndex:n*10,isFeatured:n<2}}));return{...a,works,token:token(a.account.id,email)}}
  async function request(path,actor,method='GET',body){const headers={};if(actor)headers.Authorization='Bearer '+(typeof actor==='string'?actor:actor.token);const form=body instanceof FormData;if(body!==undefined&&!form)headers['Content-Type']='application/json';const r=await fetch(base+path,{method,headers,body:body===undefined?undefined:form?body:JSON.stringify(body)});const data=await r.json();return{status:r.status,data}}
  function form(fileName='Slika.png',fields={}){const f=new FormData();f.set('file',new Blob([image],{type:'image/png'}),fileName);for(const[k,v]of Object.entries(fields))f.set(k,String(v));return f}
  return{app,base,prisma,storage,provider,password,passwordHash,image,adminToken,artist,request,form,verifyPassword,close:()=>app.close()};
}
module.exports={dashboardHarness};

const path=require('node:path'),{randomUUID}=require('node:crypto');
const root=path.resolve(__dirname,'../../..');
Object.assign(process.env,{NODE_ENV:'test',DATABASE_URL:'postgresql://unused:unused@127.0.0.1:1/unused',R2_ACCOUNT_ID:'unused',R2_ACCESS_KEY_ID:'unused',R2_SECRET_ACCESS_KEY:'unused',R2_BUCKET_NAME:'unused',R2_PUBLIC_URL:'https://storage.invalid',RESEND_API_KEY:'',RESEND_FROM_EMAIL:'ArtBoard <verified@example.invalid>',EMAIL_TEST_RECIPIENT:''});
require('ts-node').register({project:path.join(root,'apps/api/tsconfig.json'),transpileOnly:true});require('reflect-metadata');
async function contactHarness(){
  const{NestFactory}=require('@nestjs/core'),{ValidationPipe}=require('@nestjs/common');
  const{ContactModule}=require('../src/modules/contact/contact.module'),{ContactService}=require('../src/modules/contact/contact.service'),{ContactRateGuard}=require('../src/modules/contact/contact.controller'),{ResendMailService}=require('../src/mail/resend-mail.service'),{GlobalHttpExceptionFilter}=require('../src/common/filters/http-exception.filter');
  const app=await NestFactory.create(ContactModule,{logger:false,abortOnError:false});app.useGlobalPipes(new ValidationPipe({transform:true,whitelist:true,forbidNonWhitelisted:true}));app.useGlobalFilters(new GlobalHttpExceptionFilter());
  const mail=app.get(ResendMailService),service=app.get(ContactService),guard=app.get(ContactRateGuard),env=require('../src/config/env').env;
  const provider={calls:[],mode:'accept',gate:null};
  const client={emails:{async send(payload,options){provider.calls.push({payload,options});if(provider.gate)await provider.gate;if(provider.mode==='reject')return{error:{message:'PRIVATE_PROVIDER_DETAIL'}};if(provider.mode==='network')throw Error('PRIVATE_NETWORK_DETAIL');return{data:provider.mode==='missingId'?{}:{id:randomUUID()},error:null};}}};mail.client=client;
  await app.listen(0,'127.0.0.1');const base=await app.getUrl();
  return{app,base,mail,service,guard,provider,env,reset(){provider.calls.length=0;provider.mode='accept';provider.gate=null;mail.client=client;service.requests.clear();service.senders.clear();guard.clients.clear();env.emailTestRecipient=undefined;},async send(body,key=randomUUID(),headers={}){const r=await fetch(base+'/contact',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key,...headers},body:JSON.stringify(body)});return{status:r.status,body:await r.json(),retryAfter:r.headers.get('retry-after')};},close:()=>app.close()};
}
module.exports={contactHarness};

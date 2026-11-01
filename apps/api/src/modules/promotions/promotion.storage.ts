import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { mkdir,open,readFile } from 'node:fs/promises';
import { resolve,dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { R2StorageService } from '../../storage/r2-storage.service';
import { env } from '../../config/env';
@Injectable()
export class PromotionStorage {
  constructor(private readonly r2:R2StorageService){}
  get available(){return Boolean(env.r2PrivatePdfBucketName&&env.r2PrivatePdfBucketName!==env.r2BucketName)||env.nodeEnv==='development';}
  private root=resolve(dirname(require.resolve('@artboard/promotion-renderer')),'../../.data/private-promotions');
  async write(id:string,slide:number,body:Buffer){
    if(!this.available)throw new ServiceUnavailableException('Privatni storage Generatora nije podešen.');
    if(env.r2PrivatePdfBucketName&&env.r2PrivatePdfBucketName!==env.r2BucketName)return (await this.r2.uploadFile({recordId:id,entityType:'promotion-png',fileName:`slide-${slide+1}.png`,mimeType:'image/png',fileSizeBytes:body.length,body,visibility:'private'})).path;
    if(!/^[a-f0-9-]{36}$/i.test(id))throw new ServiceUnavailableException();
    const folder=resolve(this.root,id);await mkdir(folder,{recursive:true,mode:0o700});
    const name=`${randomUUID()}-${slide}.png`,f=await open(resolve(folder,name),'wx',0o600);
    try{await f.writeFile(body);}finally{await f.close();}
    return `local-private:promotions/${id}/${name}`;
  }
  async read(id:string,key:string){
    if(key.startsWith('local-private:')){
      const prefix=`local-private:promotions/${id}/`,name=key.slice(prefix.length);
      if(env.nodeEnv!=='development'||!key.startsWith(prefix)||!/^[-a-f0-9]{36}-\d{1,2}\.png$/i.test(name))throw new ServiceUnavailableException();
      return readFile(resolve(this.root,id,name));
    }
    return this.r2.readPromotionArtifact(id,key);
  }
}

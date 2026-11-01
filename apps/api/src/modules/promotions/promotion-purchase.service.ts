import { ForbiddenException,Injectable,NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
export async function creditPromotionPurchase(tx:Prisma.TransactionClient,id:string){
  const p=await tx.portfolioPurchase.findUnique({where:{id},include:{paymentEvents:{where:{status:'VERIFIED',verifiedAt:{not:null}}}}});
  if(!p||p.product!=='GENERATOR_PACK'||p.status!=='PAID'||!p.paidAt||!p.artistAccountId||p.currency!=='EUR'||p.amountCents!==490||(p.snapshot as any).credits!==10||!p.providerPaymentRef||!p.paymentEvents.some(e=>e.provider===p.provider))throw new ForbiddenException('Potvrđena uplata nije dostupna.');
  await tx.$queryRaw`SELECT "id" FROM "ArtistAccount" WHERE "id"=${p.artistAccountId}::uuid FOR UPDATE`;
  return tx.promotionCreditLedger.upsert({where:{purchaseId:id},update:{},create:{artistAccountId:p.artistAccountId,purchaseId:id,credits:10}});
}
@Injectable()
export class PromotionPurchaseService {
  constructor(private readonly prisma:PrismaService){}
  async intent(owner:string,operationKey:string){
    return this.prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT "id" FROM "ArtistAccount" WHERE "id"=${owner}::uuid FOR UPDATE`;
      const a=await tx.artistAccount.findUnique({where:{id:owner}});if(!a?.isActive)throw new NotFoundException();
      const old=await tx.portfolioPurchase.findFirst({where:{artistAccountId:owner,product:'GENERATOR_PACK',snapshot:{path:['operationKey'],equals:operationKey}}});
      if(old)return {id:old.id,status:old.status,amountCents:old.amountCents,currency:old.currency,checkoutAvailable:false};
      const snapshot={product:'GENERATOR_PACK',credits:10,operationKey};
      const row=await tx.portfolioPurchase.create({data:{artistAccountId:owner,product:'GENERATOR_PACK',amountCents:490,currency:'EUR',snapshot,snapshotHash:createHash('sha256').update(JSON.stringify(snapshot)).digest('hex'),buyerEmail:a.email}});
      return {id:row.id,status:row.status,amountCents:490,currency:'EUR',checkoutAvailable:false};
    });
  }
  /** Server-only settlement hook for the future verified AllSecure adapter.
   * No public controller, admin toggle or browser callback can grant credits.
   * Must run in the transaction which commits the verified payment event.
   */
  async creditVerifiedPurchase(tx:Prisma.TransactionClient,id:string){
    return creditPromotionPurchase(tx,id);
  }
}

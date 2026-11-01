import { hasPremiumAccess, subscriptionQuotaWindow } from '../artist-subscriptions/subscription-access';
import type { Prisma } from '@prisma/client';
export async function promotionUsage(tx:Prisma.TransactionClient,owner:string,subscription:any,now=new Date()) {
  const premium=hasPremiumAccess(subscription,now),window=subscriptionQuotaWindow(subscription,now);
  const rows=await tx.promotionGeneration.groupBy({by:['kind','status'],where:{artistAccountId:owner,status:{not:'FAILED'},OR:[{kind:{in:['FREE','PAID']}},...(window?[{kind:'PREMIUM',periodStart:window.start,periodEnd:window.end}]:[])]},_count:{_all:true}});
  const n=(kind:string,ready?:boolean)=>rows.filter(r=>r.kind===kind&&(ready===undefined||((r.status==='READY')===ready))).reduce((s,r)=>s+r._count._all,0);
  const credit=await tx.promotionCreditLedger.aggregate({where:{artistAccountId:owner},_sum:{credits:true}});
  const kind=premium?'PREMIUM':'FREE',used=n(kind,true),reserved=n(kind,false),limit=premium?10:1,purchased=Math.max(0,(credit._sum.credits||0)-n('PAID'));
  return {plan:premium?'PREMIUM' as const:'FREE' as const,limit,used,reserved,purchased,remaining:Math.max(0,limit-used-reserved)+purchased,periodStart:window?.start.toISOString()||null,periodEnd:window?.end.toISOString()||null};
}

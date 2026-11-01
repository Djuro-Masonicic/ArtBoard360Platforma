import { apiFetch } from './api';
import type { PromotionData } from '@/lib/promotions';
export const getPromotions=(token:string)=>apiFetch<PromotionData>('/artist/promotions',{headers:{Authorization:`Bearer ${token}`}});
export async function promotionRequest<T>(path='',method='GET',body?:unknown):Promise<T>{
  const r=await fetch('/api/artist/promotions'+path,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
  if(!r.ok){let message='Generator trenutno nije dostupan.';try{const d=await r.json();message=Array.isArray(d.message)?d.message.join(' '):d.message||message;}catch{}throw new Error(message);}
  return r.json() as Promise<T>;
}

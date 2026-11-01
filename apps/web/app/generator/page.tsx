import { requireArtistSession } from '@/lib/artist-session';
import { getPromotions } from '@/services/promotions';
import { PromotionEditor } from '@/components/promotion-editor';
import { ApiError } from '@/services/api';
export const metadata={title:'Generator promotivnih materijala | ArtBoard',icons:{icon:'/artboard-logo/ArtBoard-Baza-Gradient.svg'}};
export default async function GeneratorPage(){
  const session=await requireArtistSession();
  try{return <PromotionEditor initial={await getPromotions(session.token)}/>;}
  catch(e){if(e instanceof ApiError&&e.status===503)return <main style={{padding:32}}><h1>Generator promotivnih materijala</h1><p>Generator čeka aktiviranje pripremljene migracije i servisa.</p><a href="/artist/dashboard">Nazad na nalog</a></main>;throw e;}
}

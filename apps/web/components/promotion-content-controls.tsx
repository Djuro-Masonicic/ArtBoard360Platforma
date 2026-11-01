"use client";
import { useEffect,useLayoutEffect,useRef,useState } from 'react';
import { cropMetrics,selectionRules } from '@artboard/promotion-renderer';
import type { PanoramaCrop,PromotionConfig,PromotionSource } from '@artboard/promotion-renderer';
import { Search,SlidersHorizontal,X } from 'lucide-react';

export function PromotionLibraryFilters({query,collectionId,collections,total,visible,onQuery,onCollection,onReset}:{query:string;collectionId:string;collections:NonNullable<PromotionSource['collections']>;total:number;visible:number;onQuery:(value:string)=>void;onCollection:(value:string)=>void;onReset:()=>void}){
  const filtered=query.trim()!==''||collectionId!=='all';
  return <div className="promotion-library-tools">
    <div className="promotion-library-filters">
      <label className="promotion-library-search"><span>Pretraži radove</span><div><Search size={18} aria-hidden="true"/><input type="search" aria-label="Pretraži radove po nazivu" placeholder="Naziv rada…" value={query} onChange={e=>onQuery(e.target.value)}/>{query&&<button type="button" aria-label="Obriši pretragu" onClick={()=>onQuery('')}><X size={16}/></button>}</div></label>
      <label className="promotion-library-category"><span>Kolekcija</span><div><SlidersHorizontal size={17} aria-hidden="true"/><select aria-label="Filtriraj radove po kolekciji" value={collectionId} onChange={e=>onCollection(e.target.value)}><option value="all">Svi radovi</option>{collections.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}<option value="uncollected">Van kolekcija</option></select></div></label>
    </div>
    <div className="promotion-library-results"><span role="status" aria-live="polite">Prikazano {visible} od {total} radova</span>{filtered&&<button type="button" onClick={onReset}>Poništi filtere</button>}</div>
    {visible===0&&<div className="promotion-library-empty"><Search size={24} aria-hidden="true"/><strong>Nema radova za ovaj izbor</strong><span>Probaj drugi naziv ili kolekciju. Izabrani radovi ostaju u objavi.</span></div>}
  </div>;
}

export function PromotionCollageTitle({config,update}:{config:PromotionConfig;update:(patch:any)=>void}){
  return <label className="promotion-collection-title"><span>Naslov kolaža · opciono</span><input aria-label="Naslov kolaža" value={config.publicationTitle||''} maxLength={180} placeholder={(config.sourceCollectionId?config.collectionTitle:'')||config.instagram||'Lorem ipsum'} onChange={e=>update({publicationTitle:e.target.value})}/><small className="promotion-collage-hint">Bez ručnog naslova prikazuje se naziv izabrane kolekcije ili Instagram tag. Naziv pojedinačnog rada se ne koristi.</small></label>;
}

export function PromotionContentControls({config,source,update}:{config:PromotionConfig;source:PromotionSource;update:(patch:any)=>void}){
  const [open,setOpen]=useState(true),[dragging,setDragging]=useState<string|null>(null),[over,setOver]=useState<string|null>(null);
  const drag=useRef<string|null>(null),target=useRef<string|null>(null);
  const orderRef=useRef<HTMLOListElement>(null),rects=useRef(new Map<string,number>());
  const [dragPoint,setDragPoint]=useState<{x:number;y:number}|null>(null);
  useLayoutEffect(()=>{
    const next=new Map<string,number>();orderRef.current?.querySelectorAll<HTMLElement>('[data-order-work]').forEach(el=>{const id=el.dataset.orderWork!,top=el.getBoundingClientRect().top,old=rects.current.get(id);next.set(id,top);if(old!==undefined&&Math.abs(old-top)>1&&Math.abs(old-top)<600&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches)el.animate([{transform:`translateY(${old-top}px)`},{transform:'translateY(0)'}],{duration:240,easing:'cubic-bezier(.2,.8,.2,1)'});});rects.current=next;
  },[config.artworkIds.join('|'),open]);
  const rules=selectionRules(config),collection=source.collections?.find(c=>c.id===config.sourceCollectionId);
  const choose=(id:string)=>{
    const c=source.collections?.find(c=>c.id===id),ids=c?.artworkIds||config.artworkIds;
    // Large collections need an explicit subset; never truncate silently.
    update({sourceCollectionId:id,sel:ids.length<=rules.max?ids.map(id=>source.works.findIndex(w=>w.id===id)).filter(i=>i>=0):[],...(c?{collectionTitle:c.title}:{}),...(config.template===6?{publicationTitle:c?.title||''}:{}),slide:0});
  };
  const move=(i:number,d:number)=>{const ids=[...config.artworkIds];[ids[i],ids[i+d]]=[ids[i+d]!,ids[i]!];update({sel:ids.map(id=>source.works.findIndex(w=>w.id===id)),slide:0});};
  const reorder=(from:string|null,to:string|null)=>{if(!from||!to||from===to)return;const ids=[...config.artworkIds],a=ids.indexOf(from),b=ids.indexOf(to);if(a<0||b<0)return;ids.splice(a,1);ids.splice(b,0,from);update({sel:ids.map(id=>source.works.findIndex(w=>w.id===id)),slide:0});};
  const end=()=>{drag.current=null;target.current=null;setDragging(null);setOver(null);setDragPoint(null);};
  return <section className="promotion-controls" aria-label="Pravila i izvor radova">
    <div className="promotion-controls-heading"><h2>{rules.carousel?'Radovi ili kolekcija':'Izbor radova'}</h2><button type="button" aria-expanded={open} aria-controls="promotion-selection-body" onClick={()=>setOpen(!open)}>{open?'Zatvori izbor radova':'Otvori izbor radova'}</button></div>
    <p role="status">Izabrano {config.artworkIds.length} od najviše {rules.max} radova.</p>
    <div id="promotion-selection-body" className="promotion-controls-body" hidden={!open}>
    <p>{rules.hint}</p>
    {config.template===6&&<label>Naslov objave<input aria-label="Naslov objave" value={config.publicationTitle||''} maxLength={180} placeholder="Lorem ipsum" onChange={e=>update({publicationTitle:e.target.value})}/></label>}
    {config.template===9&&config.version===1&&<PromotionCollageTitle config={config} update={update}/>}
    {rules.carousel&&<label>Izvor radova<select aria-label="Izvor radova" value={config.sourceCollectionId||''} onChange={e=>choose(e.target.value)}>
      <option value="">Pojedinačni radovi</option>
      {(source.collections||[]).map(c=><option key={c.id} value={c.id}>{c.title} · {c.artworkIds.length} radova</option>)}
    </select></label>}
    {rules.carousel&&!source.collections?.length&&<p>Na profilu još nema kolekcija. Možeš izabrati pojedinačne radove.</p>}
    {config.sourceCollectionId&&!collection&&<p role="alert">Kolekcija više nije dostupna. Izaberi drugi izvor radova.</p>}
    {collection&&<p>{collection.artworkIds.length} radova u kolekciji. {collection.artworkIds.length>rules.max?`Izaberi najviše ${rules.max}; kolekcija neće biti automatski skraćena.`:'Redoslijed kolekcije je početni redoslijed izbora.'}</p>}
    {config.artworkIds.length>rules.max&&<p role="alert">Smanji izbor prije preuzimanja. Promjena šablona nije uklonila tvoje radove.</p>}
    {config.artworkIds.length>0&&<ol ref={orderRef} className="promotion-selection-order" aria-label="Redoslijed izabranih radova">
      {config.artworkIds.map((id,i)=><li key={id} data-order-work={id} data-dragging={dragging===id} data-drop-target={over===id} draggable onDragStart={e=>{drag.current=id;setDragging(id);setDragPoint(null);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',id);}} onDragOver={e=>{e.preventDefault();setOver(id);}} onDrop={e=>{e.preventDefault();reorder(drag.current,id);end();}} onDragEnd={end}>
        <button className="promotion-drag-handle" type="button" disabled={config.artworkIds.length===1} aria-label={`Prevuci rad ${i+1}`} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);drag.current=id;setDragging(id);setDragPoint({x:e.clientX,y:e.clientY});}}
          onPointerMove={e=>{if(!drag.current)return;setDragPoint({x:e.clientX,y:e.clientY});const id=document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLElement>('[data-order-work]')?.dataset.orderWork||null;target.current=id;setOver(id);}}
          onPointerUp={()=>{reorder(drag.current,target.current);end();}} onPointerCancel={end}>⠿</button>
        <img className="promotion-order-thumbnail" src={source.works.find(w=>w.id===id)?.imageUrl} alt="" draggable={false}/>
        <span>{i+1}. {config.artworkEdits?.find(e=>e.artworkId===id)?.title??source.works.find(w=>w.id===id)?.title??'Rad'}</span><div>
        <button type="button" disabled={i===0} aria-label={`Pomjeri rad ${i+1} gore`} onClick={()=>move(i,-1)}>↑</button>
        <button type="button" disabled={i===config.artworkIds.length-1} aria-label={`Pomjeri rad ${i+1} dolje`} onClick={()=>move(i,1)}>↓</button>
        <button className="promotion-remove-work" type="button" aria-label={`Ukloni rad ${i+1}`} title="Ukloni iz objave" onClick={()=>update({sel:config.artworkIds.filter(workId=>workId!==id).map(workId=>source.works.findIndex(w=>w.id===workId))})}><X size={16} aria-hidden="true"/></button>
      </div></li>)}
    </ol>}
    {config.artworkIds.length>1&&<p>Prevuci rad za ručicu ⠿ ili koristi strelice za promjenu redosljeda.</p>}
    </div>
    {dragPoint&&dragging&&<div className="promotion-drag-preview" aria-hidden="true" style={{left:dragPoint.x+16,top:dragPoint.y+12}}><img src={source.works.find(w=>w.id===dragging)?.imageUrl} alt=""/><span>{config.artworkEdits?.find(e=>e.artworkId===dragging)?.title??source.works.find(w=>w.id===dragging)?.title??'Rad'}</span></div>}
  </section>;
}

export function PromotionArtworkControls({config,source,editWorkId,update}:{config:PromotionConfig;source:PromotionSource;editWorkId:string;update:(patch:any)=>void}){
  const id=config.artworkIds.includes(editWorkId)?editWorkId:config.artworkIds[0],work=source.works.find(w=>w.id===id);
  if(!work)return null;
  const edits=config.artworkEdits||[],edit=edits.find(e=>e.artworkId===id),crop=edit?.crop||{fit:'cover',zoom:1,x:50,y:50};
  const set=(patch:Partial<NonNullable<PromotionConfig['artworkEdits']>[number]>)=>update({artworkEdits:[...edits.filter(e=>e.artworkId!==id),{...edit,artworkId:id!,...patch}]});
  return <section className="promotion-controls" aria-label="Podešavanja pojedinačnog rada">
    <h2>Prilagodi izabrani rad</h2>
    {config.template===6&&<label>Naslov objave<input aria-label="Naslov objave" value={config.publicationTitle||''} maxLength={180} placeholder="Lorem ipsum" onChange={e=>update({publicationTitle:e.target.value})}/></label>}
    <label>Rad za prilagođavanje<select aria-label="Rad za prilagođavanje" value={id} onChange={e=>update({editWorkId:e.target.value})}>{config.artworkIds.map((id,i)=><option key={id} value={id}>{i+1}. {source.works.find(w=>w.id===id)?.title||'Rad'}</option>)}</select></label>
    <p>{config.template===9&&config.version===1?'Kadar se odnosi na ovaj rad. Naslov kolaža u kartici Tekst je zajednički za cijelu objavu.':'Naslov i opis u kartici Tekst odnose se na ovaj rad. Promjene važe samo za objavu i ostaju vezane za rad kada promijeniš redosljed.'}</p>
    {config.template===8&&<label>Naziv ovog rada<input aria-label="Naziv ovog rada" value={edit?.title??work.title??''} maxLength={180} onChange={e=>set({title:e.target.value})}/></label>}
    {!(config.template===9&&config.version===0)&&<>
      <label>Kadar ovog rada<select aria-label="Kadar ovog rada" value={edit?.crop?.fit||'layout'} onChange={e=>set({crop:e.target.value==='layout'?undefined:{...crop,fit:e.target.value as PanoramaCrop['fit']}})}><option value="layout">Prema šablonu</option><option value="contain">Prikaži cijeli rad</option><option value="cover">Ispuni kadar</option></select></label>
      <label>Uvećanje rada · {crop.zoom.toFixed(2)}×<input aria-label="Uvećanje rada" type="range" min="0.25" max="3" step="0.01" value={crop.zoom} onChange={e=>set({crop:{...crop,zoom:Number(e.target.value)}})}/></label>
      <label>Horizontalni položaj rada · {crop.x}%<input aria-label="Horizontalni položaj rada" type="range" min="0" max="100" value={crop.x} onChange={e=>set({crop:{...crop,x:Number(e.target.value)}})}/></label>
      <label>Vertikalni položaj rada · {crop.y}%<input aria-label="Vertikalni položaj rada" type="range" min="0" max="100" value={crop.y} onChange={e=>set({crop:{...crop,y:Number(e.target.value)}})}/></label>
      <p>Kadar se primjenjuje na prikaze ovog rada u izabranom šablonu. Provjeri i sve slajdove zajedno; naslov i opis prikazuju se tamo gdje ih šablon koristi.</p>
    </>}
    <button type="button" onClick={()=>update({artworkEdits:edits.filter(e=>e.artworkId!==id)})}>Vrati podešavanja ovog rada</button>
  </section>;
}

export function PromotionPanoramaControls({config,source,update}:{config:PromotionConfig;source:PromotionSource;update:(patch:any)=>void}){
  const crop=config.panoramaCrop||{fit:'cover',zoom:1,x:50,y:50} as PanoramaCrop;
  const url=source.works.find(w=>w.id===config.artworkIds[0])?.imageUrl;
  const [dimensions,setDimensions]=useState<{url:string;width:number;height:number}|null>(null);
  const [failed,setFailed]=useState(false);
  useEffect(()=>{
    let active=true;setFailed(false);if(!url)return;
    const img=new Image();img.onload=()=>{if(active)setDimensions({url,width:img.naturalWidth,height:img.naturalHeight});};img.onerror=()=>{if(active)setFailed(true);};img.src=url;
    return()=>{active=false;img.onload=null;img.onerror=null;};
  },[url]);
  const metrics=dimensions&&dimensions.url===url?cropMetrics(dimensions.width,dimensions.height,crop):null;
  const set=(patch:Partial<PanoramaCrop>)=>update({panoramaCrop:{...crop,...patch}});
  return <section className="promotion-controls" aria-label="Kadar Panorame">
    <h2>Kadar Panorame</h2>
    <p>Jedno platno od 3240 × 1440 px dijeli se na tri slajda. Pregled i izvoz koriste isti kadar.</p>
    <label>Prikaz slike<select aria-label="Prikaz slike" value={crop.fit} onChange={e=>set({fit:e.target.value as PanoramaCrop['fit']})}>
      <option value="contain">Prikaži cijeli rad</option><option value="cover">Ispuni kadar</option>
    </select></label>
    <p>„Prikaži cijeli rad” čuva cijelu sliku pri uvećanju 1×, uz prazne rubove gdje je potrebno. „Ispuni kadar” može znatno odrezati sliku.</p>
    <div className="promotion-crop-ranges">
      <label>Uvećanje · {crop.zoom.toFixed(2)}×<input aria-label="Uvećanje" type="range" min="0.25" max="3" step="0.01" value={crop.zoom} onChange={e=>set({zoom:Number(e.target.value)})}/></label>
      <label>Horizontalni položaj · {crop.x}%<input aria-label="Horizontalni položaj" type="range" min="0" max="100" value={crop.x} onChange={e=>set({x:Number(e.target.value)})}/></label>
      <label>Vertikalni položaj · {crop.y}%<input aria-label="Vertikalni položaj" type="range" min="0" max="100" value={crop.y} onChange={e=>set({y:Number(e.target.value)})}/></label>
    </div>
    <button type="button" onClick={()=>set({fit:'contain',zoom:1,x:50,y:50})}>Vrati cijeli rad</button>
    {metrics&&<p role="status">Izvor {dimensions!.width} × {dimensions!.height} px · približno {Math.round(metrics.cropped*100)}% slike van kadra. {metrics.scale>1.05?`Slika se uvećava ${metrics.scale.toFixed(2)}×; izvoz može biti manje oštar.`:'Rezolucija se ne uvećava značajno.'}</p>}
    {failed&&<p role="alert">Dimenzije slike nijesu učitane. Provjeri prikaz prije preuzimanja.</p>}
    <p>Prije izvoza pregledaj sva tri slajda i zajednički prikaz. Vertikalna slika nije zabranjena; ti biraš i prihvataš kadar.</p>
  </section>;
}

"use client";
import { createElement,Fragment,useEffect,useMemo,useRef,useState } from 'react';
import { generationIssues,editorPatch,configFromState,configKey,contentKey,initialState,renderGraphic,renderUi,selected,view } from '@artboard/promotion-renderer';
import type { PromotionData,PromotionVersion } from '@/lib/promotions';
import { promotionRequest } from '@/services/promotions';
import { useAccountTheme } from '@/lib/use-account-theme';
import { ChevronLeft,ChevronRight } from 'lucide-react';
import { PromotionContentControls,PromotionPanoramaControls,PromotionArtworkControls,PromotionLibraryFilters,PromotionCollageTitle } from './promotion-content-controls';
import '@artboard/promotion-renderer/reference-light.css';
import '@artboard/promotion-renderer/reference-dark.css';
import './promotion-editor.css';

export function PromotionEditor({initial}:{initial:PromotionData}){
  const [data,setData]=useState(initial),[state,setState]=useState(()=>initialState(initial.draft.config,initial.source,initial.usage));
  const [saved,setSaved]=useState(configKey(initial.draft.config)),[revision,setRevision]=useState(initial.draft.revision),[savedAt,setSavedAt]=useState(initial.draft.savedAt);
  const [busy,setBusy]=useState(false),[generating,setGenerating]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(false),[success,setSuccess]=useState(false);
  const {theme,changeTheme,error:themeError}=useAccountTheme(initial.theme),root=useRef<HTMLDivElement>(null),operation=useRef<{signature:string;key:string}|null>(null),alive=useRef(true);
  const config=useMemo(()=>configFromState(state,data.source),[state,data.source]),signature=configKey(config),savedSignature=signature===saved;
  const same=data.history.items.find(v=>v.status==='READY'&&v.contentKey===contentKey(config,data.source));
  const swipe=useRef<{x:number;y:number}|null>(null);
  const [libraryQuery,setLibraryQuery]=useState(''),[libraryCollection,setLibraryCollection]=useState('all');
  const update=(patch:any)=>{setState((s:any)=>editorPatch(s,patch,data.source));if(Object.keys(patch).some(k=>k!=='hov')){setMessage('');setError(false);setSuccess(false);}};
  const count=selected(config).slides,slide=Math.max(0,Math.min(state.slide,count-1));
  function moveSlide(delta:number){setState((s:any)=>editorPatch(s,{slide:s.slide+delta},data.source));}
  useEffect(()=>{
    const host=root.current;if(!host||count<2)return;
    let accumulated=0,last=0,locked=false;
    // A touchpad gesture emits a stream with momentum. Navigate once per stream,
    // and leave vertical scrolling and pinch-to-zoom to the browser.
    const onWheel=(event:WheelEvent)=>{
      const stage=(event.target instanceof Element?event.target:null)?.closest<HTMLElement>('[data-ab="promo-preview"]');if(!stage||!host.contains(stage))return;
      if(event.ctrlKey||Math.abs(event.deltaX)<=Math.abs(event.deltaY)*1.3)return;
      const now=performance.now();if(now-last>180){accumulated=0;locked=false;}last=now;
      event.preventDefault();if(locked)return;
      const dx=event.deltaX*(event.deltaMode===1?16:event.deltaMode===2?stage.clientWidth:1);
      if(Math.sign(dx)!==Math.sign(accumulated))accumulated=0;accumulated+=dx;
      if(Math.abs(accumulated)>=45){const direction=accumulated>0?1:-1;setState((s:any)=>editorPatch(s,{slide:s.slide+direction},data.source));locked=true;accumulated=0;}
    };
    // Delegate from the stable editor root: the graphic DOM can be replaced
    // when a slide/layout changes while the pointer stays still.
    host.addEventListener('wheel',onWheel,{passive:false});return()=>host.removeEventListener('wheel',onWheel);
  },[count,state.tab,data.source,theme]);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  useEffect(()=>{
    const el=root.current;if(!el)return;
    const header=el.querySelector('header');
    const headerObserver=new ResizeObserver(()=>el.style.setProperty('--promotion-header-height',`${header?.getBoundingClientRect().height||68}px`));if(header)headerObserver.observe(header);
    const fit=()=>{el.querySelectorAll<HTMLElement>('[data-ab-stage]').forEach(n=>{const width=n.clientWidth,units=Number(n.dataset.abUnits)||1;n.style.setProperty('--s',String(width/(1080*units)));});};
    fit();const observer=new ResizeObserver(fit);observer.observe(el);const frame=requestAnimationFrame(fit);return()=>{observer.disconnect();headerObserver.disconnect();cancelAnimationFrame(frame);};
  },[state,theme,data.history]);
  useEffect(()=>{root.current?.querySelector('[data-ab-step][aria-current="step"]')?.scrollIntoView({block:'nearest',inline:'nearest'});},[state.tab]);
  // Resume status tracking from durable jobs after a page reload; it never starts
  // another generation or writes a draft merely because the editor opened.
  useEffect(()=>{
    if(generating||!data.history.items.some(v=>v.status==='QUEUED'||v.status==='PROCESSING'))return;
    const t=setInterval(()=>{void promotionRequest<PromotionData>().then(next=>{if(alive.current)setData(next);}).catch(()=>{});},4000);return()=>clearInterval(t);
  },[data.history,generating]);
  async function download(version:PromotionVersion){
    const r=await fetch(`/api/artist/promotions/generations/${version.id}/download/bundle`,{cache:'no-store'});
    if(!r.ok)throw new Error('Preuzimanje nije uspjelo. Generisana objava ostaje u istoriji; pokušaj ponovo besplatno.');
    const url=URL.createObjectURL(await r.blob()),a=document.createElement('a');a.href=url;a.download=version.design.slides>1?`ArtBoard-objava-${version.versionNumber}.zip`:`ArtBoard-objava-${version.versionNumber}.png`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  async function save(){
    if(busy)return;setBusy(true);setMessage('');setError(false);setSuccess(false);
    try{const d=await promotionRequest<PromotionData['draft']>('/draft','PUT',{config,revision});setRevision(d.revision);setSavedAt(d.savedAt);setSaved(configKey(d.config));setMessage('Draft je sačuvan.');}
    catch(e){setMessage((e as Error).message);setError(true);}finally{setBusy(false);}
  }
  async function generate(){
    if(busy)return;
    const issues=generationIssues(config);if(!same&&issues.length){setError(true);setMessage(issues.join(' '));return;}
    if(!same&&data.usage.remaining<=0){window.location.assign('/placanje?proizvod=dopuna-generatora');return;}
    setBusy(true);setGenerating(!same);setMessage('');setError(false);setSuccess(false);
    try{
      let v=same;
      if(!v){
        if(!operation.current||operation.current.signature!==signature)operation.current={signature,key:crypto.randomUUID()};
        v=await promotionRequest<PromotionVersion>('/generations','POST',{config,operationKey:operation.current.key});
        // The API worker owns the job. Closing this page cancels only polling.
        while(v.status==='QUEUED'||v.status==='PROCESSING'){
          if(!alive.current)return;
          await new Promise(resolve=>setTimeout(resolve,1800));
          v=await promotionRequest<PromotionVersion>(`/generations/${v.id}`);
        }
        if(v.status!=='READY'){operation.current=null;throw new Error('Generisanje nije uspjelo. Pravo nije potrošeno; pokušaj ponovo.');}
      }
      await download(v);if(!alive.current)return;
      setSuccess(true);setMessage('Preuzimanje je pokrenuto. Objava je sačuvana u istoriji.');
      const next=await promotionRequest<PromotionData>();if(alive.current)setData(next);
    }catch(e){if(alive.current){setError(true);setMessage((e as Error).message);}}
    finally{if(alive.current){setBusy(false);setGenerating(false);}}
  }
  const history=data.history.items.map(v=>({t:`${v.design.template} · ${v.design.version} · ${v.design.color==='dark'?'Tamna':'Svijetla'}`,m:`${new Date(v.createdAt).toLocaleDateString('sr-Latn-ME')} · ${v.design.slides} slajd${v.design.slides===1?'':'a'} · 3:4 · PNG${v.status==='FAILED'?' · Neuspješno':v.status!=='READY'?' · U obradi':''}`,bg:'#eef0f4',thumbnail:v.status==='READY'?`/api/artist/promotions/generations/${v.id}/download/thumbnail`:undefined,download:async()=>{if(v.status!=='READY'||busy)return;setBusy(true);try{await download(v);setMessage('Preuzimanje je pokrenuto.');setSuccess(true);setError(false);}catch(e){setMessage((e as Error).message);setError(true);}finally{setBusy(false);}},ready:v.status==='READY'}));
  async function moreHistory(){if(busy)return;setBusy(true);try{const next=await promotionRequest<PromotionData>(`?page=${data.history.page+1}`);setData(d=>({...d,history:{...next.history,items:[...d.history.items,...next.history.items]}}));}catch(e){setMessage((e as Error).message);setError(true);}finally{setBusy(false);}}
  const actions={save,generate,changeTheme,busy,generating,error,success,same:Boolean(same),message:themeError||message,history,historyTotal:data.history.total,hasMore:data.history.page<data.history.totalPages,moreHistory,savedText:!savedSignature?'Nije sačuvano':savedAt?`Draft: sačuvano ${new Date(savedAt).toLocaleString('sr-Latn-ME')}`:'Nije sačuvano'};
  const v=view(theme,{...state,plan:data.usage.plan==='PREMIUM'?'premium':data.usage.used?'free0':'free1',used:data.usage.used,extra:data.usage.purchased},data.source,update,actions,data.usage);
  const scopedWorks=v.works,fold=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().replace(/đ/g,'dj'),search=fold(libraryQuery.trim());
  const collectionWorkIds=new Set(libraryCollection==='uncollected'?(data.source.collections||[]).flatMap(c=>c.artworkIds):data.source.collections?.find(c=>c.id===libraryCollection)?.artworkIds||[]);
  v.works=scopedWorks.filter((w:any)=>{
    const source=data.source.works.find(source=>source.id===w.id);
    return (!search||fold(source?.title||'Rad').includes(search))&&(libraryCollection==='all'||(libraryCollection==='uncollected'?!collectionWorkIds.has(w.id):collectionWorkIds.has(w.id)));
  });
  v.workLibraryToolbar=<PromotionLibraryFilters query={libraryQuery} collectionId={libraryCollection} collections={data.source.collections||[]} total={scopedWorks.length} visible={v.works.length} onQuery={setLibraryQuery} onCollection={setLibraryCollection} onReset={()=>{setLibraryQuery('');setLibraryCollection('all');}}/>;
  v.contentSelection=<PromotionContentControls config={config} source={data.source} update={update}/>;
  v.cropControls=<><PromotionArtworkControls config={config} source={data.source} editWorkId={state.editWorkId} update={update}/>{config.template===9&&config.version===0&&<PromotionPanoramaControls config={config} source={data.source} update={update}/>}</>;
  v.headerSummary=<span className="promotion-header-summary" aria-label="Trenutni izbor">{v.tplName} · {config.template===6?'Naslovni + radovi + profil':selected(config).version} · {selected(config).color==='dark'?'Tamna':'Svijetla'} · {config.artworkIds.length} {config.artworkIds.length===1?'rad':config.artworkIds.length>=2&&config.artworkIds.length<=4?'rada':'radova'}</span>;
  if(config.template===8)v.collectionTitleField=<label className="promotion-collection-title"><span>Naziv kolekcije</span><input value={state.collectionTitle||''} maxLength={180} placeholder="Unesi naziv kolekcije" onChange={e=>update({collectionTitle:e.target.value})}/></label>;
  if(config.template===6)v.collectionTitleField=<label className="promotion-collection-title"><span>Naslov objave</span><input aria-label="Naslov objave" value={state.publicationTitle||''} maxLength={180} placeholder="Lorem ipsum" onChange={e=>update({publicationTitle:e.target.value})}/></label>;
  if(config.template===9&&config.version===1)v.collectionTitleField=<PromotionCollageTitle config={config} update={update}/>;
  v.slideNavigation=<div className="promotion-slide-navigation" role="group" aria-label="Navigacija slajdova">
    <button type="button" aria-label="Prethodni slajd" disabled={slide===0} onClick={()=>moveSlide(-1)}><ChevronLeft size={20}/></button>
    <span role="status" aria-live="polite" aria-atomic="true">Slajd {slide+1} od {count}</span>
    <button type="button" aria-label="Sljedeći slajd" disabled={slide>=count-1} onClick={()=>moveSlide(1)}><ChevronRight size={20}/></button>
  </div>;
  v.stageEvents={tabIndex:count>1?0:undefined,role:'group','aria-label':count?`Pregled slajda ${slide+1} od ${count}`:'Pregled objave',
    onKeyDown:(e:React.KeyboardEvent<HTMLDivElement>)=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();moveSlide(e.key==='ArrowLeft'?-1:1);}},
    onTouchStart:(e:React.TouchEvent<HTMLDivElement>)=>{const t=e.touches[0];swipe.current=e.touches.length===1&&t?{x:t.clientX,y:t.clientY}:null;},
    onTouchCancel:()=>{swipe.current=null;},
    onTouchEnd:(e:React.TouchEvent<HTMLDivElement>)=>{const start=swipe.current,t=e.changedTouches[0];swipe.current=null;if(!start||!t||e.touches.length)return;const dx=t.clientX-start.x,dy=t.clientY-start.y;if(Math.abs(dx)>=45&&Math.abs(dx)>Math.abs(dy)*1.3)moveSlide(dx<0?1:-1);}
  };
  if([3,6,8,9].includes(config.template)&&count>1){
    v.carouselOverview=<section data-ab="promo-strip" className="promotion-carousel-overview" aria-label="Svi slajdovi zajedno">
      <div className="promotion-overview-heading"><strong>Svi slajdovi zajedno</strong><span>kako se nastavljaju pri prevlačenju</span></div>
      <div className="promotion-overview-mat"><div className="promotion-overview-slides">
        {Array.from({length:count},(_,i)=><div key={i} className="promotion-overview-frame" data-slide={i+1}>
          {renderGraphic(theme,view(theme,{...state,slide:i},data.source,()=>{},{history:[]},data.usage),createElement,Fragment)}
        </div>)}
      </div></div>
    </section>;
  }
  if(!data.available){v.hasFlash=true;v.flashText='Generisanje nije dostupno dok se ne podese privatni storage i Chrome. Draft i pregled su dostupni.';}
  return <div ref={root} className="promotion-root" data-theme={theme} data-busy={busy?'true':'false'} data-status={error?'error':success?'success':'idle'}>{renderUi(theme,v,createElement,Fragment)}</div>;
}

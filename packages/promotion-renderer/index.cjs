const catalog = require('./catalog.json');
const CURRENT_RENDERER_VERSION=9;
const lightView=require('./view-light.cjs'),darkView=require('./view-dark.cjs');
const lightUi=require('./reference-light.cjs'),darkUi=require('./reference-dark.cjs');
const lightStages=require('./stages-light.cjs'),darkStages=require('./stages-dark.cjs');
const blank = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1080" height="1440"%3E%3Crect width="1080" height="1440" fill="%23eef0f4"/%3E%3C/svg%3E';
function css(s) {
  const result={};
  // Semicolons in data URLs are inside parentheses and must not split a value.
  let depth=0,part='',parts=[];
  for(const c of s||''){ if(c==='(')depth++; if(c===')')depth--; if(c===';'&&depth===0){parts.push(part);part='';}else part+=c; }parts.push(part);
  for(const p of parts){const i=p.indexOf(':');if(i<0)continue;let key=p.slice(0,i).trim();if(!key.startsWith('--'))key=key.replace(/^-ms-/,'ms-').replace(/-([a-z])/g,(_,c)=>c.toUpperCase());result[key]=p.slice(i+1).trim();}return result;
}
function rendererVersionFor(config){return config.template===9&&config.version===1?9:[3,6,8].includes(config.template)?8:config.artworkEdits?.length?7:config.template===9?6:(config.template===1&&config.version===0)?3:2;}
function editorPatch(state,patch,source){
  const next={...state,...patch},rules=selectionRules({template:next.tpl,version:next.ver});
  if(patch.artworkEdits)next.artworkEdits=[...(state.artworkEdits||[]).filter(e=>!next.sel.some(i=>source.works[i]?.id===e.artworkId)),...patch.artworkEdits];
  if(('tpl' in patch||'ver' in patch)&&next.sel.length>rules.max)next.sel=next.sel.slice(0,rules.max);
  if(patch.editWorkId){const index=next.sel.findIndex(i=>source.works[i]?.id===patch.editWorkId);if(index>=0)next.slide=next.tpl===9?next.slide:next.tpl===3?Math.floor(index/3):index+(next.tpl===6?1:0);}
  const count=selected(configFromState(next,source)).slides;next.slide=Math.max(0,Math.min(next.slide,count-1));
  if(!next.sel.some(i=>source.works[i]?.id===next.editWorkId)||'slide' in patch){const index=next.tpl===9?Math.max(0,next.sel.findIndex(i=>source.works[i]?.id===next.editWorkId)):next.tpl===6?Math.max(0,next.slide-1):next.tpl===3?next.slide*3:next.slide;next.editWorkId=source.works[next.sel[Math.min(index,next.sel.length-1)]]?.id||'';}
  return next;
}
function selectionRules(c){
  const min=c.template===6?2:c.template===3?3:1,max=c.template===9?(c.version===0?1:6):9,carousel=[6,8,9].includes(c.template);
  const hint=c.template===9?(c.version===0?'Izaberi jedan rad za tri povezana slajda. Vertikalne slike su dozvoljene; kadar prilagodi u trećem koraku.':'Izaberi do šest radova za tri povezana slajda. Ako ih je manje od šest, ponavljaju se u kolažu.'):c.template===6?'Naslovni i završni slajd su uvijek uključeni. Između njih je po jedan slajd za svaki izabrani rad.':'Izaberi do devet radova. Svaki izabrani rad daje jedan slajd; redoslijed izbora je redoslijed slajdova.';
  return {min,max,carousel,hint:c.template===3?'Izaberi najmanje tri rada. Svaki slajd prikazuje do tri rada, u redosljedu izbora.':c.template===6?'Izaberi najmanje dva rada i unesi naslov objave. Naslovni i završni slajd su uvijek uključeni, uz po jedan slajd za svaki rad.':hint};
}
function generationIssues(c){const r=selectionRules(c),issues=[];if(c.artworkIds.length<r.min)issues.push(`Izaberi najmanje ${r.min} ${r.min===1?'rad':'rada'}.`);if(c.artworkIds.length>r.max)issues.push(`Izaberi najviše ${r.max} radova.`);if(c.template===6&&(!c.publicationTitle?.trim()||/^lorem\s+ipsum[.!?]*$/i.test(c.publicationTitle.trim())))issues.push('Unesi stvarni naslov objave; Lorem ipsum je samo privremeni prikaz.');if(c.template===8&&!c.collectionTitle?.trim())issues.push('Unesi naziv kolekcije.');return issues;}
function cropMetrics(width,height,crop){
  // The existing export worker normalizes artwork to a maximum side of 4500.
  const normalization=Math.min(1,4500/Math.max(width,height));width*=normalization;height*=normalization;
  const scale=(crop.fit==='contain'?Math.min(3240/width,1440/height):Math.max(3240/width,1440/height))*crop.zoom;
  return {scale,cropped:Math.max(0,1-Math.min(1,3240/(width*scale))*Math.min(1,1440/(height*scale)))};
}
function selected(config,rendererVersion=rendererVersionFor(config)) {
  const t=catalog.templates[config.template],version=t?.vers[config.version];
  if(!version)throw Error('Unknown template version');
  const code=config.color==='dark'?(version[2]||version[1]):(version[1]||version[2]);
  const slides=config.template===3&&rendererVersion>=8?Math.ceil(config.artworkIds.length/3):rendererVersion===1?(code.startsWith('7')?Math.max(1,config.artworkIds.length)+2:catalog.meta[code][0]):config.template===9&&rendererVersion>=3?(config.artworkIds.length?3:0):config.template===6&&rendererVersion>=4?(config.artworkIds.length?config.artworkIds.length+(rendererVersion>=6?2:1):0):config.artworkIds.length;
  return {template:t.name,version:config.template===3&&rendererVersion>=8&&config.version===1?'Photo Dump 3 rada':version[0],code,color:code===version[2]?'dark':'light',slides};
}
function initialState(config,source,usage){return {tab:0,hov:-1,hv:'A',plan:usage.plan==='PREMIUM'?'premium':usage.used?'free0':'free1',tpl:config.template,ver:config.version,dark:config.color==='dark',fmt:'34',slide:0,sel:config.artworkIds.map(id=>source.works.findIndex(w=>w.id===id)).filter(i=>i>=0),artworkEdits:config.artworkEdits||[],editWorkId:config.artworkIds[0]||'',name:config.name,ig:config.instagram,form:source.form||'n',title:config.title,collectionTitle:config.collectionTitle||'',publicationTitle:config.publicationTitle||'',sourceCollectionId:config.sourceCollectionId||'',panoramaCrop:config.panoramaCrop||{fit:'cover',zoom:1,x:50,y:50},desc:config.description,sign:config.signature==='logo'?'ArtBoard logo':'Instagram tag',lang:config.language==='EN'?'English':'Crnogorski',file:'PNG',used:usage.used,extra:usage.purchased,buy:'idle',log:null,lastSig:null,flash:'',saved:'Nije sačuvano',qrPath:source.qrPath||'',qrView:source.qrView||'0 0 1 1'};}
function configFromState(s,source){const c={artworkIds:s.sel.map(i=>source.works[i]?.id).filter(Boolean),template:s.tpl,version:s.ver,color:s.dark?'dark':'light',language:s.lang==='English'?'EN':'ME',name:s.name,instagram:s.ig,title:s.title,...(s.collectionTitle?{collectionTitle:s.collectionTitle}:{}),...(s.publicationTitle?{publicationTitle:s.publicationTitle}:{}),...(s.sourceCollectionId&&[6,8,9].includes(s.tpl)?{sourceCollectionId:s.sourceCollectionId}:{}),...(s.tpl===9&&s.ver===0?{panoramaCrop:s.panoramaCrop||{fit:'cover',zoom:1,x:50,y:50}}:{}),...(s.artworkEdits?.some(e=>(e.title!==undefined||e.description!==undefined||e.crop)&&s.sel.some(i=>source.works[i]?.id===e.artworkId))?{artworkEdits:s.artworkEdits.filter(e=>(e.title!==undefined||e.description!==undefined||e.crop)&&s.sel.some(i=>source.works[i]?.id===e.artworkId)).map(e=>({artworkId:e.artworkId,...(e.title!==undefined?{title:e.title}:{}),...(e.description!==undefined?{description:e.description}:{}),...(e.crop?{crop:{fit:e.crop.fit,zoom:e.crop.zoom,x:e.crop.x,y:e.crop.y}}:{})})).sort((a,b)=>a.artworkId.localeCompare(b.artworkId))}:{}),description:s.desc,signature:s.sign==='ArtBoard logo'?'logo':'instagram'};c.color=selected(c).color;return c;}
function configKey(c){const values=[c.artworkIds,c.template,c.version,c.color,c.language,c.name,c.instagram,c.title,c.description,c.signature];if(c.collectionTitle)values.push(c.collectionTitle);if(c.publicationTitle)values.push({publicationTitle:c.publicationTitle});if(c.sourceCollectionId)values.push({sourceCollectionId:c.sourceCollectionId});if(c.panoramaCrop)values.push({panoramaCrop:{fit:c.panoramaCrop.fit,zoom:c.panoramaCrop.zoom,x:c.panoramaCrop.x,y:c.panoramaCrop.y}});if(c.artworkEdits?.length)values.push({artworkEdits:[...c.artworkEdits].sort((a,b)=>a.artworkId.localeCompare(b.artworkId)).map(e=>({artworkId:e.artworkId,...(e.title!==undefined?{title:e.title}:{}),...(e.description!==undefined?{description:e.description}:{}),...(e.crop?{crop:{fit:e.crop.fit,zoom:e.crop.zoom,x:e.crop.x,y:e.crop.y}}:{})}))});return JSON.stringify(values);}
function contentKey(c,s,rendererVersion=rendererVersionFor(c)){return JSON.stringify([configKey(c),s.name,s.avatar,s.form,s.profileUrl,s.shortUrl,s.qrPath,s.qrView,s.year,c.artworkIds.map(id=>{const w=s.works.find(w=>w.id===id);return rendererVersion>=8?[id,w?.title,w?.imageUrl,w?.description]:[id,w?.title,w?.imageUrl];}),rendererVersion]);}
function view(theme,state,source,update,actions,usage,rendererVersion=rendererVersionFor(configFromState(state,source))){
  const build=(theme==='dark'?darkView:lightView).buildView,model={...source,blank};
  const v=build(state,model,update,actions,usage),p=source.name.trim().split(/\s+/);
  const ids=order=>Array.from({length:9},(_,i)=>source.works[order[i%order.length]]?.id);
  v.imageWorkIds=ids(state.sel);v.artworkEdits=rendererVersion>=7?state.artworkEdits||[]:[];v.singlePanorama=state.tpl===9&&state.ver===0;
  const picker=build({...state,slide:0},model,update,actions,usage);
  v.pickerValues=Object.fromEntries(['img','title','s7','sw','first','last','last2','fsFirst','fsLast'].map(k=>[k,picker[k]]));
  v.pickerValues.imageWorkIds=ids(state.sel);
  const pickerSource=source.works[state.sel[0]],pickerEdit=v.artworkEdits.find(e=>e.artworkId===pickerSource?.id);
  v.pickerValues.workTitle=pickerEdit?.title??pickerSource?.title??'';
  v.pickerValues.workDescription=pickerEdit?.description??(pickerSource?.description||state.desc||'').slice(0,120);
  v.pickerValues.desc=rendererVersion>=8?v.pickerValues.workDescription:pickerEdit?.description??state.desc;
  v.detailFlow=rendererVersion>=8;v.galleryFlow=rendererVersion>=8&&state.tpl===3;v.publicationTitle=state.publicationTitle?.trim()||'Lorem ipsum';
  v.collectionTitle=state.collectionTitle||'';
  v.collageTitle=state.publicationTitle?.trim()||(state.sourceCollectionId?state.collectionTitle?.trim():'')||state.ig?.trim()||'Lorem ipsum';
  v.collageTag=v.collageTitle===state.ig?.trim()?'':state.ig;
  v.collageHeadingFlow=rendererVersion>=9&&state.tpl===9&&state.ver===1;
  v.museumLabelFlow=rendererVersion>=3;
  v.gridCarouselFlow=rendererVersion>=3;
  v.panoramaFlow=rendererVersion>=6;
  const crop=state.panoramaCrop||{fit:'cover',zoom:1,x:50,y:50};
  v.cropFit=crop.fit;v.cropZoom=crop.zoom;v.cropX=crop.x;v.cropY=crop.y;
  const rules=selectionRules({template:state.tpl,version:state.ver});v.total=rules.max;
  v.works=v.works.map((w,i)=>({...w,id:source.works[i].id,toggle:()=>{const on=state.sel.includes(i);update({sel:on?state.sel.filter(k=>k!==i):rules.max===1?[i]:state.sel.length<rules.max?[...state.sel,i]:state.sel});}}));
  if(state.sourceCollectionId&&rules.carousel){const ids=source.collections?.find(c=>c.id===state.sourceCollectionId)?.artworkIds||[];v.works=v.works.filter((_,i)=>ids.includes(source.works[i].id)).sort((a,b)=>ids.indexOf(a.id)-ids.indexOf(b.id));}
  v.profileFirst=p[0];v.profileLast=p.slice(1).join(' ');
  if(rendererVersion===1)return v;
  const config=configFromState(state,source),design=selected(config,rendererVersion),panorama=config.template===9&&rendererVersion>=3;
  const count=design.slides,index=Math.max(0,Math.min(state.slide,count-1)),closing=config.template===6&&rendererVersion>=4&&count>0&&index===count-1,opening=config.template===6&&rendererVersion>=6&&index===0,workIndex=config.template===6&&rendererVersion>=6?Math.max(0,index-1):index,order=v.galleryFlow?state.sel.slice(index*3,index*3+3):panorama||closing||opening?state.sel:[...state.sel.slice(workIndex),...state.sel.slice(0,workIndex)];
  const code=design.code;
  // The selected work leads each frame. Multi-image layouts retain their context
  // in selection order. Slider adds a closing profile frame in version 4.
  const activeSource=source.works[order[0]],activeId=activeSource?.id,edit=v.artworkEdits.find(e=>e.artworkId===activeId);
  const frame=build({...state,title:edit?.title??state.title,desc:edit?.description??state.desc,sel:order,slide:code.startsWith('7')?1:0},model,update,actions,usage);
  for(const k of ['img','pv','s7','sw','title','first','last','last2','fsFirst','fsLast'])v[k]=frame[k];
  v.imageWorkIds=v.galleryFlow?Array.from({length:9},(_,i)=>source.works[order[i]]?.id):ids(order);
  if(v.galleryFlow)v.img=Object.fromEntries(Object.entries(v.img).map(([k,url])=>[k,/^w[0-8]$/.test(k)&&order[Number(k[1])]===undefined?blank:url]));
  v.workTitle=edit?.title??activeSource?.title??'';v.workDescription=edit?.description??(activeSource?.description||state.desc||'').slice(0,120);v.desc=rendererVersion>=8?v.workDescription:edit?.description??state.desc;v.t=frame.t;
  v.s7={...v.s7,works:v.s7.works.map((w,i)=>({...w,workId:source.works[order[i]]?.id}))};v.sw={...v.sw,workId:activeId};
  if(code.startsWith('7')&&rendererVersion>=3){
    v.sw={...v.sw,title:rendererVersion>=7?(edit?.title??state.title??v.sw.title):v.sw.title,num:String(workIndex+1).padStart(2,'0'),more:index<count-1};
    if(rendererVersion>=8){v.sw={...v.sw,title:v.workTitle,description:v.workDescription};const width=Math.floor((952-20*(state.sel.length-1))/Math.max(1,state.sel.length));v.s7={...v.s7,tw:width+'px',th:Math.min(480,Math.round(width*4/3))+'px'};}
    if(opening)v.pv={[`c${code}_0`]:true};
    if(closing)v.pv={[`c${code}_3`]:true};
  }
  if(code.startsWith('9')&&rendererVersion>=3){
    // Retain one frame per chosen work. The opening and closing layouts are
    // applied to existing frames, with the artwork layout between them.
    const layout=index===0?0:count>2&&index===count-1?2:1;
    v.pv={[`c${code}_${layout}`]:true};
    // The reference's detail/collage slots use w1 and w2..w4. Keep the
    // current work first instead of skipping it after rotating the selection.
    v.img={...frame.img,w1:frame.img.w0,w2:frame.img.w0,w3:frame.img.w1,w4:frame.img.w2};
    v.imageWorkIds=[v.imageWorkIds[0],v.imageWorkIds[0],v.imageWorkIds[0],v.imageWorkIds[1],v.imageWorkIds[2],...v.imageWorkIds.slice(5)];
  }
  if(config.template===8&&rendererVersion>=5){
    v.title=v.collectionTitle;v.titleLabel='Naziv kolekcije';
    v.onTitle=e=>update({collectionTitle:e.target.value});
    v.profileRows=v.profileRows.map(r=>r.label==='Naslov rada'?{label:'Naziv kolekcije',value:v.collectionTitle||'—'}:r);
  }
  // Panorama crops one stable canvas instead of rotating the source artwork.
  v.dx=panorama?`${-1080*index}px`:'0px';v.dy='0px';v.slidesN=count;v.slideIndex=index;v.multi=count>1;
  v.slidesStat=count===1?'Slajd u objavi':'Slajda u objavi';
  v.previewNote=`1080 × 1440 px · ${count} ${count===1?'slajd':count>=2&&count<=4?'slajda':'slajdova'} · PNG`;
  v.showNeed=count===0;
  v.needLine=count?'Svaki izabrani rad je jedan slajd. Redoslijed izbora je redoslijed slajdova.':'Izaberi bar jedan rad za objavu.';
  if(config.template===8&&rendererVersion>=5&&count&&!v.collectionTitle.trim()){
    v.showNeed=true;v.needLine='Unesi naziv kolekcije u koraku Šablon ili Prilagodi prije izvoza.';
  }
  if(config.template===6&&rendererVersion>=4&&count){
    v.showNeed=true;
    v.needLine=rendererVersion>=6?rules.hint:'Svaki izabrani rad je jedan slajd, a posljednji slajd predstavlja tvoj ArtBoard profil.';
  }
  if(panorama&&count){
    v.previewNote='1080 × 1440 px · 3 povezana slajda · PNG';
    v.showNeed=true;
    v.needLine=config.version===0?(rendererVersion>=6?rules.hint:'Panorama koristi prvi izabrani rad preko tri povezana slajda.'):'Panorama koristi prvih šest izabranih radova preko tri povezana slajda. Ako ih ima manje, slike se ponavljaju u kolažu.';
  }
  if(state.sel.length>rules.max){v.showNeed=true;v.needLine=`Ova verzija dozvoljava najviše ${rules.max} ${rules.max===1?'rad':'radova'}. Smanji izbor u koraku Radovi prije izvoza.`;}
  const editedId=state.editWorkId||config.artworkIds[0],edited=state.artworkEdits?.find(e=>e.artworkId===editedId),editedSource=source.works.find(w=>w.id===editedId);
  const writeEdit=patch=>{const old=state.artworkEdits||[];update({artworkEdits:[...old.filter(e=>e.artworkId!==editedId),{...old.find(e=>e.artworkId===editedId),artworkId:editedId,...patch}]});};
  v.editorTitle=edited?.title??state.title??editedSource?.title??'';v.editorDesc=edited?.description??(rendererVersion>=8?(editedSource?.description||state.desc||'').slice(0,120):state.desc);v.descCount=`${v.editorDesc.length} / 120 znakova`;
  v.onDesc=e=>writeEdit({description:e.target.value});
  if(config.template===6)v.vers=v.vers.map(o=>({...o,label:'Naslovni + radovi + profil'}));
  if(config.template!==8)v.onTitle=e=>writeEdit({title:e.target.value});else v.editorTitle=v.collectionTitle;
  if(v.collageHeadingFlow){v.titleLabel='Naslov kolaža';v.titlePlaceholder=v.collageTitle;v.editorTitle=state.publicationTitle||'';v.onTitle=e=>update({publicationTitle:e.target.value});}
  if(v.galleryFlow){v.showNeed=true;v.needLine=rules.hint;if(config.version===1)v.vers=v.vers.map((o,i)=>i===1?{...o,label:'Photo Dump 3 rada'}:o);}
  const issues=generationIssues(config);v.generationBlocked=issues.length>0;if(issues.length){v.showNeed=true;v.needLine=issues.join(' ');}
  v.summary=[v.tplName,v.varName,'3:4 · 1080 × 1440',`${count} ${count===1?'slajd':'slajdova'}`];
  return v;
}
function editedImages(v,h){return (tag,props,...children)=>{
  const edit=tag==='img'&&!v.singlePanorama&&props?.['data-promotion-work']&&v.artworkEdits?.find(e=>e.artworkId===props['data-promotion-work']);
  if(!edit?.crop)return h(tag,props,...children);
  const c=edit.crop;
  // Keep the template's original image box. Zoom only its clipped contents,
  // otherwise enlarged images can cover captions and other artwork slots.
  return h('div',{'data-promotion-image':edit.artworkId,style:{...props.style,overflow:'hidden'}},h('img',{...props,style:{display:'block',width:'100%',height:'100%',objectFit:c.fit,objectPosition:`${c.x}% ${c.y}%`,transform:`scale(${c.zoom})`,transformOrigin:`${c.x}% ${c.y}%`}},...children));
};}
function renderUi(theme,v,h,F){const mod=theme==='dark'?darkUi:lightUi,stages=theme==='dark'?darkStages:lightStages;return mod.ui(v,h,F,css,(i,values,scope)=>{
  // Picker thumbnails always show the current design, even when a different
  // template is selected. Historical exports still use graphicHTML's version.
  const picker=i===0||i===1,gallery=Object.entries((i===0?scope.tp:scope.vv)||{}).some(([k,on])=>/^c4[a-f]$/.test(k)&&on===true),grid=Object.entries((i===0?scope.tp:scope.vv)||{}).some(([k,on])=>/^c9[c-f]$/.test(k)&&on===true);
  const collage=Object.entries((i===0?scope.tp:scope.vv)||{}).some(([k,on])=>/^c10[bc]$/.test(k)&&on===true);
  const graphic=stages.stage(i,{...values,...(picker?values.pickerValues:null),...(picker&&grid?{title:values.collectionTitle||''}:null),collageHeadingFlow:picker?collage:values.collageHeadingFlow,detailFlow:picker?true:values.detailFlow,galleryFlow:picker?gallery:values.galleryFlow,panoramaFlow:picker?true:values.panoramaFlow,museumLabelFlow:true,gridCarouselFlow:true},scope,editedImages(values,h),F,css);
  return i===2?h('div',{'data-ab':'promo-swipe',...v.stageEvents},graphic):graphic;
});}
function renderGraphic(theme,v,h,F){return (theme==='dark'?darkStages:lightStages).stage(2,{...v,museumLabelFlow:true,gridCarouselFlow:true},{},editedImages(v,h),F,css);}
const escape = s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const htmlTag=(tag,props,...children)=>{
  const content=children.flat(Infinity).filter(v=>v!==null&&v!==undefined&&v!==false).map(v=>v&&typeof v==='object'?v.__html||'':escape(v)).join('');
  if(!tag)return {__html:content};
  const attributes=Object.entries(props||{}).filter(([k,v])=>k!=='key'&&!k.startsWith('on')&&k!=='ref'&&v!==false&&v!=null).map(([k,v])=>{
    k=({className:'class',viewBox:'viewBox',strokeWidth:'stroke-width',strokeLinecap:'stroke-linecap',strokeLinejoin:'stroke-linejoin',fillRule:'fill-rule',clipRule:'clip-rule',shapeRendering:'shape-rendering'})[k]||k;
    if(k==='style')v=Object.entries(v).map(([k,v])=>(k.startsWith('--')?k:k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase()))+':'+v).join(';');
    return ` ${k}="${escape(v)}"`;
  }).join('');
  return {__html:`<${tag}${attributes}>${content}${['img','input','br','hr'].includes(tag)?'':`</${tag}>`}`};
};
function graphicHTML(snapshot,slide=0){
  const {config}=snapshot, usage={plan:'FREE',limit:1,used:0,reserved:0,purchased:0,remaining:1},state=initialState(config,snapshot.source,usage);state.slide=slide;
  const v=view('light',state,snapshot.source,()=>{}, {history:[],historyTotal:0},usage,snapshot.rendererVersion??rendererVersionFor(config));
  return require('./stages-light.cjs').stage(2,v,{},editedImages(v,htmlTag),null,css).__html;
}
module.exports={generationIssues,editorPatch,selectionRules,cropMetrics,CURRENT_RENDERER_VERSION,rendererVersionFor,catalog,blank,css,selected,initialState,configFromState,configKey,contentKey,view,renderUi,renderGraphic,graphicHTML,escape};

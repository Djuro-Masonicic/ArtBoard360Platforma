const {test}=require('node:test'),assert=require('node:assert/strict');
const {createElement,Fragment}=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {catalog,selected,view,initialState,graphicHTML,renderUi,contentKey,rendererVersionFor}=require('@artboard/promotion-renderer');
const source={name:'Test umjetnica',avatar:'https://storage.invalid/avatar.png',form:'f',profileUrl:'https://artboard.example/test',shortUrl:'artboard.example/test',qrPath:'M4 4h1v1h-1z',qrView:'0 0 29 29',year:2026,works:Array.from({length:5},(_,i)=>({id:`work-${i}`,title:`Rad ${i+1}`,imageUrl:`https://storage.invalid/rad-${i+1}.png`}))};
const config={artworkIds:['work-3','work-0','work-4'],template:0,version:0,color:'light',language:'ME',name:'Test umjetnica',instagram:'@test',title:null,description:'Opis',signature:'instagram'};
const usage={plan:'FREE',used:0,reserved:0,limit:1,remaining:1,purchased:0,periodStart:null,periodEnd:null};
const presentation=(c,slide=0,theme='light')=>view(theme,{...initialState(c,source,usage),slide},source,()=>{},{history:[]},usage);
test('templates other than Slider and Panorama have one slide per selected work, in selection order',()=>{
  for(let template=0;template<catalog.templates.length;template++)for(let version=0;version<catalog.templates[template].vers.length;version++){
    if([3,6,9].includes(template))continue;
    const c={...config,template,version};assert.equal(selected(c).slides,3);
    for(let i=0;i<3;i++){const v=presentation(c,i);assert.equal(v.slidesN,3);assert.equal(v.img.w0,source.works.find(w=>w.id===c.artworkIds[i]).imageUrl);assert.equal(v.title,template===8?'':source.works.find(w=>w.id===c.artworkIds[i]).title);}
  }
});

test('Panorama always crops three connected slides from one stable canvas and retains historical output',()=>{
  for(const version of [0,1])for(const color of ['light','dark'])for(const length of [1,2,3,5]){
    const c={...config,template:9,version,color,artworkIds:source.works.slice(0,length).map(w=>w.id)};
    assert.equal(rendererVersionFor(c),version===1?9:6);assert.equal(selected(c).slides,3);
    const first=presentation(c);
    for(let slide=0;slide<3;slide++){
      const v=presentation(c,slide);
      assert.deepEqual(v.img,first.img);assert.deepEqual(v.pv,first.pv);assert.equal(v.title,first.title);
      assert.equal(v.dx,`${-1080*slide}px`);assert.equal(v.slideIndex,slide);assert.equal(v.slidesN,3);assert.equal(v.multi,true);
      assert(v.previewNote.includes('3 povezana slajda'));
      assert(!v.needLine.includes('Svaki izabrani rad je jedan slajd'));
    }
    assert.equal(presentation(c,99).dx,'-2160px');
    assert.notEqual(contentKey(c,source),contentKey(c,source,2));
    assert.equal(selected(c,2).slides,length);
    const old=view('light',{...initialState(c,source,usage),slide:1},source,()=>{},{history:[]},usage,2);
    assert.equal(old.dx,'0px');
    const empty={...c,artworkIds:[]};assert.equal(selected(empty).slides,0);assert.equal(presentation(empty).slidesN,0);assert.equal(presentation(empty).multi,false);
  }
});
test('Slider always has opening, one frame per selected work, and closing profile page',()=>{
  const c={...config,template:6};assert.equal(selected(c).slides,5);assert.deepEqual(presentation(c,0).pv,{c7a_0:true});
  for(let i=0;i<3;i++){const v=presentation(c,i+1);assert.deepEqual(v.pv,{c7a_1:true});assert.equal(v.sw.img,v.img.w0);}
  assert.deepEqual(presentation(c,4).pv,{c7a_3:true});
  const closing=graphicHTML({config:c,source},4);assert(closing.includes('Pogledaj moj ')&&closing.includes('ArtBoard')&&closing.includes(' profil'));
  assert.equal(selected({...c,artworkIds:['work-0']}).slides,3);assert.equal(selected({...c,artworkIds:[]}).slides,0);
});

test('Slider numbers each work and retains its continuation arrow before the closing profile page',()=>{
  const c={...config,template:6};
  for(let i=0;i<3;i++){
    const v=presentation(c,i+1);
    assert.equal(v.sw.num,String(i+1).padStart(2,'0'));
    assert.equal(v.sw.more,true);
  }
  assert.notEqual(contentKey(c,source),contentKey(c,source,2));
  assert.notEqual(contentKey(c,source),contentKey(c,source,3));assert.equal(rendererVersionFor(c),8);
  const previous=view('light',{...initialState(c,source,usage),slide:2},source,()=>{},{history:[]},usage,3);
  assert.equal(selected(c,3).slides,3);assert.equal(previous.sw.more,false);assert.deepEqual(previous.pv,{c7a_1:true});
  const old=view('light',{...initialState(c,source,usage),slide:2},source,()=>{},{history:[]},usage,2);
  assert.equal(old.sw.num,'01');assert.equal(old.sw.more,true);
});

test('Grid uses its opening, artwork and closing layouts without adding slides or skipping the active work',()=>{
  for(const version of [0,1])for(const color of ['light','dark']){
    const c={...config,template:8,version,color},code=selected(c).code;
    assert.equal(rendererVersionFor(c),8);
    assert.notEqual(contentKey(c,source),contentKey(c,source,2));
    for(let i=0;i<3;i++){
      const v=presentation(c,i),active=source.works.find(w=>w.id===c.artworkIds[i]).imageUrl;
      assert.equal(v.slidesN,3);assert.deepEqual(v.pv,{[`c${code}_${i}`]:true});
      assert.equal(v.img['w'+i],active);
    }
    const five={...c,artworkIds:source.works.map(w=>w.id)};
    assert.equal(selected(five).slides,5);
    assert.deepEqual(presentation(five,3).pv,{[`c${code}_1`]:true});
    assert.deepEqual(presentation(five,4).pv,{[`c${code}_2`]:true});
    const one={...c,artworkIds:['work-0']};
    assert.equal(selected(one).slides,1);assert.deepEqual(presentation(one).pv,{[`c${code}_0`]:true});
    const two={...c,artworkIds:['work-0','work-1']};
    assert.equal(selected(two).slides,2);assert.deepEqual(presentation(two,1).pv,{[`c${code}_1`]:true});
    const old=view('light',{...initialState(c,source,usage),slide:2},source,()=>{},{history:[]},usage,2);
    assert.deepEqual(old.pv,{[`c${code}_0`]:true});
    assert.equal(old.img.w2,source.works.find(w=>w.id===c.artworkIds[1]).imageUrl);
    assert.match(graphicHTML({config:c,source},2),/width:596px;height:124px/);
    assert.doesNotMatch(graphicHTML({config:c,source,rendererVersion:1},2),/width:596px;height:124px/);
  }
});

test('Grid uses a separate collection title without overwriting artwork titles or legacy snapshots',()=>{
  const c={...config,template:8,title:'Ručni naziv rada',collectionTitle:'Noćne skice'};
  for(let i=0;i<3;i++){const v=presentation(c,i);assert.equal(v.title,'Noćne skice');assert.equal(v.titleLabel,'Naziv kolekcije');}
  const current=graphicHTML({config:c,source},1);assert(current.includes('Rad 1')&&!current.includes('Ručni naziv rada')&&!current.includes('Noćne skice'));
  const old=view('light',{...initialState(c,source,usage),slide:1},source,()=>{},{history:[]},usage,3);assert.equal(old.title,'Ručni naziv rada');
  assert.notEqual(contentKey(c,source),contentKey(c,source,3));
  const other=presentation({...c,template:0},1);assert.equal(other.title,'Ručni naziv rada');
});
test('empty selection, last-slide removal and stale slide indexes stay safe',()=>{
  assert.equal(selected({...config,artworkIds:[]}).slides,0);
  assert.equal(presentation({...config,artworkIds:[]},9).slidesN,0);
  assert.equal(presentation({...config,artworkIds:['work-0']},9).img.w0,source.works[0].imageUrl);
});
test('legacy snapshots keep original slide counts and renderer identity',()=>{
  const c={...config,template:6};assert.equal(selected(c,1).slides,5);assert.equal(selected(c,2).slides,3);
  assert.notEqual(contentKey(c,source,1),contentKey(c,source,2));
  const legacy=graphicHTML({config:c,source,rendererVersion:1},0),current=graphicHTML({config:c,source,rendererVersion:2},0);assert.notEqual(legacy,current);
});

test('revised layouts get new output while other designs retain existing content identity',()=>{
  const museum={...config,template:1,version:0};
  assert.equal(rendererVersionFor(museum),3);
  assert.notEqual(contentKey(museum,source),contentKey(museum,source,2));
  assert.match(graphicHTML({config:museum,source}),/data-promotion-layout="museum-label"/);
  assert.doesNotMatch(graphicHTML({config:museum,source,rendererVersion:2}),/data-promotion-layout="museum-label"/);
  for(let template=0;template<catalog.templates.length;template++)for(let version=0;version<catalog.templates[template].vers.length;version++){
    if((template===1&&version===0)||[3,6,8,9].includes(template))continue;
    const c={...config,template,version};
    assert.equal(rendererVersionFor(c),2);
    assert.equal(contentKey(c,source),contentKey(c,source,2));
  }
});
test('unselected Museum Label thumbnails use the current layout independently of the active design',()=>{
  for(const theme of ['light','dark'])for(const [template,version] of [[0,0],[1,1],[2,0]]){
    const c={...config,template,version,color:theme};
    const v=view(theme,{...initialState(c,source,usage),tab:0},source,()=>{},{history:[]},usage);
    const html=renderToStaticMarkup(renderUi(theme,v,createElement,Fragment));
    assert(html.includes('data-promotion-layout="museum-label"'),`${theme}, active template ${template}/${version}: unselected thumbnail still shows the old cutout`);
  }
});

test('all template/color React renders have valid SVG props in development',()=>{
  const errors=[],original=console.error;console.error=(...args)=>errors.push(args.join(' '));
  let qrHtml='';
  try{
    for(let template=0;template<catalog.templates.length;template++)for(let version=0;version<catalog.templates[template].vers.length;version++)for(const color of ['light','dark']){
      const v=presentation({...config,template,version,color},1);v.slideNavigation=createElement('span',null,'Slajd 2 od 3');
      renderToStaticMarkup(renderUi(color,v,createElement,Fragment));
      const html=graphicHTML({config:{...config,template,version,color},source},0);if(html.includes('shape-rendering='))qrHtml=html;
    }
    assert.deepEqual(errors,[]);
    assert.match(qrHtml,/shape-rendering="crispEdges"/);
  }finally{console.error=original;}
});

test('template-first navigation, per-version selection and collection ordering are deterministic',()=>{
  const {selectionRules}=require('@artboard/promotion-renderer');
  const s={...source,collections:[{id:'collection',title:'Skice',artworkIds:['work-4','work-0']}]};
  const c={...config,template:9,version:0,sourceCollectionId:'collection',artworkIds:['work-0']};let patch;
  const state=initialState(c,s,usage),v=view('light',state,s,p=>patch=p,{history:[]},usage);
  assert.deepEqual(v.steps.map(s=>s.title),['Šablon','Radovi','Prilagodi','Preuzmi']);assert(v.isSablon&&!v.isSadrzaj);
  assert.equal(selectionRules(c).max,1);assert.equal(selectionRules({...c,version:1}).max,6);
  assert.deepEqual(v.works.map(w=>w.id),['work-4','work-0']);v.works[0].toggle();assert.deepEqual(patch.sel,[4]);
  const v2=view('light',{...state,tab:1},s,()=>{},{history:[]},usage);assert(v2.isSadrzaj&&!v2.isSablon);
  const oversized=presentation({...c,sourceCollectionId:undefined,artworkIds:config.artworkIds});assert.match(oversized.needLine,/najviše 1/);
});

test('Panorama crop is shared across connected frames, roundtrips, and leaves old geometry intact',()=>{
  const {configFromState,configKey,cropMetrics}=require('@artboard/promotion-renderer');
  const crop={fit:'cover',zoom:1.4,x:20,y:70},c={...config,artworkIds:['work-0'],template:9,panoramaCrop:crop};
  assert.deepEqual(configFromState(initialState(c,source,usage),source).panoramaCrop,crop);
  assert.notEqual(configKey(c),configKey({...c,panoramaCrop:{...crop,x:50}}));
  for(let slide=0;slide<3;slide++){
    const html=graphicHTML({config:c,source},slide);assert.match(html,/data-promotion-crop/);assert.match(html,/transform:scale\(1.4\);transform-origin:20% 70%/);assert.match(html,/object-fit:cover;object-position:20% 70%/);
  }
  assert.doesNotMatch(graphicHTML({config:c,source,rendererVersion:3}),/data-promotion-crop/);
  const whole=cropMetrics(1080,1440,{fit:'contain',zoom:1,x:50,y:50}),fill=cropMetrics(1080,1440,{fit:'cover',zoom:1,x:50,y:50});
  assert.equal(whole.scale,1);assert.equal(whole.cropped,0);assert.equal(fill.scale,3);assert(fill.cropped>.66);
  assert.equal(cropMetrics(4000,16000,{fit:'cover',zoom:1,x:50,y:50}).scale,2.88);
  const old={...config,template:6};assert.equal(selected(old,4).slides,4);assert.deepEqual(view('light',initialState(old,source,usage),source,()=>{},{history:[]},usage,4).pv,{c7a_1:true});
});

test('switching to Single Work automatically keeps only the first selected artwork',()=>{
  const {editorPatch}=require('@artboard/promotion-renderer');
  const state=initialState(config,source,usage),next=editorPatch(state,{tpl:9,ver:0,slide:0},source);
  assert.deepEqual(next.sel,[3]);assert.equal(next.editWorkId,'work-3');assert.equal(selected(require('@artboard/promotion-renderer').configFromState(next,source)).slides,3);
});

test('each artwork retains its title, description and crop when reordered, in preview and native output',()=>{
  const {editorPatch,configFromState}=require('@artboard/promotion-renderer');
  const edits=[{artworkId:'work-3',title:'Prvi poseban naslov',description:'Prvi opis',crop:{fit:'contain',zoom:1.25,x:20,y:70}},{artworkId:'work-0',title:'Drugi poseban naslov',description:'Drugi opis',crop:{fit:'cover',zoom:1.7,x:80,y:10}}];
  const c={...config,template:6,artworkEdits:edits};assert.equal(rendererVersionFor(c),8);
  const first=presentation(c,1),second=presentation(c,2);assert.equal(first.sw.title,edits[0].title);assert.equal(second.sw.title,edits[1].title);
  assert.equal(first.editorDesc,edits[0].description);assert.equal(second.desc,edits[1].description);
  const html=graphicHTML({config:c,source},1);assert(html.includes(edits[0].title));assert.match(html,/data-promotion-work="work-3"/);assert.match(html,/object-position:20% 70%;transform:scale\(1.25\)/);
  assert.doesNotMatch(graphicHTML({config:c,source,rendererVersion:6},1),/Prvi poseban naslov/);
  const state=initialState(c,source,usage),reordered=editorPatch(state,{sel:[0,3,4],slide:0},source),saved=configFromState(reordered,source);
  assert.deepEqual(saved.artworkEdits.find(e=>e.artworkId==='work-3'),edits[0]);assert.equal(presentation(saved,2).sw.title,edits[0].title);
  const selecting=editorPatch(reordered,{editWorkId:'work-3'},source);assert.equal(selecting.slide,2);
  assert.notEqual(contentKey(c,source),contentKey({...c,artworkEdits:[...edits.slice(0,1),{...edits[1],title:'Novi naslov'}]},source));
  const reorderedKeys={...c,artworkEdits:edits.map(e=>({crop:{y:e.crop.y,x:e.crop.x,zoom:e.crop.zoom,fit:e.crop.fit},description:e.description,title:e.title,artworkId:e.artworkId}))};assert.equal(require('@artboard/promotion-renderer').configKey(reorderedKeys),require('@artboard/promotion-renderer').configKey(c),'JSONB property ordering must not mark a saved draft as changed');
});

test('Gallery paginates in groups of three without repeating a final partial group, and preserves old versions',()=>{
  const src={...source,works:Array.from({length:9},(_,i)=>({id:'g'+i,title:'Gallery '+i,imageUrl:'https://storage.invalid/g'+i+'.png'}))};
  for(let version=0;version<3;version++)for(const n of [3,4,5,6,7,8,9]){
    const c={...config,template:3,version,artworkIds:src.works.slice(0,n).map(w=>w.id)};assert.equal(selected(c).slides,Math.ceil(n/3));assert.equal(selected(c,7).slides,n);
    for(let slide=0;slide<selected(c).slides;slide++){
      const v=view('light',{...initialState(c,src,usage),slide},src,()=>{},{history:[]},usage);assert.deepEqual(v.imageWorkIds.filter(Boolean),c.artworkIds.slice(slide*3,slide*3+3));
      const html=graphicHTML({config:c,source:src},slide),matches=[...html.matchAll(/data-promotion-work="(g\d)"/g)].map(m=>m[1]);assert.deepEqual(matches,c.artworkIds.slice(slide*3,slide*3+3));
    }
  }
});

test('Slider has a separate required heading, balanced two-work opening and per-work descriptions',()=>{
  const {generationIssues}=require('@artboard/promotion-renderer');
  const c={...config,template:6,artworkIds:['work-3','work-0']},s={...source,works:source.works.map(w=>({...w,description:'Opis '+w.id}))};
  const opening=view('light',initialState(c,s,usage),s,()=>{},{history:[]},usage);assert.equal(opening.publicationTitle,'Lorem ipsum');assert.equal(opening.s7.tw,'466px');assert.equal(opening.s7.th,'480px');assert(generationIssues(c).length);
  for(const publicationTitle of ['', '   ','Lorem ipsum','lOrEm  IpSuM!'])assert(generationIssues({...c,publicationTitle}).length);
  assert.deepEqual(generationIssues({...c,publicationTitle:'Serija radova'}),[]);assert(generationIssues({...c,publicationTitle:'Serija',artworkIds:['work-0']}).length);
  const named={...c,publicationTitle:'Serija radova'};assert(graphicHTML({config:named,source:s},0).includes('Serija radova'));assert(!graphicHTML({config:named,source:s},0).includes('Rad 4'));
  const detail=graphicHTML({config:named,source:s},1);assert(detail.includes('Rad 4')&&detail.includes('Opis work-3'));
  assert(!graphicHTML({config:named,source:s,rendererVersion:7},1).includes('Opis work-3'));
});

test('Grid detail frames use individual titles and descriptions; collection heading remains on opening frames',()=>{
  const c={...config,template:8,collectionTitle:'Kolekcija A',artworkEdits:[{artworkId:'work-0',title:'Poseban naziv',description:'Poseban opis'}]};
  const detail=graphicHTML({config:c,source},1);assert(detail.includes('Poseban naziv')&&detail.includes('Poseban opis')&&!detail.includes('Kolekcija A'));
  assert(graphicHTML({config:c,source},0).includes('Kolekcija A'));assert(graphicHTML({config:c,source,rendererVersion:7},1).includes('Kolekcija A'));
});

test('design and variant cards stay stable when slides have different artwork descriptions',()=>{
  const src={...source,works:source.works.map(w=>({...w,description:'Opis '+w.id}))};
  for(const template of [6,8])for(const color of ['light','dark']){
    const c={...config,template,color,publicationTitle:'Serija',collectionTitle:'Kolekcija'};
    const cards=slide=>{
      const stages=[],h=(tag,props,...children)=>{const node=createElement(tag,props,...children);if(props?.['data-ab-stage']!==undefined)stages.push(renderToStaticMarkup(node));return node;};
      const v=view(color,{...initialState(c,src,usage),slide},src,()=>{},{history:[]},usage);
      renderToStaticMarkup(renderUi(color,v,h,Fragment));assert(stages.length>10);
      return stages.slice(0,-1);
    };
    assert.deepEqual(cards(1),cards(0));assert.deepEqual(cards(2),cards(0));
  }
});

test('Panorama Collage uses a publication/collection heading or tag, and preserves historical artwork headings',()=>{
  for(const color of ['light','dark']){
  const c={...config,template:9,version:1,color,instagram:'@test',title:null},html=graphicHTML({config:c,source},2);
  assert.equal(rendererVersionFor(c),9);assert(html.includes('@test'));assert.equal((html.match(/@test/g)||[]).length,1);assert(!html.includes('Rad 4'));
  const collection={...c,sourceCollectionId:'collection',collectionTitle:'Zajednicka kolekcija'};
  assert(graphicHTML({config:collection,source},2).includes(collection.collectionTitle));
  const custom={...collection,publicationTitle:'Moj <novi> kolaz'};assert(graphicHTML({config:custom,source},2).includes('Moj &lt;novi&gt; kolaz'));
  assert(graphicHTML({config:{...c,instagram:''},source},2).includes('Lorem ipsum'));
  assert(graphicHTML({config:c,source,rendererVersion:6},2).includes('Rad 4'));
  let patch;const v=view(color,initialState(custom,source,usage),source,p=>patch=p,{history:[]},usage);v.onTitle({target:{value:'Promijenjen naslov'}});assert.deepEqual(patch,{publicationTitle:'Promijenjen naslov'});assert.equal(v.titleLabel,'Naslov kolaža');
  }
});

test('removing selected works clamps the slide and drops only their export settings',()=>{
  const {editorPatch,configFromState}=require('@artboard/promotion-renderer'),c={...config,artworkEdits:[{artworkId:'work-3',title:'Moja izmjena'}]};
  let state={...initialState(c,source,usage),slide:2};state=editorPatch(state,{sel:[3,0]},source);assert.equal(state.slide,1);assert.deepEqual(configFromState(state,source).artworkIds,['work-3','work-0']);
  state=editorPatch(state,{sel:[0]},source);assert.equal(state.slide,0);assert(!configFromState(state,source).artworkEdits);state=editorPatch(state,{sel:[]},source);assert.equal(state.slide,0);assert.equal(state.editWorkId,'');assert.equal(selected(configFromState(state,source)).slides,0);
});

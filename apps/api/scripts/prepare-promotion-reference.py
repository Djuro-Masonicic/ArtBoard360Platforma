"""Compile the supplied, trusted Artifact DSL ahead of time. No runtime eval.

Usage: python apps/api/scripts/prepare-promotion-reference.py [reference directory]
The original graphics and UI are kept separate from application/data services.
"""
from html.parser import HTMLParser
from pathlib import Path
import base64, copy, gzip, json, re, sys

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'packages/promotion-renderer'
OUT.mkdir(parents=True, exist_ok=True)
REF = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / 'Downloads'
VOID = {'img', 'br', 'hr', 'input', 'meta', 'link', 'source', 'wbr'}

class Parser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = {'tag': 'root', 'a': {}, 'c': []}
        self.stack = [self.root]
    def handle_starttag(self, tag, attrs):
        n = {'tag': tag, 'a': dict(attrs), 'c': []}
        self.stack[-1]['c'].append(n)
        if tag not in VOID: self.stack.append(n)
    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID: self.handle_endtag(tag)
    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1, 0, -1):
            if self.stack[i]['tag'] == tag:
                self.stack = self.stack[:i]
                break
    def handle_data(self, text): self.stack[-1]['c'].append(text)

def walk(n):
    if isinstance(n, dict):
        yield n
        for c in n['c']: yield from walk(c)
def js(x): return json.dumps(x, ensure_ascii=False)
def expr(s):
    parts = re.split(r'({{[\s\S]*?}})', s or '')
    parts = [('(' + p[2:-2].strip() + ')') if p.startswith('{{') else js(p) for p in parts if p]
    return parts[0] if len(parts) == 1 else ('(' + '+'.join(parts) + ')' if parts else '""')

names = set()
local_names = {'tp','vv','w','sw2','s','o','r','b','g','d','ln','true','false'}
attrs = {'class':'className','viewbox':'viewBox','tabindex':'tabIndex','maxlength':'maxLength',
         'stroke-width':'strokeWidth','stroke-linecap':'strokeLinecap','stroke-linejoin':'strokeLinejoin',
         'fill-rule':'fillRule','clip-rule':'clipRule','preserveaspectratio':'preserveAspectRatio',
         'shape-rendering':'shapeRendering'}

def compile_node(n, stage=False):
    if isinstance(n, str):
        if not n.strip(): return None
        return expr(n)
    tag, a, children = n['tag'], n['a'], n['c']
    if tag in {'helmet','style','script','link','meta'} or 'data-ab-states-row' in a: return None
    if a.get('data-ab')=='promo-strip': return 'v.carouselOverview||null'
    if tag=='div' and any(isinstance(c,dict) and c['tag']=='sc-for' and c['a'].get('list')=='{{ slideBtns }}' for c in children): return 'v.slideNavigation||null'
    args = [v for c in children if (v := compile_node(c, stage)) is not None]
    if tag == 'sc-if' and a.get('value') == '{{ isSadrzaj }}': args.insert(0,'v.contentSelection||null')
    if tag == 'sc-if' and a.get('value') == '{{ isPrilagodi }}': args.insert(0,'v.cropControls||null')
    child = 'h(F,null,' + ','.join(args) + ')' if args else 'null'
    if tag == 'sc-if': return '(' + expr(a['value']) + '?' + child + ':null)'
    if tag == 'sc-for': return '(' + expr(a['list']) + '||[]).map((' + a['as'] + ',_key)=>h(F,{key:_key},' + ','.join(args) + '))'
    if 'data-ab-stage' in a and not stage:
        index = len(stages)
        stages.append(compile_node(n, True))
        return 'stage(' + str(index) + ',v,{tp:typeof tp==="undefined"?null:tp,vv:typeof vv==="undefined"?null:vv},h,F,css)'
    props = []
    work_grid=any(isinstance(c,dict) and c['tag']=='sc-for' and c['a'].get('list')=='{{ works }}' for c in children)
    if work_grid:
        props.extend(['className:"promotion-work-library"','"data-ab":"promo-work-library"'])
    if a.get('sc-camel-on-click')=='{{ w.toggle }}':
        props.extend(['"data-ab":"promo-work-card"','title:w.title'])
    for k, val in a.items():
        if k.startswith('hint-') or k == 'style-hover': continue
        if k == 'style' and 'background:{{ g.bg }}' in (val or ''):
            # Quota segments switch between a flat color and a gradient. React
            # must update longhands only: background would reset size/position
            # on the existing DOM node when the used quota changes.
            val = val.replace('background:{{ g.bg }}',
                'background-color:{{ g.bg.includes("gradient(") ? "transparent" : g.bg }};'
                'background-image:{{ g.bg.includes("gradient(") ? g.bg : "none" }}')
        if k.startswith('sc-camel-'):
            k = re.sub(r'-([a-z])', lambda m:m[1].upper(), k[9:])
            if k == 'defaultValue': k = 'value'
        if k == 'value' and a.get('sc-camel-on-change') == '{{ onTitle }}': val='{{ editorTitle }}'
        if k == 'value' and a.get('sc-camel-on-change') == '{{ onDesc }}': val='{{ editorDesc }}'
        k = attrs.get(k,k)
        if k == 'data-src': k='src'
        if k.startswith('on') and not (val or '').startswith('{{'): continue
        value = expr(val) if val is not None else '""'
        if k == 'style': value='css('+value+')'
        if tag == 'button' and k == 'disabled': value='Boolean('+value+')'
        if k == 'src' and val in logos: value='logos['+js(val)+']'
        if k == 'src' and val == AV: value='img.av'
        if k == 'href' and val in {'/nalog','/account'}: value=js('/artist/dashboard')
        if k == 'href' and val and 'paketi' in val: value=js('/paketi')
        props.append(js(k)+':'+value)
    if tag == 'button': props.append('type:"button"')
    if a.get('style-hover'):
        import hashlib
        cl='promo-hover-'+hashlib.sha256(a['style-hover'].encode()).hexdigest()[:10]
        props.append('className:'+js((a.get('class','')+' '+cl).strip()))
    if a.get('data-ab-theme-set'):
        theme = 'light' if a['data-ab-theme-set']=='svijetla' else 'dark'
        props.append('onClick:()=>v.changeTheme('+js(theme)+')')
    ab = a.get('data-ab')
    if ab == 'gen-title': args.append('v.headerSummary||null')
    if ab == 'promo-preview': props.extend(['tabIndex:0','role:"region"','"aria-label":"Pregled uživo"'])
    if stage and tag == 'img':
        src=a.get('data-src',a.get('src',''))
        m=re.fullmatch(r'{{ img\.w(\d) }}',src)
        if m: props.append('"data-promotion-work":imageWorkIds['+m[1]+']')
        elif src in {'{{ sw.img }}','{{ sw2.img }}'}: props.append('"data-promotion-work":'+('sw' if src=='{{ sw.img }}' else 'sw2')+'.workId')
    if ab == 'promo-versions': args.insert(2,'v.collectionTitleField||null')
    if tag == 'span' and children == ['Naslov rada']: args=['v.titleLabel||"Naslov rada"']
    if ab == 'promo-redownload': props += ['onClick:d.download','disabled:v.busy||!d.ready']
    if ab in {'promo-save','promo-gen','promo-download'}: props.append('disabled:v.busy'+('||v.generationBlocked' if ab in {'promo-gen','promo-download'} else ''))
    if ab == 'promo-saved': props += ['role:"status"','"aria-live":"polite"']
    if tag == 'textarea': props.append('maxLength:120')
    if tag == 'input': props.append('maxLength:180')
    if tag == 'input' and a.get('sc-camel-on-change')=='{{ onTitle }}': props.append('placeholder:v.titlePlaceholder||'+js(a.get('placeholder','')))
    if ab == 'promo-downloads':
        args.append('(v.hasMore?h("button",{type:"button",onClick:v.moreHistory,disabled:v.busy},"Prikaži još"):null)')
    # Replace placeholder thumbnails with the first generated PNG.
    if tag == 'span' and a.get('aria-hidden')=='true' and 'd.bg' in (a.get('style') or ''):
        props.append('style:css("flex:0 0 30px;height:40px;border-radius:5px;overflow:hidden")')
        args=['h("img",{src:d.thumbnail,alt:"",style:css("width:100%;height:100%;object-fit:cover")})']
    if 'data-ab-name' in a: args=['h("span",null,v.profileFirst)','h("span",null,v.profileLast)']
    result='h('+js(tag)+',{' + ','.join(props) + '}' + (','+','.join(args) if args else '') + ')'
    return 'h(F,null,v.workLibraryToolbar||null,'+result+')' if work_grid else result

all_logos={}
for theme, file in [('light','svijetla'),('dark','tamna')]:
    outer=(REF/('generator-'+file+'.html')).read_text('utf8')
    scripts=re.findall(r'<script[^>]*>([\s\S]*?)</script>',outer)
    assets=json.loads(scripts[1]); raw=json.loads(scripts[-1])
    p=Parser();p.feed(raw);tree=p.root
    logos={}
    AV='922d3d54-6951-4ff8-9ea4-81ec65fc6b68'
    for id in {n['a'].get('src') for n in walk(tree) if n['tag']=='img'}:
        if id not in assets or assets[id]['mime']!='image/svg+xml': continue
        x=assets[id];body=base64.b64decode(x['data']);body=gzip.decompress(body) if x.get('compressed') else body
        logos[id]='data:'+x['mime']+';base64,'+base64.b64encode(body).decode()
    all_logos.update(logos)
    root=next(c for n in walk(tree) if n['tag']=='x-dc' for c in n['c'] if isinstance(c,dict) and c['tag']=='div')
    # User revision: Museum Label must show the whole work and place the caption
    # below it. Keep the original branch for immutable older export snapshots.
    for n in list(walk(root)):
        if n['tag'] != 'sc-if' or not re.search(r'\.c2[ab](?:_0)?\b', n['a'].get('value', '')):
            continue
        original = next(c for c in n['c'] if isinstance(c, dict) and c['tag'] == 'div')
        revised = copy.deepcopy(original)
        artwork, caption, year = [c for c in revised['c'] if isinstance(c, dict)]
        revised['a']['data-promotion-layout'] = 'museum-label'
        revised['a']['style'] += ';display:flex;flex-direction:column;padding:64px;gap:40px'
        artwork['a']['data-promotion-artwork'] = ''
        artwork['a']['style'] = 'position:relative;width:100%;flex:1 1 0%;min-height:0;border-radius:32px;overflow:hidden'
        inner = next(c for c in artwork['c'] if isinstance(c, dict))
        inner['a']['style'] = 'position:absolute;inset:0'
        image = next(c for c in inner['c'] if isinstance(c, dict))
        image['a']['style'] = 'display:block;width:100%;height:100%;object-fit:contain'
        caption['a']['style'] = 'min-width:0;display:flex;flex-direction:column;gap:12px;overflow-wrap:anywhere'
        year['a']['style'] = 'display:flex;align-items:flex-end;justify-content:flex-end'
        footer = {'tag':'div','a':{'data-promotion-caption':'','style':'display:grid;grid-template-columns:minmax(0,620px) minmax(0,1fr);gap:32px;flex:0 0 auto'},'c':[caption,year]}
        revised['c'] = [artwork, footer]
        n['c'] = [
            {'tag':'sc-if','a':{'value':'{{ museumLabelFlow }}'},'c':[revised]},
            {'tag':'sc-if','a':{'value':'{{ !museumLabelFlow }}'},'c':[original]}]
    # The separately supplied Grid reference fixes the closing CTA text box
    # at 596 x 124. Older immutable exports retain their original wrapping.
    for n in list(walk(root)):
        if n['tag'] != 'sc-if' or not re.search(r'\.(?:c9[c-f])(?:_2)?\b', n['a'].get('value', '')):
            continue
        for child in walk(n):
            if any(isinstance(c,str) and '{{ t.vpA }}' in c for c in child['c']) and 'gridCarouselFlow' not in child['a'].get('style',''):
                child['a']['style'] += '{{ gridCarouselFlow ? ";width:596px;height:124px" : "" }}'
    # Revised captions and Gallery pagination are versioned, so previous
    # immutable exports retain their original geometry and text bindings.
    for n in list(walk(root)):
        value=n['a'].get('value','')
        if n['tag']!='sc-if': continue
        if re.search(r'\.c10[bc](?:_0)?\b',value):
            for c in walk(n):
                if c['c']==['{{ title }}']:
                    c['c']=['{{ collageHeadingFlow ? collageTitle : title }}']
                    c['a']['style']+='{{ collageHeadingFlow ? ";overflow-wrap:anywhere;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden" : "" }}'
                if c['c']==['{{ ig }}']: c['c']=['{{ collageHeadingFlow ? collageTag : ig }}']
        if re.search(r'\.c7[ab](?:_0)?\b',value):
            for c in walk(n):
                if c['c']==['{{ title }}']:
                    c['c']=['{{ detailFlow ? publicationTitle : title }}']
                    c['a']['style']+='{{ detailFlow ? ";max-width:952px;overflow-wrap:anywhere;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden" : "" }}'
                if 'left:64px;top:480px;display:flex' in c['a'].get('style',''):
                    c['a']['style']=c['a']['style'].replace('top:480px','top:{{ detailFlow ? "360px" : "480px" }}')
        if re.search(r'\.c7[ab]_1\b',value):
            caption=next(c for c in walk(n) if 'left:64px;top:920px' in c['a'].get('style',''))
            caption['a']['style']+='{{ detailFlow ? ";right:64px;max-height:360px;overflow:hidden" : "" }}'
            for c in walk(caption):
                if c['c']==['{{ sw.title }}']: c['a']['style']+='{{ detailFlow ? ";overflow-wrap:anywhere;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden" : "" }}'
            caption['c'].append({'tag':'sc-if','a':{'value':'{{ detailFlow && sw.description }}'},'c':[{'tag':'div','a':{'data-promotion-description':'','style':'font-size:26px;line-height:1.45;opacity:.75;overflow-wrap:anywhere;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:4;overflow:hidden'},'c':['{{ sw.description }}']}]})
        if re.search(r'\.c9[c-f]_1\b',value):
            for c in walk(n):
                if c['c']==['{{ title }}']:
                    c['c']=['{{ detailFlow ? workTitle : title }}']
                    c['a']['style']+='{{ detailFlow ? ";overflow-wrap:anywhere;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:6;overflow:hidden" : "" }}'
                if c['c']==['{{ desc }}']: c['a']['style']+='{{ detailFlow ? ";overflow-wrap:anywhere;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:6;overflow:hidden" : "" }}'
        if re.search(r'\.c4[a-f](?:_0)?\b',value):
            original=copy.deepcopy(n['c']); revised=copy.deepcopy(n['c'])
            container={'tag':'root','a':{},'c':revised}
            for c in list(walk(container)):
                if c['tag']=='img' and (m:=re.fullmatch(r'{{ img\.w(\d) }}',c['a'].get('data-src',''))):
                    parent=next(p for p in walk(container) if any(child is c for child in p['c']))
                    if int(m[1])>=3:
                        grand=next(p for p in walk(container) if any(child is parent for child in p['c']))
                        grand['c']=[child for child in grand['c'] if child is not parent]
                    else:
                        i=parent['c'].index(c);parent['c'][i]={'tag':'sc-if','a':{'value':'{{ imageWorkIds['+m[1]+'] }}'},'c':[c]}
            for c in walk(container):
                style=c['a'].get('style','')
                if 'grid-template-rows:repeat(3' in style: style=style.replace('grid-template-rows:repeat(3,minmax(0,1fr))','grid-template-rows:1fr')
                if 'grid-template-columns:repeat(4' in style: style=style.replace('grid-template-columns:repeat(4','grid-template-columns:repeat(2')
                if style:c['a']['style']=style
            n['c']=[{'tag':'sc-if','a':{'value':'{{ galleryFlow }}'},'c':revised},{'tag':'sc-if','a':{'value':'{{ !galleryFlow }}'},'c':original}]
    # New Panorama snapshots use an adjustable single canvas. Retain the
    # original image geometry for historical exports (renderer <= 3).
    for n in list(walk(root)):
        if n['tag'] != 'sc-if' or not re.search(r'\.c10a(?:_0)?\b', n['a'].get('value','')): continue
        image_box = next(c for c in walk(n) if c['a'].get('style') == 'position:absolute;left:0;right:0;top:-1080px;height:4050px')
        original = copy.deepcopy(image_box)
        revised = copy.deepcopy(image_box)
        revised['a'] = {'data-promotion-crop':'', 'style':'position:absolute;inset:0;transform:scale({{ cropZoom }});transform-origin:{{ cropX }}% {{ cropY }}%'}
        revised['c'][0]['a']['style'] = 'display:block;width:100%;height:100%;object-fit:{{ cropFit }};object-position:{{ cropX }}% {{ cropY }}%'
        image_box.clear()
        image_box.update({'tag':'sc-if','a':{'value':'{{ panoramaFlow }}'},'c':[revised]})
        parent = next(p for p in walk(n) if any(c is image_box for c in p['c']))
        parent['c'].append({'tag':'sc-if','a':{'value':'{{ !panoramaFlow }}'},'c':[original]})
    for n in walk(root):
        n['c']=[re.sub(r'\b2026\b','{{ year }}',c) if isinstance(c,str) else c for c in n['c']]
        if 'style' in n['a']:
            # The Artifact uses a fixed demo image in a blurred backdrop. Use the
            # selected owned artwork in production, exactly like other images.
            n['a']['style']=re.sub(r'url\([\"\']([a-f0-9-]{36})[\"\']\)',lambda m:'url("{{ img.w0 }}")' if m[1] not in logos else m[0],n['a']['style'])
    for n in walk(root):
        for v in n['a'].values(): names.update(re.findall(r'{{\s*([a-zA-Z_$][\w$]*)', v or ''))
        for c in n['c']:
            if isinstance(c,str): names.update(re.findall(r'{{\s*([a-zA-Z_$][\w$]*)',c))
    names.update({'imageWorkIds','editorTitle','editorDesc','workTitle','publicationTitle','detailFlow','galleryFlow','collageTitle','collageTag','collageHeadingFlow'})
    stages=[]; ui=compile_node(root)
    destruct=','.join(sorted(names-local_names))
    (OUT/('reference-'+theme+'.cjs')).write_text('// Generated from supplied Artifact; do not hand-edit.\nconst logos=require("./logos.json");\nexports.ui=function(v,h,F,css,stage){const {'+destruct+'}=v;return '+ui+';};\n',encoding='utf8')
    (OUT/('stages-'+theme+'.cjs')).write_text('// Generated graphics from supplied Artifact; no runtime template evaluator.\nconst logos=require("./logos.json");\nexports.stage=function(i,v,scope,h,F,css){const {'+destruct+'}=v;const {tp,vv}=scope;switch(i){'+''.join('case '+str(i)+':return '+s+';' for i,s in enumerate(stages))+'default:return null;}};\n',encoding='utf8')
    css='\n'.join(''.join(n['c']) for n in walk(tree) if n['tag']=='style' and not n['a'].get('id','').startswith(('ab-mobprev','ab-state')) and n['a'].get('id')!='__claude_design_branding')
    css=re.sub(r'@font-face\s*{[^}]*}','',css)
    css=re.sub(r'#__claude_design_branding[^}]*}', '', css)
    css=css.replace('html body',':scope').replace('body {',':scope {')
    import hashlib
    css+='\n'+''.join('.promo-hover-'+hashlib.sha256(n['a']['style-hover'].encode()).hexdigest()[:10]+':hover{'+n['a']['style-hover']+'}' for n in walk(root) if n['a'].get('style-hover'))
    css='@scope (.promotion-root[data-theme="'+theme+'"]) {\n'+css+'\n}\n'
    (OUT/('reference-'+theme+'.css')).write_text(css,encoding='utf8')
    code=next(''.join(n['c']) for n in walk(tree) if n['tag']=='script' and n['a'].get('type')=='text/x-dc')
    body=code.split('  renderVals() {',1)[1].rsplit('\n  }\n}',1)[0]
    body=body.replace('const S = this.state, set = o => this.setState(o);','const S = state, set = update;')
    body=body.replace("const C1 =", "[STEPS[0],STEPS[1]]=[STEPS[1],STEPS[0]];STEPS[1][0]='Radovi';STEPS[1][3]='Izaberi radove ili kolekciju';STEPS[1][4]='Izbor zavisi od šablona i verzije. Kolekciju ili pojedinačne radove biraš ovdje; kadar i tekst prilagodi u sljedećem koraku.';\n    const C1 =")
    body=body.replace('isSadrzaj: t === 0, isSablon: t === 1','isSadrzaj: t === 1, isSablon: t === 0')
    body=re.sub(r'const W = \[[\s\S]*?\n    \];','const W = source.works.length ? source.works.map(w=>[w.imageUrl,w.title||"Rad"]) : [[source.blank,"Rad"]];',body)
    body=re.sub(r"const AV = '[^']+';",'const AV = source.avatar || source.blank;',body)
    body=re.sub(r'const PLANS = [^\n]*;', 'const PLANS = {premium:{limit:10},free1:{limit:1},free0:{limit:1}};',body)
    body=re.sub(r'const LOG0 = {[\s\S]*?\n    };','const LOG0 = {premium:[],free1:[],free0:[]};',body)
    body=body.replace('const log = S.log || LOG0[S.plan];','const log = [];')
    body=re.sub(r'    const PLANS = [^\n]*\n','',body)
    body=re.sub(r'    const LOG0 = [^\n]*\n','',body)
    body=body.replace('P = PLANS[S.plan]','P = {limit:usage.limit}')
    body=re.sub(r'    const switchPlan = [^\n]*\n','',body)
    body=re.sub(r'      plans: Object.keys\(PLANS\)[^\n]*\n','',body)
    body=re.sub(r'      buyIdle:[^\n]*\n','',body)
    body=re.sub(r'      askBuy:[^\n]*\n','',body)
    body=re.sub(r'      counterLine:[^\n]*\n','',body)
    body=body.replace('S.sel.length === 0 ? 1 : .62','S.sel.length === 0 ? 1 : .62')
    body=body.replace('total: W.length','total: 9')
    body=body.replace("'art-board.me/umjetnik/ime-prezime'",'source.shortUrl')
    body=body.replace("S.sel.length ? W[S.sel[0]][1] : 'Lorem ipsum'",'S.sel.length ? W[S.sel[0]][1] : ""')
    body=body.replace('const P = PLANS[S.plan]', 'const P = PLANS[S.plan]')
    body=body.replace('sel: on ? S.sel.filter(x => x !== i) : [...S.sel, i]','sel: on ? S.sel.filter(x => x !== i) : S.sel.length < 9 ? [...S.sel, i] : S.sel')
    body=body.replace('works: W.map(', 'works: source.works.map((work,i)=>W[i]).map(')
    body=body.replace("saveDraft: () => set({ saved: 'Sačuvano upravo sada' })",'saveDraft: actions.save')
    body=re.sub(r'gen: \(\) => {[\s\S]*?\n      },','gen: actions.generate,',body)
    body=re.sub(r"confirmBuy: \(\) => set\([^\n]*?\),",'confirmBuy: actions.checkout,',body)
    body=body.replace("['PNG', 'JPG']","['PNG']")
    # TX labels about exhibitions/prices are not actual artist data.
    body=body.replace("const TX =", "const TX =")
    body=body.replace('const W =', 'for(const tr of Object.values(TX)){tr.openVal="";tr.untilVal="";tr.tech=source.tech||"";tr.collectionName="";tr.desc=S.desc;tr.untitled="";tr.worksCount=String(S.sel.length);tr.dump=S.lang==="English"?"Selected works":"Izabrani radovi";}\n    const W =')
    body=re.sub(r'(const scrollUsage = [^\n]*;\s*)return \{',r'\1const result = {',body)
    body=body.replace('bgRef: el => { this.cv = el; },','bgRef: () => {},')
    # Accurate UI state overrides the prototype counters and simulated history.
    body+='''\n    const u=usage;
    Object.assign(result,{changeTheme:actions.changeTheme,busy:actions.busy,hasMore:actions.hasMore,moreHistory:actions.moreHistory,
      works:result.works, year:source.year||new Date().getFullYear(), savedTxt:actions.savedText, isPremium:u.plan==="PREMIUM",isFree:u.plan!=="PREMIUM",
      counterLine:u.plan==="PREMIUM"?`Instagram objave: ${u.used} od 10 iskorišćeno · obnova ${new Date(u.periodEnd).toLocaleDateString("sr-Latn-ME")}`:`Besplatna objava: ${u.used} od 1 iskorišćeno · jednom po nalogu`,
      hasExtra:u.purchased>0,extraLine:`Dodatne objave iz seta: ${u.purchased} preostalo`,
      log:actions.history,logEmpty:actions.history.length===0,logCount:String(actions.historyTotal||""),
      genText:actions.generating?"Generisanje…":actions.same?"Preuzmi ponovo · besplatno":u.remaining>0?"Generiši objavu":"Kupi set od 10 objava · 4,90 €",
      genBg:actions.error?"#c8213d":actions.success?"#1a8a4a":"#111318",genFg:"#fff",genSh:"none",
      hasFlash:Boolean(actions.message),flashText:actions.message,
      fmtOpts:result.fmtOpts?.slice(0,1), fileOpts:result.fileOpts?.slice(0,1)});
    return result;\n'''
    (OUT/('view-'+theme+'.cjs')).write_text('// Adapted reference presentation logic. Actual actions, identity and quota are injected.\nexports.buildView=function(state,source,update,actions,usage){'+body+'\n};\n',encoding='utf8')
    if theme=='light':
        tpl=re.search(r'const TPL = (.*?);\n',body)[1];meta=re.search(r'const META = (.*?);\n',body)[1]
        (OUT/'catalog.json').write_text(json.dumps({'templates':json.loads(tpl),'meta':json.loads(meta)},ensure_ascii=False,indent=2),encoding='utf8')
(OUT/'logos.json').write_text(json.dumps(all_logos),encoding='utf8')
print('Compiled original light/dark UI, four graphic stages, catalog and presentation logic.')

// Adapted reference presentation logic. Actual actions, identity and quota are injected.
exports.buildView=function(state,source,update,actions,usage){
    const S = state, set = update;
    const TPL = [{"name": "Artist Card", "vers": [["Classic", "1a", "1b"], ["Full Bleed", "1c", "1d"], ["Center Portrait", "1e", "1f"]]}, {"name": "Featured Work", "vers": [["Museum Label", "2a", "2b"], ["Gallery Frame", "2c", "2d"], ["Full Bleed", "2e", "2f"]]}, {"name": "Profile", "vers": [["Classic", "3a", "3b"], ["Profile Page", "3c", "3d"], ["Full Bleed", "3e", "3f"]]}, {"name": "Gallery", "vers": [["Profile Grid", "4a", "4b"], ["Photo Dump 3×3", "4c", "4d"], ["Full Bleed", "4e", "4f"]]}, {"name": "Block Poster", "vers": [["Blue", "5a", null], ["Yellow", null, "5b"], ["Red", "5c", null], ["White", null, "5d"], ["Full Bleed Black", null, "5e"], ["Full Bleed White", null, "5f"]]}, {"name": "New Artwork", "vers": [["Red Stripe", "6a", null], ["Blue Stripe", "6b", null], ["Yellow Stripe", "6c", null], ["Black Stripe", "6d", null], ["Full Bleed", "6e", "6f"]]}, {"name": "Slider Carousel", "vers": [["4 Slides", "7a", "7b"]]}, {"name": "Shop", "vers": [["Original & Print", "8a", "8b"], ["Sold", "8c", "8d"], ["Full Bleed", "8g", "8h"]]}, {"name": "Grid Carousel", "vers": [["Blue", "9c", "9d"], ["Red", "9e", "9f"]]}, {"name": "Panorama Carousel", "vers": [["Single Work", null, "10a"], ["Collage", "10b", "10c"]]}];
    const META = {"1a": [1, false, 1, true], "1b": [1, false, 1, true], "1c": [1, false, 1, true], "1d": [1, false, 1, true], "1e": [1, false, 1, true], "1f": [1, false, 1, true], "2a": [1, false, 1, false], "2b": [1, false, 1, false], "2c": [1, false, 1, false], "2d": [1, false, 1, false], "2e": [1, false, 1, false], "2f": [1, false, 1, false], "3a": [1, false, 1, false], "3b": [1, false, 1, false], "3c": [1, false, 3, true], "3d": [1, false, 3, true], "3e": [1, false, 1, false], "3f": [1, false, 1, false], "4a": [1, false, 3, false], "4b": [1, false, 3, false], "4c": [1, false, 9, false], "4d": [1, false, 9, false], "4e": [1, false, 5, false], "4f": [1, false, 5, false], "5a": [1, false, 1, false], "5b": [1, false, 1, false], "5c": [1, false, 1, false], "5d": [1, false, 1, false], "5e": [1, false, 1, false], "5f": [1, false, 1, false], "6a": [1, false, 1, false], "6b": [1, false, 1, false], "6c": [1, false, 1, false], "6d": [1, false, 1, false], "6e": [1, false, 1, false], "6f": [1, false, 1, false], "7a": [4, false, 1, false], "7b": [4, false, 1, false], "8a": [1, false, 1, false], "8b": [1, false, 1, false], "8c": [1, false, 1, false], "8d": [1, false, 1, false], "8g": [1, false, 1, false], "8h": [1, false, 1, false], "9c": [3, false, 5, false], "9d": [3, false, 5, false], "9e": [3, false, 5, false], "9f": [3, false, 5, false], "10a": [3, true, 1, false], "10b": [3, true, 6, false], "10c": [3, true, 6, false]};
    const TX = { EN: {
      eyebrow: 'ArtBoard artist', viewProfile: 'View my ArtBoard profile', vpA: 'View my ', vpB: 'ArtBoard', vpC: ' profile', scan: 'Scan me', cta: 'View profile',
      presents: 'ArtBoard presents', solo: 'Solo exhibition', opening: 'Opening', duration: 'On view', place: 'Venue',
      openVal: 'Oct 12 · 7 pm', untilVal: 'until Nov 2, 2026', tech: 'Illustration · A3 print',
      featured: 'Featured artist', asPrint: 'as a print', sold: 'Sold', thanks: 'Thank you for the support.', limited: 'Limited edition', prints: 'signed prints', original: 'Original', print: 'Print', dmShort: 'DM for details', collection: 'New collection', collectionName: 'Night Sketches', desc: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.', untitled: 'Lorem ipsum', newSeries: 'New series', collage: 'Works collage', worksCount: '10 works', studio: 'From the studio', wip: 'work in progress', process: 'From sketch to final', sketch: 'Sketch', final: 'Final', vote: 'Which one is your favourite?', voteHint: 'Comment 1 or 2', dump: 'Works 2026', swipe: 'Swipe →', detail: 'Detail', available: 'Available', dm: 'DM for price & details', facts: '3 things about me', newWork: 'New work', newWorkLoud: 'NEW WORK!', see: 'Look!', soon: 'Coming soon.'
    }, MNE: {
      eyebrow: 'ArtBoard umjetnik', viewProfile: 'Pogledaj moj ArtBoard profil', vpA: 'Pogledaj moj ', vpB: 'ArtBoard', vpC: ' profil', scan: 'Skeniraj', cta: 'Pogledaj profil',
      presents: 'ArtBoard predstavlja', solo: 'Samostalna izložba', opening: 'Otvaranje', duration: 'Trajanje', place: 'Mjesto',
      openVal: '12. 10. · 19h', untilVal: 'do 2. 11. 2026.', tech: 'Ilustracija · print A3',
      featured: 'Umjetnik u fokusu', asPrint: 'u printu', sold: 'Prodato', thanks: 'Hvala svima na podršci.', limited: 'Ograničeno izdanje', prints: 'potpisanih printova', original: 'Original', print: 'Print', dmShort: 'DM za detalje', collection: 'Nova kolekcija', collectionName: 'Noćne skice', desc: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.', untitled: 'Lorem ipsum', newSeries: 'Nova serija', collage: 'Kolaž radova', worksCount: '10 radova', studio: 'Iz ateljea', wip: 'u nastajanju', process: 'Od skice do rada', sketch: 'Skica', final: 'Finalno', vote: 'Koji ti je favorit?', voteHint: 'Odgovori u komentarima: 1 ili 2', dump: 'Radovi 2026', swipe: 'Prevuci →', detail: 'Detalj', available: 'Dostupno', dm: 'DM za cijenu i detalje', facts: '3 stvari o meni', newWork: 'Novi rad', newWorkLoud: 'NOVI RAD!', see: 'Pogledaj!', soon: 'Uskoro.'
    } };
    for(const tr of Object.values(TX)){tr.openVal="";tr.untilVal="";tr.tech=source.tech||"";tr.collectionName="";tr.desc=S.desc;tr.untitled="";tr.worksCount=String(S.sel.length);tr.dump=S.lang==="English"?"Selected works":"Izabrani radovi";}
    const W = source.works.length ? source.works.map(w=>[w.imageUrl,w.title||"Rad"]) : [[source.blank,"Rad"]];
    const AV = source.avatar || source.blank;
    const CODES = Object.keys(META);
    const isPremium = S.plan === 'premium', P = {limit:usage.limit};
    const log = [];
    const STEPS = [
      ['Sadržaj', 'Radovi i tekst iz profila', 'M5.4 4.2h13.2a1.8 1.8 0 0 1 1.8 1.8v12a1.8 1.8 0 0 1-1.8 1.8H5.4A1.8 1.8 0 0 1 3.6 18V6a1.8 1.8 0 0 1 1.8-1.8zM3.8 16.2l4.6-4.4 3.6 3.4 2.6-2.4 5.6 5M15.6 9.2a1.2 1.2 0 1 0 0-.01', 'Izaberi sadržaj objave', 'Radove i tekst povlačimo sa tvog ArtBoard profila. Izaberi radove koji ulaze u objavu, a tekst možeš prilagoditi u trećem koraku.'],
      ['Šablon', '10 šablona u više verzija', 'M5.4 3.8h13.2a1.8 1.8 0 0 1 1.8 1.8v12.8a1.8 1.8 0 0 1-1.8 1.8H5.4a1.8 1.8 0 0 1-1.8-1.8V5.6a1.8 1.8 0 0 1 1.8-1.8zM3.6 9.2h16.8M9.6 9.2v11', 'Izaberi šablon', 'Deset šablona za Instagram objave, svaki u nekoliko verzija, u svijetloj ili tamnoj varijanti. Pregled uživo odmah prikazuje tvoje radove u izabranoj verziji.'],
      ['Prilagodi', 'Tekst i boje', 'M4 7h9m4 0h3M4 17h3m4 0h9M15 5v4M9 15v4', 'Prilagodi objavu', 'Uredi tekst na objavi i izaberi svijetlu ili tamnu varijantu. Izmjene važe samo za ovu objavu, profil ostaje isti.'],
      ['Preuzmi', 'PNG, 1080 × 1440 px', 'M12 3.8v11M7.6 10.6 12 15l4.4-4.4M4.4 16.4v1.8a2 2 0 0 0 2 2h11.2a2 2 0 0 0 2-2v-1.8', 'Preuzmi objavu', 'Generiši objavu u punoj rezoluciji. Svaka generisana objava čuva se u listi Preuzete objave, odakle je možeš ponovo preuzeti besplatno.'],
    ];
    [STEPS[0],STEPS[1]]=[STEPS[1],STEPS[0]];STEPS[1][0]='Radovi';STEPS[1][3]='Izaberi radove ili kolekciju';STEPS[1][4]='Izbor zavisi od šablona i verzije. Kolekciju ili pojedinačne radove biraš ovdje; kadar i tekst prilagodi u sljedećem koraku.';
    const C1 = ['#1a7cff', '#ff2d55', '#ffd028', '#1a7cff'];
    const BR = { blue: '#1673F2', violet: '#783CFF', red: '#F0365F', yellow: '#FFD12E' };
    const FLAT = ['#0D74FF', '#783CFF', '#FE275F', '#FFD31B'];
    const SOLID = [BR.blue, BR.red, BR.yellow, BR.violet];
    const lin = (a, b) => `linear-gradient(135deg,${a} 0%,${b} 100%)`;
    const solid = c => `linear-gradient(0deg,${c},${c})`;
    const tint = (c, a) => c + a;
    const RING = `linear-gradient(120deg,${BR.blue} 0%,${BR.violet} 33%,${BR.red} 66%,${BR.yellow} 100%)`;
    const SWEEP = 'ab-flow 16s cubic-bezier(.45,.05,.55,.95) infinite alternate';
    const HOVER = {
      A: { size: '100% 100%', anim: 'none', num: i => solid(FLAT[i]), bg: i => solid(FLAT[i]), sh: i => `0 8px 18px ${tint(FLAT[i], '40')}`, st: () => '#fff' },
    };
    const MC = [['#1a7cff', '#ff2d55'], ['#ff2d55', '#1a7cff'], ['#ff2d55', '#ffd028'], ['#ffd028', '#ff2d55']];
    const M = MC.map(([a, b]) => `linear-gradient(120deg,${a},${a} 50%,${b})`);
    const seg = (key, opts, extra) => opts.map(label => ({ label, bg: S[key] === label ? 'rgba(255,255,255,.14)' : 'transparent', fg: S[key] === label ? '#f3f4f7' : '#8d93a5', sh: S[key] === label ? '0 1px 3px rgba(0,0,0,.12)' : 'none', pick: () => set({ [key]: label, ...(extra || {}) }) }));
    const SEL = '0 0 0 1.5px #f3f4f7', UNSEL = '0 0 0 1px rgba(255,255,255,.1)';
    const t = S.tab, go = n => { set({ tab: n }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    const T = TPL[S.tpl], verI = Math.min(S.ver, T.vers.length - 1), V = T.vers[verI];
    const pick = (v, d) => d ? (v[2] || v[1]) : (v[1] || v[2]);
    const code = pick(V, S.dark), single = !V[1] || !V[2], isDark = code === V[2];
    const varName = isDark ? 'Tamna' : 'Svijetla', multiVer = T.vers.length > 1, verName = V[0];
    const MT = META[code], wide = MT[1], need = Math.max(1, MT[2]);
    // Slider Carousel: naslovna + jedan slajd po izabranom radu + završni slajd (Instagram dozvoljava do 20 slajdova)
    const is7 = code === '7a' || code === '7b', n7 = Math.min(18, Math.max(1, S.sel.length));
    const slides = is7 ? n7 + 2 : MT[0];
    const postName = [T.name, multiVer ? verName : null, varName].filter(Boolean).join(' · ');
    const slide = Math.min(S.slide, slides - 1);
    const selW = S.sel.length ? S.sel : [0];
    const img = { av: AV }; for (let i = 0; i < 9; i++) img['w' + i] = W[selW[i % selW.length]][0];
    const title = S.title != null ? S.title : (S.sel.length ? W[S.sel[0]][1] : "");
    const name = S.name, parts = name.trim().split(/\s+/);
    // oblik iz profila (registracija / podešavanja): f = umjetnica, m = umjetnik, n = bez rodnog oblika; ne određuje se iz imena
    const tx = S.lang === 'English' ? TX.EN : Object.assign({}, TX.MNE, {
      eyebrow: { f: 'ArtBoard umjetnica', m: 'ArtBoard umjetnik' }[S.form] || 'Na ArtBoardu',
      featured: { f: 'Umjetnica u fokusu', m: 'Umjetnik u fokusu' }[S.form] || 'U fokusu' });
    const fitName = w => Math.max(72, Math.min(230, Math.floor(672 / (Math.max(1, (w || '').length) * 0.56)))) + 'px';
    const pv = {}; pv[`c${code}_${wide ? 0 : is7 ? (slide === 0 ? 0 : slide <= n7 ? 1 : 3) : slide}`] = true;
    const tw7 = Math.min(220, Math.floor((952 - 20 * (n7 - 1)) / n7));
    const s7 = { works: selW.slice(0, n7).map((wi, k) => ({ img: W[wi][0], title: W[wi][1], num: String(k + 1).padStart(2, '0'), more: true })),
      tw: tw7 + 'px', th: Math.round(tw7 * 4 / 3) + 'px', stripW: (slides * 1080) + 'px' };
    const sw = s7.works[Math.min(n7, Math.max(1, slide)) - 1];
    const al = {}; al[`c${code}`] = true;
    const fmt45 = S.fmt === '45', fmtShort = fmt45 ? '4:5' : '3:4';
    const slidesTxt = slides > 1 ? `${slides} slajda · ` : '';
    const sig = JSON.stringify([S.tpl, code, S.fmt, S.sel, name, S.ig, title, S.desc, S.sign, S.lang, S.file]);
    const limit = P.limit + S.extra, avail = limit - S.used, canGen = avail > 0, same = sig === S.lastSig;
    const extraLeft = Math.max(0, S.extra - Math.max(0, S.used - P.limit));
    const plural = n => n === 1 ? 'rad' : (n >= 2 && n <= 4 ? 'rada' : 'radova');
    const scrollUsage = () => { const el = document.querySelector('[data-ab="promo-set"]'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
    const result = {
      bgRef: () => {},
      t: tx, name, ig: S.ig, first: parts[0] || '', last: parts.slice(1).join(' ') || parts[0] || '', last2: parts.slice(1).join(' '), fsFirst: fitName(parts[0]), fsLast: fitName(parts.slice(1).join(' ')), initial: (parts[0] || 'A').charAt(0).toUpperCase(),
      title, desc: S.desc, img, pv, s7, sw, qrPath: S.qrPath, qrView: S.qrView, shortUrl: source.shortUrl,
      showTag: S.sign !== 'ArtBoard logo', showLogo: S.sign === 'ArtBoard logo',
      savedTxt: S.saved, saveDraft: actions.save,
      goDownload: () => go(3),
      isPremium, isFree: !isPremium,
      tplName: T.name, varName, fmtShort, previewSub: postName, aspect: fmt45 ? '4 / 5' : '3 / 4',
      dx: wide ? `${-1080 * slide}px` : '0px', dy: fmt45 ? '-45px' : '0px',
      multi: slides > 1, al,
      stripAspect: fmt45 ? `${slides * 4} / 5` : `${slides * 3} / 4`,
      stripLines: Array.from({ length: Math.max(0, slides - 1) }, (_, i) => ({ x: `${((i + 1) / slides * 100).toFixed(3)}%` })),
      slideBtns: Array.from({ length: slides }, (_, i) => ({ n: i + 1, pressed: String(i === slide), bg: i === slide ? '#f3f4f7' : 'transparent', fg: i === slide ? '#07080d' : '#c4c8d4', sh: i === slide ? 'none' : 'inset 0 0 0 1px rgba(255,255,255,.14)', pick: () => set({ slide: i }) })),
      previewNote: `${fmt45 ? '1080 × 1350 px' : '1080 × 1440 px'} · ${slides > 1 ? slides + ' slajda u jednoj objavi' : '1 slajd'} · ${S.file}`,
      selCount: S.sel.length, total: 9, slidesN: slides, slidesStat: slides === 1 ? 'Slajd u objavi' : 'Slajda u objavi',
      stepN: t + 1, heading: STEPS[t][3], lead: STEPS[t][4],
      isSadrzaj: t === 1, isSablon: t === 0, isPrilagodi: t === 2, isPreuzmi: t === 3, isEdit: t !== 3, layout: t === 3 ? 'dl' : 'edit',
      prev: () => go(Math.max(0, t - 1)), next: () => go(Math.min(3, t + 1)),
      prevVis: t === 0 ? 'hidden' : 'visible', prevD: t === 0 ? 'none' : 'flex', nextD: t === 3 ? 'none' : 'flex', nextVis: t === 3 ? 'hidden' : 'visible',
      prevText: t > 0 ? `← ${STEPS[t - 1][0]}` : '', nextText: t < 3 ? `Dalje: ${STEPS[t + 1][0]} →` : '',
      steps: STEPS.map((s, i) => { const on = i === t, hv = i === S.hov, col = '#0D74FF', ncol = '#0D74FF';
        return { title: s[0], icon: s[2], n: '0' + (i + 1), cur: on ? 'step' : 'false', pick: () => go(i), enter: () => set({ hov: i }), leave: () => set({ hov: -1 }),
        bg: on ? 'rgba(255,255,255,.07)' : 'transparent', sh: on ? 'inset 0 0 0 1px rgba(255,255,255,.1)' : 'none', nC: on || hv ? ncol : '#6b7184',
        icBg: hv ? col : on ? '#f3f4f7' : 'rgba(255,255,255,.05)', icSh: hv ? 'none' : on ? 'none' : '0 4px 14px rgba(0,0,0,.12),inset 0 0 0 1px rgba(255,255,255,.08)',
        stroke: hv ? (col === '#FFD31B' ? '#111318' : '#fff') : on ? '#fff' : '#c4c8d4' }; }),
      works: source.works.map((work,i)=>W[i]).map((w, i) => { const k = S.sel.indexOf(i), on = k >= 0; return { img: w[0], title: w[1], on, n: k + 1, pressed: String(on), op: on || S.sel.length === 0 ? 1 : .62,
        sh: on ? '0 0 0 2.5px #f3f4f7' : 'none', toggle: () => set({ sel: on ? S.sel.filter(x => x !== i) : S.sel.length < 9 ? [...S.sel, i] : S.sel }) }; }),
      showNeed: S.sel.length < need,
      needLine: S.sel.length === 0 ? 'Izaberi bar jedan rad za objavu.' : (S.sel.length >= need
        ? `${multiVer ? `${T.name} · ${verName}` : T.name} koristi ${need} ${plural(need)}${MT[3] ? ' i profilnu fotografiju' : ''}. Prvi izabrani rad daje naslov objave.`
        : `${multiVer ? `${T.name} · ${verName}` : T.name} koristi ${need} ${plural(need)}. Dok ne izabereš još ${need - S.sel.length}, izabrani radovi se ponavljaju.`),
      profileRows: [['Ime i prezime', name], ['Oblik u tekstovima', { f: 'Umjetnica', m: 'Umjetnik' }[S.form] || 'Bez rodnog oblika'], ['Instagram', S.ig], ['Link profila', source.shortUrl], ['Naslov rada', `${title} (prvi izabrani rad)`], ['Kratak opis', S.desc || '—']].map(([label, value]) => ({ label, value })),
      variants: [['Svijetla', false], ['Tamna', true]].map(([label, d]) => { const on = isDark === d, ok = !single || on; return { label, bg: on ? '#f3f4f7' : 'transparent', fg: on ? '#07080d' : '#8d93a5', op: ok ? 1 : .4, cur: ok ? 'pointer' : 'not-allowed', dis: String(!ok), pick: () => { if (ok) set({ dark: d }); } }; }),
      countLabel: (() => { const n = TPL.reduce((a, x) => a + x.vers.length, 0); return `10 šablona · ${n} ${n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'verzije' : 'verzija'} · Instagram 3:4`; })(),
      verCount: `${T.vers.length} ${T.vers.length >= 2 && T.vers.length <= 4 ? 'verzije' : 'verzija'}`,
      verHint: single ? `Verzija ${verName} postoji samo u ${isDark ? 'tamnoj' : 'svijetloj'} varijanti.` : 'Izaberi verziju; prekidač Svijetla / Tamna mijenja boju izabrane verzije.',
      vers: T.vers.map((x, j) => { const c = pick(x, S.dark), on = j === verI, o = { label: x[0], sub: (!x[1] || !x[2]) ? (x[2] ? 'Samo tamna' : 'Samo svijetla') : (S.dark ? 'Tamna' : 'Svijetla'), pressed: String(on), sh: on ? SEL : UNSEL, pick: () => set({ ver: j, slide: 0 }) }; CODES.forEach(k => { o['c' + k] = k === c; }); return o; }),
      tpls: TPL.map((x, i) => { const c = i === S.tpl ? code : pick(x.vers[0], S.dark); const o = { name: x.name, sub: `${x.vers.length} ${x.vers.length >= 2 && x.vers.length <= 4 ? 'verzije' : 'verzija'}`, pressed: String(i === S.tpl), pick: () => { set({ tpl: i, ver: 0, slide: 0 }); setTimeout(() => { const el = document.querySelector('[data-ab="promo-versions"]'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 60); },
        sh: i === S.tpl ? SEL : UNSEL, radio: i === S.tpl ? 'none' : 'inset 0 0 0 1.5px rgba(255,255,255,.3)', radioBg: i === S.tpl ? '#f3f4f7' : 'transparent', dot: i === S.tpl ? '#07080d' : 'transparent' };
        CODES.forEach(k => { o['c' + k] = k === c; }); return o; }),
      onName: e => set({ name: e.target.value }), onIg: e => set({ ig: e.target.value }), onTitle: e => set({ title: e.target.value }), onDesc: e => set({ desc: e.target.value }),
      descCount: `${S.desc.length} / 120 znakova`, descC: S.desc.length > 120 ? '#ff8a8e' : '#8d93a5',
      langOpts: seg('lang', ['Crnogorski', 'English']),
      colorHint: single ? `${T.name} · ${verName} postoji samo u ${isDark ? 'tamnoj' : 'svijetloj'} varijanti. Drugu boju biraš kroz verziju u koraku Šablon.` : 'Izabrana verzija postoji u svijetloj i tamnoj varijanti sa ArtBoard bojama.',
      colorOpts: [['Svijetla', false, '#f7f7f9', 'Svijetla pozadina, tamni tekst'], ['Tamna', true, '#101219', 'Tamna pozadina, svijetli tekst']].map(([label, d, sw, sub]) => { const on = isDark === d, ok = !single || on; return { label, sw, sub, sh: on ? SEL : UNSEL, op: ok ? 1 : .45, cur: ok ? 'pointer' : 'not-allowed', dis: String(!ok), pick: () => { if (ok) set({ dark: d }); } }; }),
      fmtOpts: [['34', '3:4 · 1080 × 1440 px', 'Najviši Instagram format, preporuka za sve šablone.', '24px', '32px'], ['45', '4:5 · 1080 × 1350 px', 'Klasičan portret format; gornja i donja ivica se blago sijeku.', '26px', '32px']].map(([k, label, sub, w, h]) => { const on = S.fmt === k; return { label, sub, w, h, sh: on ? SEL : UNSEL, radio: on ? 'none' : 'inset 0 0 0 1.5px rgba(255,255,255,.3)', radioBg: on ? '#f3f4f7' : 'transparent', dot: on ? '#07080d' : 'transparent', pick: () => set({ fmt: k }) }; }),
      fileOpts: seg('file', ['PNG']),
      planC: isPremium ? '#4fd18b' : '#8fb4ff', planTxt: isPremium ? '#f3f4f7' : '#8fb4ff', planLabel: isPremium ? 'Premium članstvo' : 'Free plan',
      planHead: isPremium ? '10 objava mjesečno je uključeno.' : '1 besplatna objava je uključena.',
      planShort: isPremium ? 'Premium' : 'Free',
      usedN: Math.min(S.used, P.limit), limitN: P.limit, usedLabel: isPremium ? 'Instagram objave' : 'besplatna objava',
      segs: Array.from({ length: limit }, (_, i) => ({ bg: i < S.used ? '#c4c8d4' : (i >= P.limit ? 'rgba(79,209,139,.4)' : 'rgba(255,255,255,.12)') })),
      hasExtra: S.extra > 0, extraLine: `Dodatne objave iz seta: ${extraLeft} od ${S.extra} preostalo`,
      summary: [T.name, multiVer ? verName : null, varName, `${fmtShort} · ${fmt45 ? '1080 × 1350' : '1080 × 1440'}`, slides > 1 ? `${slides} slajda` : '1 slajd'].filter(Boolean),
      genText: same ? 'Preuzmi ponovo · besplatno' : (canGen ? 'Generiši objavu' : 'Kupi set od 10 objava · 4,90 €'),
      genBg: same ? 'transparent' : '#f3f4f7', genFg: same ? '#f3f4f7' : '#07080d', genSh: same ? 'inset 0 0 0 1.5px #f3f4f7' : 'none',
      genIconD: same || canGen ? 'block' : 'none', genTone: same ? 'outline' : canGen ? 'blue' : 'dark',
      usedPct: `${Math.round(Math.min(S.used, P.limit) / P.limit * 100)}%`, segs: Array.from({ length: P.limit }, (_, i) => ({ bg: i < Math.min(S.used, P.limit) ? 'linear-gradient(90deg,#0D74FF 0%,#8A3BF2 24%,#FE171D 50%,#FF8A1F 74%,#FFD31B 100%)' : 'rgba(255,255,255,.12)', size: `${P.limit * 100}% 100%`, pos: P.limit > 1 ? `${(i / (P.limit - 1) * 100).toFixed(3)}% 0` : '0 0' })),
      gen: actions.generate,
      hasFlash: !!S.flash, flashText: S.flash,
      rules: ['Objava se računa samo kad generišeš novu objavu; karusel sa više slajdova je jedna objava.', 'Pregled, izmjene i ponovno preuzimanje su besplatni, a neuspješno generisanje se ne računa.', 'Neiskorišćene mjesečne objave se ne prenose; objave iz kupljenog seta ne ističu.', 'Free: 1 besplatna objava, zatim set od 10 za 4,90 €.', 'Premium: 10 objava mjesečno, set od 10 dodatnih 4,90 €.', 'Set se plaća na stranici Plaćanje, samo uz tvoju potvrdu.'],
      log: log.map(([tt, m, d]) => ({ t: tt, m, bg: d ? '#101219' : '#f7f7f9' })), logEmpty: log.length === 0, logCount: log.length ? `${log.length}` : '',
    };
    const u=usage;
    Object.assign(result,{changeTheme:actions.changeTheme,busy:actions.busy,hasMore:actions.hasMore,moreHistory:actions.moreHistory,
      works:result.works, year:source.year||new Date().getFullYear(), savedTxt:actions.savedText, isPremium:u.plan==="PREMIUM",isFree:u.plan!=="PREMIUM",
      counterLine:u.plan==="PREMIUM"?`Instagram objave: ${u.used} od 10 iskorišćeno · obnova ${new Date(u.periodEnd).toLocaleDateString("sr-Latn-ME")}`:`Besplatna objava: ${u.used} od 1 iskorišćeno · jednom po nalogu`,
      hasExtra:u.purchased>0,extraLine:`Dodatne objave iz seta: ${u.purchased} preostalo`,
      log:actions.history,logEmpty:actions.history.length===0,logCount:String(actions.historyTotal||""),
      genText:actions.generating?"Generisanje…":actions.same?"Preuzmi ponovo · besplatno":u.remaining>0?"Generiši objavu":"Kupi set od 10 objava · 4,90 €",
      genBg:actions.error?"#c8213d":actions.success?"#1a8a4a":"#111318",genFg:"#fff",genSh:"none",
      hasFlash:Boolean(actions.message),flashText:actions.message,
      fmtOpts:result.fmtOpts?.slice(0,1), fileOpts:result.fileOpts?.slice(0,1)});
    return result;

};

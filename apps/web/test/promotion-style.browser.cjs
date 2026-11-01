// Exercise React's development-only style diff on the same mounted quota bars.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildSync } = require('esbuild');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '../../..');
const out = path.join(root, '.tmp/promotion-style-browser');
fs.mkdirSync(out, { recursive: true });
const bundle = buildSync({
  stdin: { resolveDir: root, contents: `
    const React=require('react'),{createRoot}=require('react-dom/client'),{flushSync}=require('react-dom');
    const {view,initialState,renderUi}=require('./packages/promotion-renderer');
    const source={name:'Test Artist',avatar:null,form:'n',profileUrl:'https://example.test/artist',shortUrl:'example.test/artist',works:[{id:'a',title:'Artwork',imageUrl:'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"/%3E'}]};
    const config={artworkIds:['a'],template:0,version:0,color:'light',language:'ME',name:'Test Artist',instagram:'@test',title:null,description:'',signature:'instagram'};
    const mounted=createRoot(document.getElementById('root'));
    window.renderQuota=(theme,used)=>{
      const usage={plan:'PREMIUM',used,reserved:0,limit:10,remaining:10-used,purchased:0,periodStart:'2026-10-01',periodEnd:'2026-11-01'};
      const v=view(theme,{...initialState(config,source,usage),tab:3},source,()=>{},{history:[],savedText:'',changeTheme:()=>{}},usage);
      flushSync(()=>mounted.render(renderUi(theme,v,React.createElement,React.Fragment)));
    };
  ` },
  bundle: true, write: false, platform: 'browser', define: { 'process.env.NODE_ENV': '"development"' },
});
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push(e.message));
    await page.setContent('<div id="root"></div>');
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => window.renderQuota(theme, 0), theme);
      const bars = page.locator('[data-ab="grad-bar"]>span');
      assert.equal(await bars.count(), 10);
      await bars.first().evaluate(el => { window.originalQuotaBar = el; });
      for (const used of [1, 5, 10, 0]) {
        await page.evaluate(({ theme, used }) => window.renderQuota(theme, used), { theme, used });
        const styles = await bars.evaluateAll(elements => elements.map(el => {
          const s = getComputedStyle(el);
          return { image: s.backgroundImage, color: s.backgroundColor, size: s.backgroundSize, position: s.backgroundPosition };
        }));
        assert.equal(await bars.first().evaluate(el => el === window.originalQuotaBar), true, 'Rerender must reuse the quota bar');
        for (let i = 0; i < 10; i++) {
          assert.equal(styles[i].image.includes('linear-gradient'), i < used);
          assert.equal(styles[i].size, '1000% 100%');
          assert.equal(styles[i].position, `${(i / 9 * 100).toFixed(3).replace(/\.?0+$/, '')}% 0px`);
          if (i >= used) assert.equal(styles[i].color, 'rgb(227, 230, 238)');
        }
      }
    }
    assert.deepEqual(errors, [], 'Development rerenders must have no console/runtime errors');
    const result = { themes: 2, quotaTransitions: 8, errors };
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });

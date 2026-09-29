// 갤럭시 S21 Ultra 뷰포트(384×854, DPR 2.8125)에서 패치 전/후 비교. --z 로 글자 확대 재현.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const css = fs.readFileSync(path.join(__dirname, '..', 'beleft-m-zoomfit.css'), 'utf8');
const js = fs.readFileSync(path.join(__dirname, '..', 'beleft-m-zoomfit.js'), 'utf8');
const url = 'file://' + path.join(__dirname, 'mock-detail.html');
const out = process.argv[2] || __dirname;
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 384, height: 854 }, deviceScaleFactor: 2.8125, isMobile: true, hasTouch: true });
  for (const z of [1, 1.3, 1.7]) {
    for (const patched of [false, true]) {
      const p = await ctx.newPage();
      await p.goto(url);
      await p.addStyleTag({ content: `:root{--z:${z}}` });
      if (patched) { await p.addStyleTag({ content: css }); await p.addScriptTag({ content: js }); await p.waitForTimeout(500); }
      const r = await p.evaluate(() => {
        const q = s => !!document.querySelector(s);
        const over = [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > innerWidth + 1 && !e.closest('.bel-rel,.bel-tabs'); }).map(e => e.tagName + '.' + e.className).slice(0, 6);
        const buy = document.querySelector('.bel-actions__buy'); const br = buy && buy.getBoundingClientRect();
        return { scrollW: document.documentElement.scrollWidth, overflow: over,
          tags: ['bel-buybar','bel-fab','bel-fab__up','bel-fab__down','bel-topbar','bel-optrow','bel-actions','bel-npay','bel-tabs','bel-rel','bel-sizefinder','bel-sf-field','bel-trust','bel-searchbar','bel-bizinfo','bel-footer__eyebrow'].filter(c => !q('.' + c)),
          buyInView: br ? br.right <= innerWidth : null };
      });
      console.log(`z=${z} ${patched ? 'AFTER ' : 'BEFORE'} scrollW=${r.scrollW} overflow=${JSON.stringify(r.overflow)} missingTags=${patched ? JSON.stringify(r.tags) : '-'} buyInView=${r.buyInView}`);
      if (z === 1.7) {
        await p.evaluate(() => document.querySelector('select').scrollIntoView({ block: 'start' }));
        await p.evaluate(() => scrollBy(0, -140));
        await p.waitForTimeout(300);
        await p.screenshot({ path: path.join(out, `z${z}-${patched ? 'after' : 'before'}-options.png`) });
        await p.evaluate(() => document.querySelector('.rel').scrollIntoView({ block: 'center' }));
        await p.waitForTimeout(400);
        await p.screenshot({ path: path.join(out, `z${z}-${patched ? 'after' : 'before'}-related.png`) });
      }
      await p.close();
    }
  }
  await b.close();
})();

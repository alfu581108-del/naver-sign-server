/* beleft-m-zoomfit.js v1.0 (2026-09-29)
 * 모바일 "큰 글씨" 대응 — 카카오 인앱 '가가'·안드로이드 글꼴 크기 확대 시 깨지는 레이아웃 보정.
 * 원칙: 확대를 막지 않는다(접근성). 마크업을 몰라도 되도록 화면 글자(구매하기·관련상품 등)로 요소를 찾아
 * bel-* 클래스만 붙이고, 모양은 beleft-m-zoomfit.css 가 담당. 못 찾으면 아무 것도 안 함.
 */
(function () {
  var d = document, h = d.documentElement;
  if (h.getAttribute('data-bel-zoomfit')) return;
  h.setAttribute('data-bel-zoomfit', '1.0');

  function txt(el) { return (el.textContent || '').replace(/\s+/g, ' ').trim(); }
  function tag(el, cls) { if (el && el.classList && !el.classList.contains(cls)) el.classList.add(cls); return el; }
  function all(sel, root) { return Array.prototype.slice.call((root || d).querySelectorAll(sel)); }
  function byText(sel, re, root) { return all(sel, root).filter(function (el) { return re.test(txt(el)); }); }
  /* 겹친 조상 대신 가장 안쪽 요소만 */
  function innermost(list) { return list.filter(function (a) { return !list.some(function (b) { return b !== a && a.contains(b); }); }); }
  function isFixed(el) { var p = getComputedStyle(el).position; return p === 'fixed' || p === 'sticky'; }

  /* 1. 글자 확대 배율 측정 → html.bel-bigtext + --bel-tz */
  function measureZoom() {
    var p = d.createElement('span');
    p.style.cssText = 'position:absolute;left:-9999px;top:0;font:400 20px/1 sans-serif;white-space:nowrap;visibility:hidden';
    p.textContent = '가나다라마바사아자차';
    d.body.appendChild(p);
    var cs = parseFloat(getComputedStyle(p).fontSize) / 20 || 1;
    var w = p.getBoundingClientRect().width / 200 || 1; /* 한글 10자 × 20px ≈ 200px */
    d.body.removeChild(p);
    var r = Math.max(cs, w);
    h.style.setProperty('--bel-tz', r.toFixed(2));
    h.classList.toggle('bel-bigtext', r >= 1.2);
  }

  /* 2. 하단 고정 구매바 · 떠 있는 위/아래 버튼 */

  function fixedLayer() {
    var vw = innerWidth, vh = innerHeight;
    all('body *').forEach(function (el) {
      if (el.closest('.bel-buybar,.bel-fab')) return;
      var cs = getComputedStyle(el);
      if (cs.position !== 'fixed' || cs.display === 'none') return;
      var r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      /* 구매바: 화면 폭 거의 전체 + 바닥에 붙음 + '구매' 글자 */
      if (r.width >= vw * 0.9 && r.bottom >= vh - 4 && r.height < vh * 0.4 && /구매|장바구니/.test(txt(el))) {
        tag(el, 'bel-buybar');
        h.style.setProperty('--bel-buybar-h', Math.round(r.height) + 'px');
        return;
      }
      /* 떠 있는 동그라미 버튼: 오른쪽, 작음 */
      if (r.left > vw * 0.55 && r.width < 110 && r.height < 220 && !/구매|장바구니/.test(txt(el))) {
        var squares = Math.abs(r.width - r.height) < 10 && r.width > 30 ? [el]
          : all('a,button,div,span', el).filter(function (c) {
              var q = c.getBoundingClientRect();
              return q.width > 30 && q.width < 90 && Math.abs(q.width - q.height) < 10;
            });
        if (!squares.length) return;
        tag(el, 'bel-fab');
        squares.sort(function (a, b) { return a.getBoundingClientRect().top - b.getBoundingClientRect().top; });
        if (squares.length > 1) { /* 위=맨 위로, 아래=맨 아래로 */
          tag(squares[0], 'bel-fab__up');
          squares.slice(1).forEach(function (s) { tag(s, 'bel-fab__down'); });
        } else if (!/down|bottom|아래/i.test(el.className + ' ' + (el.getAttribute('aria-label') || ''))) {
          tag(squares[0], 'bel-fab__up');
        }
      }
    });
    /* 상단 고정 헤더 스택(띠배너+헤더) */
    all('body > *, body > * > *').forEach(function (el) {
      if (!isFixed(el) || el.classList.contains('bel-buybar') || el.classList.contains('bel-fab')) return;
      var r = el.getBoundingClientRect();
      if (r.top <= 1 && r.width >= innerWidth * 0.9 && r.height > 30 && r.height < innerHeight * 0.45) tag(el, 'bel-topbar');
    });
  }

  /* 3. 상품상세 */
  function detail() {
    /* 필수 옵션 행: 라벨 위, 셀렉트 전체폭 */
    all('select').forEach(function (s) {
      if (!/필수|옵션/.test(txt(s))) return;
      var row = s.closest('tr') || s.parentElement && s.parentElement.parentElement;
      tag(row, 'bel-optrow');
      tag(s, 'bel-select');
    });
    /* 본문 안 버튼줄(장바구니·관심상품·구매하기) — 하단바 제외 */
    byText('a,button', /^구매하기$/).forEach(function (b) {
      if (b.closest('.bel-buybar')) return;
      var p = b.parentElement;
      for (var i = 0; p && i < 3; i++, p = p.parentElement) {
        if (/장바구니/.test(txt(p))) { tag(p, 'bel-actions'); tag(b, 'bel-actions__buy'); break; }
      }
    });
    /* 네이버페이 버튼: 폭이 넘치면 비율 축소 */
    all('#NaverChk_Button').forEach(function (n) {
      var inner = n.firstElementChild; if (!inner) return;
      inner.style.transform = ''; n.style.height = '';
      var need = inner.scrollWidth, have = n.clientWidth;
      if (need > have + 2 && have > 0) {
        var k = have / need;
        inner.style.transformOrigin = '0 0';
        inner.style.transform = 'scale(' + k.toFixed(3) + ')';
        n.style.height = Math.ceil(inner.getBoundingClientRect().height) + 'px';
      }
      tag(n, 'bel-npay');
    });
    /* 탭(상세정보·구매안내·상품후기·Q&A) → 가로 스크롤 */
    innermost(byText('ul,div,nav', /상세정보.*구매안내|상세정보.*상품후기/).filter(function (el) {
      return el.children.length >= 3 && el.children.length <= 6 && txt(el).length < 60;
    })).forEach(function (el) { tag(el, 'bel-tabs'); });
    /* 관련상품 → 가로 스와이프 카드 */
    byText('h2,h3,h4,strong,p,div', /^관련\s?상품$/).forEach(function (hd) {
      tag(hd, 'bel-rel__title');
      var sec = hd.parentElement;
      for (var i = 0; sec && i < 3; i++, sec = sec.parentElement) {
        var ul = sec.querySelector('ul');
        if (ul && ul.children.length) { tag(ul, 'bel-rel'); break; }
      }
    });
    /* 사이즈 찾기 위젯 */
    byText('a,button', /사이즈\s?추천받기/).forEach(function (b) {
      var box = b.parentElement;
      while (box && box.querySelectorAll('input').length < 3) box = box.parentElement;
      if (!box) return;
      tag(box, 'bel-sizefinder');
      all('input', box).forEach(function (inp) {
        if (/radio|checkbox|hidden/.test(inp.type)) return;
        inp.setAttribute('inputmode', 'decimal');
        var f = tag(inp.parentElement, 'bel-sf-field');
        if (f.parentElement) tag(f.parentElement.parentElement, 'bel-sf-grid');
      });
    });
    /* 신뢰 배지(국내생산·당일발송·교환반품) */
    byText('p,strong,span,div', /^국내생산$/).forEach(function (el) {
      var p = el.parentElement;
      while (p && !/당일발송/.test(txt(p))) p = p.parentElement;
      tag(p, 'bel-trust');
    });
  }

  /* 4. 검색결과·목록·푸터 */
  function listAndFooter() {
    all('select').forEach(function (s) { if (/기준선택/.test(txt(s))) tag(s, 'bel-select'); });
    all('input[type=search], input[name=keyword]').forEach(function (inp) {
      var p = inp.parentElement;
      for (var i = 0; p && i < 3; i++, p = p.parentElement) {
        if (byText('a,button,input[type=submit]', /^검색$/, p).length || p.querySelector('input[type=submit],button[type=submit]')) {
          tag(p, 'bel-searchbar'); break;
        }
      }
    });
    byText('p,strong,span,div,h2,h3', /^CUSTOMER CENTER$/i).forEach(function (el) {
      tag(el, 'bel-footer__eyebrow');
      tag(el.parentElement, 'bel-footer__cs');
    });
    innermost(byText('dl,ul,div,table', /사업자등록번호/).filter(function (el) {
      return /통신판매업/.test(txt(el)) && txt(el).length < 400;
    })).forEach(function (el) { tag(el, 'bel-bizinfo'); });
    byText('p,span,div', /^©\s?\d{4}/).forEach(function (el) { tag(el, 'bel-footer__copy'); });
  }

  /* 5. 스크롤: 헤더 숨김/노출 · 위로 버튼 */
  var lastY = scrollY, ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      var y = scrollY, dy = y - lastY;
      if (Math.abs(dy) > 6) { h.classList.toggle('bel-scroll-down', dy > 0 && y > 160); lastY = y; }
      h.classList.toggle('bel-scrolled-far', y > innerHeight * 1.2);
      ticking = false;
    });
  }

  function run() {
    try { measureZoom(); fixedLayer(); detail(); listAndFooter(); } catch (e) { /* 보정 실패해도 페이지는 그대로 */ }
  }

  function start() {
    run();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('load', run);
    addEventListener('resize', function () { clearTimeout(start.t); start.t = setTimeout(run, 200); });
    /* 카페24가 늦게 그리는 것(관련상품·N페이·사이즈 위젯) — 10초 동안만 따라감 */
    if (window.MutationObserver) {
      var t, mo = new MutationObserver(function () { clearTimeout(t); t = setTimeout(run, 300); });
      mo.observe(d.body, { childList: true, subtree: true });
      setTimeout(function () { mo.disconnect(); }, 10000);
    }
  }

  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', start); else start();
})();

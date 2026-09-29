// css + js → 카페24 레이아웃 파일 맨 끝에 붙일 한 블록. 닫는 태그 문자열(</body>, </html>) 검사 포함.
const fs = require('fs');
const css = fs.readFileSync(__dirname + '/beleft-m-zoomfit.css', 'utf8');
const js = fs.readFileSync(__dirname + '/beleft-m-zoomfit.js', 'utf8');
const out = '<style id="bel-zoomfit-css">\n' + css + '</style>\n<script id="bel-zoomfit-js">\n' + js + '</script>\n';
const bad = out.match(/<\/(body|html)>|<!--/gi);
if (bad) { console.error('금지 문자열 발견:', bad); process.exit(1); }
if ((out.match(/<\/script>/g) || []).length !== 1 || (out.match(/<\/style>/g) || []).length !== 1) { console.error('닫는 태그 개수 이상'); process.exit(1); }
fs.writeFileSync(__dirname + '/M_zoomfit_꼬리블록_v1.txt', out);
console.log('ok', out.length, 'bytes');

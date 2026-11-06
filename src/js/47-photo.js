/* ---------- photo mode: frame the shot, capture the 3D view plus name tags and bubbles, then save, share or copy ---------- */
const photo = { on: false, tags: true, grid: true, plain: null, polaroid: null, kind: 'polaroid', jpg: {}, png: {}, ready: {} };
const UA = navigator.userAgent;
const isMobileOS = /Android|iPhone|iPad|iPod/i.test(UA) || (/Macintosh/.test(UA) && navigator.maxTouchPoints > 1) || !!(navigator.userAgentData && navigator.userAgentData.mobile);
// Computers (Windows/macOS) show a share sheet with apps, but most of those apps never receive the file.
// So on a computer the button copies the picture; pasting it into a chat window (Ctrl+V / ⌘V) sends it.
const canCopyImage = !!(navigator.clipboard && navigator.clipboard.write && window.ClipboardItem && window.isSecureContext);
const shareMode = isMobileOS ? 'share' : canCopyImage ? 'copy' : 'download';
$('#shareLbl').textContent = shareMode === 'copy' ? '복사하기' : '공유하기';
const pasteKey = /Mac/.test(navigator.platform || UA) ? '⌘V' : 'Ctrl+V';

function openPhoto(){ if (!me) return; setPeopleOpen(false); setSoundOpen(false); setRideMenuOpen(false); setEmoOpen(false); closeMenu(); photo.on = true; $('#photo').hidden = false; $('#hud').hidden = true; cancelJoy(); joy.el.hidden = true; }
function closePhoto(){ photo.on = false; $('#photo').hidden = true; $('#shot').hidden = true; $('#hud').hidden = false; joy.el.hidden = !isTouch; }
$('#camBtn').addEventListener('click', e => { e.stopPropagation(); openPhoto(); });
$('#photoExit').onclick = closePhoto;
$('#optTags').onclick = () => { photo.tags = !photo.tags; $('#optTags').setAttribute('aria-pressed', photo.tags); };
$('#optGrid').onclick = () => { photo.grid = !photo.grid; $('#optGrid').setAttribute('aria-pressed', photo.grid); $('#photo').classList.toggle('nogrid', !photo.grid); };
addEventListener('keydown', e => { if (e.key !== 'Escape' || !photo.on) return; if (!$('#shot').hidden) $('#shot').hidden = true; else closePhoto(); });

function pillPath(g, x, y, w, h, r){ roundRect(g, x, y, w, h, Math.min(r, h / 2, w / 2)); }
function drawTags(g, k){
  if (!photo.tags || tagLayer.hidden) return;
  const css = getComputedStyle(document.body).fontFamily;
  for (const el of tagLayer.children){
    if (el.style.display === 'none') continue;
    for (const part of el.children){
      if (part.hidden) continue; const b = part.getBoundingClientRect(); if (!b.width) continue;
      const x = b.left * k, y = b.top * k, w = b.width * k, h = b.height * k;
      if (part.classList.contains('nm')){
        g.fillStyle = 'rgba(20,22,50,.62)'; pillPath(g, x, y, w, h, h / 2); g.fill();
        const dot = part.querySelector('i'); if (dot){ const db = dot.getBoundingClientRect(); g.fillStyle = dot.style.background || '#fff8ec'; g.beginPath(); g.arc((db.left + db.width / 2) * k, (db.top + db.height / 2) * k, db.width / 2 * k, 0, TAU); g.fill(); }
        g.fillStyle = '#fff8ec'; g.font = `600 ${12 * k}px ${css}`; g.textBaseline = 'middle'; g.textAlign = 'right'; g.fillText(part.textContent, x + w - 9 * k, y + h / 2 + k);
      } else {
        g.globalAlpha = +(part.style.opacity || 1); g.fillStyle = 'rgba(255,252,245,.97)'; pillPath(g, x, y, w, h, (part.classList.contains('emo') ? 18 : 15) * k); g.fill();
        g.beginPath(); g.moveTo(x + w / 2 - 6 * k, y + h - 1); g.lineTo(x + w / 2 + 6 * k, y + h - 1); g.lineTo(x + w / 2, y + h + 6 * k); g.closePath(); g.fill();
        const emo = part.classList.contains('emo'); g.fillStyle = '#2a2140'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = emo ? `${30 * k}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif` : `${14 * k}px ${css}`;
        g.fillText(part.textContent, x + w / 2, y + h / 2 + (emo ? 2 * k : 0), w - 16 * k); g.globalAlpha = 1;
      }
    }
  }
}
function whereNow(){ if (myRide.id >= 0) return rides[myRide.id].name; return me && me.seat >= 0 ? '광장 벤치' : areaAt(me.pos.x, me.pos.z) ? '승강장' : '광장'; }
function capture(){
  renderer.render(scene, camera);
  const src = renderer.domElement, W = src.width, Hh = src.height, k = W / innerWidth;
  const plain = document.createElement('canvas'); plain.width = W; plain.height = Hh; const g = plain.getContext('2d');
  g.drawImage(src, 0, 0); drawTags(g, k);
  // polaroid: cream card, photo cropped to 4:5, park name + date + where underneath
  const pw = Math.round(Math.min(W, Hh * .8)), ph = Math.round(pw * 1.25), m = Math.round(pw * .045), cap = Math.round(pw * .17);
  const pol = document.createElement('canvas'); pol.width = pw + m * 2; pol.height = Math.min(ph, Hh) + m + cap; const q = pol.getContext('2d');
  const ch = Math.min(ph, Hh), cw = Math.min(pw, W), sx = (W - cw) / 2, sy = (Hh - ch) / 2;
  q.fillStyle = '#fbf6ee'; q.fillRect(0, 0, pol.width, pol.height); q.drawImage(plain, sx, sy, cw, ch, m, m, pw, ch);
  const d = new Date(Date.now() + 9 * 3600e3), date = `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${String(d.getUTCDate()).padStart(2, '0')}`;
  q.textBaseline = 'middle'; q.fillStyle = '#2a2140'; q.font = `${Math.round(cap * .32)}px "Jua", sans-serif`; q.textAlign = 'left'; q.fillText('🎡 온라인 놀이공원', m * 1.3, m + ch + cap / 2);
  q.fillStyle = '#7a6a8a'; q.font = `${Math.round(cap * .2)}px ${getComputedStyle(document.body).fontFamily}`; q.textAlign = 'right'; q.fillText(`${date} · ${whereNow()}`, pol.width - m * 1.3, m + ch + cap / 2 + 2);
  return { plain, polaroid: pol };
}
const toBlob = (c, type, qual) => new Promise(res => c.toBlob(res, type, qual));
// encode both pictures right away, so share/copy can run inside the tap itself (browsers only allow them during a tap)
function prepare(){ photo.jpg = {}; photo.png = {}; photo.ready = {}; for (const kind of ['polaroid', 'plain']){ const c = photo[kind]; photo.jpg[kind] = toBlob(c, 'image/jpeg', .92); photo.jpg[kind].then(b => { photo.ready[kind] = b; }); if (shareMode === 'copy') photo.png[kind] = toBlob(c, 'image/png'); } }
function showShot(){ const c = photo.kind === 'plain' ? photo.plain : photo.polaroid; const img = $('#shotImg'); img.src = c.toDataURL('image/jpeg', .9); img.classList.toggle('plain', photo.kind === 'plain'); document.querySelectorAll('#shot .kind button').forEach(b => b.setAttribute('aria-checked', b.dataset.k === photo.kind)); }
$('#shutter').onclick = () => {
  const r = capture(); photo.plain = r.plain; photo.polaroid = r.polaroid; prepare();
  const f = $('#photo .flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); chime();
  setTimeout(() => { showShot(); $('#shareHint').hidden = true; $('#shot').hidden = false; }, 380);
};
document.querySelectorAll('#shot .kind button').forEach(b => b.onclick = () => { photo.kind = b.dataset.k; showShot(); });
const shotName = () => { const d = new Date(Date.now() + 9 * 3600e3); return `online-park-${d.toISOString().slice(0, 19).replace(/[-:T]/g, '')}.jpg`; };
function download(blob){ const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = shotName(); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); }
function hint(t){ const el = $('#shareHint'); el.textContent = t; el.hidden = false; }
$('#shotSave').onclick = async () => { const blob = await photo.jpg[photo.kind]; if (!blob) return; download(blob); toast('사진을 저장했어요'); };
$('#shotShare').onclick = () => {
  const kind = photo.kind;
  if (shareMode === 'copy'){
    // ClipboardItem takes the (already encoding) PNG promise, which keeps the copy inside this click
    navigator.clipboard.write([new ClipboardItem({ 'image/png': photo.png[kind] })])
      .then(() => { toast('사진을 복사했어요'); hint(`카카오톡·디스코드·메신저 대화창을 누르고 ${pasteKey}로 붙여넣으면 보내져요`); })
      .catch(async () => { const blob = await photo.jpg[kind]; if (blob) download(blob); toast('복사가 안 돼서 대신 저장했어요'); hint('저장된 사진 파일을 대화창에 끌어다 놓으면 보낼 수 있어요'); });
    return;
  }
  if (shareMode === 'share'){
    // share only the file (some apps drop the picture when text comes along), and call it straight from the tap
    const go = blob => {
      if (!blob) return;
      const file = new File([blob], shotName(), { type: 'image/jpeg' });
      if (navigator.canShare && navigator.canShare({ files: [file] })){
        navigator.share({ files: [file] }).catch(e => { if (e && e.name === 'AbortError') return; download(blob); toast('공유가 안 돼서 사진을 저장했어요'); });
      } else { download(blob); toast('이 브라우저는 바로 공유가 안 돼서 저장했어요'); }
    };
    if (photo.ready[kind]) go(photo.ready[kind]); else photo.jpg[kind].then(go);
    return;
  }
  photo.jpg[kind].then(blob => { if (blob){ download(blob); toast('사진을 저장했어요'); hint('저장된 사진 파일을 대화창에 끌어다 놓으면 보낼 수 있어요'); } });
};
$('#shotAgain').onclick = () => { $('#shot').hidden = true; };

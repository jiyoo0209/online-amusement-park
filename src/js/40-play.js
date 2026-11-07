/* ---------- player ---------- */
let entered = false;
const newSeed = () => ((Math.random() * 2147483646) | 0) + 1;
let mySeed = (() => { const v = parseInt(store.get('park-seed'), 10); return Number.isFinite(v) && v > 0 ? v : newSeed(); })();
let myName = store.get('park-name') || ['솜사탕', '회전목마', '풍선', '츄러스', '팝콘', '퍼레이드', '꼬마기차', '불꽃놀이'][(Math.random() * 8) | 0] + ((Math.random() * 90 + 10) | 0);
let me = null;
const ctrl = { target: null, route: [], pendingSeat: -1, goRide: -1, stuck: 0, stuckT: 0 };
// walk to a point, going down/up the stairs when it is on a different raised platform
function walkTo(p){
  const from = areaAt(me.pos.x, me.pos.z), to = areaAt(p.x, p.z), pts = [];
  if (from && from !== to) pts.push(from.top.clone(), from.bottom.clone());
  if (to && to !== from) pts.push(to.bottom.clone(), to.top.clone());
  pts.push(p.clone()); ctrl.target = pts.shift(); ctrl.route = pts; ctrl.stuck = 0;
}
// my ride: id -1 = not on a ride. queued = waiting at the entrance for the next boarding
const myRide = { id: -1, seat: -1, rec: 0, queued: false, at: 0, warned: 0, want: -1, clash: null }; // want: the seat you picked (-1 = any)
let myWave = 0, myEmo = '', myEmoT = 0;

function resolve(x, z, r = .32){
  x = clamp(x, BOUNDS.x0, BOUNDS.x1); z = clamp(z, BOUNDS.z0, BOUNDS.z1);
  for (const o of obstacles){
    if (o.t === 'c'){ const dx = x - o.x, dz = z - o.z; if (Math.abs(dx) > o.r + r || Math.abs(dz) > o.r + r) continue; const d = Math.hypot(dx, dz), m = o.r + r; if (d < m && d > 1e-4){ x = o.x + dx / d * m; z = o.z + dz / d * m; } }
    else { const cx = clamp(x, o.x0, o.x1), cz = clamp(z, o.z0, o.z1), dx = x - cx, dz = z - cz, d = Math.hypot(dx, dz);
      if (d < r){ if (d > 1e-4){ x = cx + dx / d * r; z = cz + dz / d * r; } else { const e = [x - o.x0, o.x1 - x, z - o.z0, o.z1 - z], k = e.indexOf(Math.min(...e)); if (k === 0) x = o.x0 - r; else if (k === 1) x = o.x1 + r; else if (k === 2) z = o.z0 - r; else z = o.z1 + r; } } }
  }
  return [x, z];
}

/* ---------- camera ---------- */
const cam = { theta: 0, phi: .32, dist: 70, target: V(0, 6, -10), tgt: V(0, 6, -10), mode: 'intro', yaw: 0, pitch: 0, povPref: store.get('park-pov') !== '0' };

/* ---------- input ---------- */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const pointers = new Map(); let dragMoved = 0, pinchD = 0, twoMid = null;
const joy = { id: null, cx: 0, cy: 0, vx: 0, vy: 0, el: $('#joy'), knob: $('#joy .knob') };
function cancelJoy(){ joy.id = null; joy.vx = joy.vy = 0; joy.knob.style.transform = ''; }
function joyMove(e){ let jx = e.clientX - joy.cx, jy = e.clientY - joy.cy; const R = 46, d = Math.hypot(jx, jy); if (d > R){ jx *= R / d; jy *= R / d; } joy.knob.style.transform = `translate(${jx}px,${jy}px)`; joy.vx = jx / R; joy.vy = jy / R; }
joy.el.addEventListener('pointerdown', e => { e.preventDefault(); const r = joy.el.getBoundingClientRect(); joy.cx = r.left + r.width / 2; joy.cy = r.top + r.height / 2; joy.id = e.pointerId; try { joy.el.setPointerCapture(e.pointerId); } catch (_){} joyMove(e); });
joy.el.addEventListener('pointermove', e => { if (e.pointerId === joy.id) joyMove(e); });
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => joy.el.addEventListener(t, e => { if (e.pointerId === joy.id) cancelJoy(); }));
const cv = renderer.domElement;
cv.addEventListener('pointerdown', e => {
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); dragMoved = 0; try { cv.setPointerCapture(e.pointerId); } catch (_){}
  if (pointers.size === 2){ cancelJoy(); const [a, b] = [...pointers.values()]; pinchD = Math.hypot(a.x - b.x, a.y - b.y); twoMid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
});
cv.addEventListener('pointermove', e => {
  const p = pointers.get(e.pointerId); if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (pointers.size === 2){
    const [a, b] = [...pointers.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y), mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    if (pinchD && cam.mode !== 'pov') cam.dist = clamp(cam.dist * pinchD / d, 4, 60); pinchD = d;
    if (twoMid && cam.mode === 'follow'){ cam.theta -= (mid.x - twoMid.x) * .007; cam.phi = clamp(cam.phi + (mid.y - twoMid.y) * .005, .05, 1.4); }
    twoMid = mid; dragMoved = 99; return;
  }
  dragMoved += Math.abs(dx) + Math.abs(dy);
  if (dragMoved > 6){ cv.classList.add('dragging');
    if (cam.mode === 'pov'){ cam.yaw = clamp(cam.yaw - dx * .005, -2.4, 2.4); cam.pitch = clamp(cam.pitch + dy * .004, -1.1, 1.0); }
    else { cam.theta -= dx * .006; cam.phi = clamp(cam.phi + dy * .004, .05, 1.4); } }
});
function endPointer(e){
  const had = pointers.has(e.pointerId); pointers.delete(e.pointerId); cv.classList.remove('dragging');
  if (pointers.size < 2){ pinchD = 0; twoMid = null; }
  if (had && dragMoved <= 6 && pointers.size === 0) onTap(e.clientX, e.clientY);
}
cv.addEventListener('pointerup', endPointer); cv.addEventListener('pointercancel', e => { pointers.delete(e.pointerId); cv.classList.remove('dragging'); });
cv.addEventListener('wheel', e => { e.preventDefault(); if (cam.mode === 'pov') return; cam.dist = clamp(cam.dist * (1 + e.deltaY * .0011), 4, 60); }, { passive: false });
const keys = {};
addEventListener('keydown', e => { if (e.target.tagName === 'INPUT') return; keys[e.key.toLowerCase()] = true; });
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

function isShown(o){ while (o){ if (!o.visible) return false; o = o.parent; } return true; }
function onTap(x, y){
  if (!entered || !me) return;
  ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(interactives, false).filter(h => isShown(h.object));
  const plane = new THREE.Plane(_up, -me.pos.y), fp = V(0, 0, 0), hitFloor = ray.ray.intersectPlane(plane, fp);
  const fd = hitFloor ? camera.position.distanceTo(fp) : 1e9;
  const hit = hits.find(h => h.distance < fd + 1.5);
  if (hit && handleAct(hit.object.userData.act)) return;
  if (myRide.id >= 0 && !myRide.queued){ toast('탑승 중이에요 · 운행이 끝나면 내려요'); return; }
  if (!hitFloor) return;
  if (fp.x < BOUNDS.x0 - 2 || fp.x > BOUNDS.x1 + 2 || fp.z < BOUNDS.z0 - 2 || fp.z > BOUNDS.z1 + 2) return;
  leaveQueue(); standUp(); ctrl.pendingSeat = -1; ctrl.goRide = -1;
  const tx = clamp(fp.x, BOUNDS.x0, BOUNDS.x1), tz = clamp(fp.z, BOUNDS.z0, BOUNDS.z1);
  walkTo(V(tx, groundH(tx, tz), tz)); ripple(V(tx, groundH(tx, tz), tz));
}
function handleAct(a){
  if (!a) return false;
  if (a.type === 'ride'){ goToRide(a.id); return true; }
  if (myRide.id >= 0 && !myRide.queued){ toast('탑승 중이에요'); return true; }
  if (a.type === 'bench'){
    const i = [a.i, a.i + 1].find(k => seats[k] && !seats[k].occ && !seats[k].occRemote);
    if (i == null){ if (me.seat === a.i || me.seat === a.i + 1) return true; toast('벤치에 자리가 없어요'); return true; }
    leaveQueue(); standUp(); const s = seats[i]; ctrl.goRide = -1; walkTo(V(s.x + Math.sin(s.rot) * .6, 0, s.z + Math.cos(s.rot) * .6)); ctrl.pendingSeat = i; return true;
  }
  if (a.type === 'snack'){ openMenu(); return true; }
  return false;
}

/* ---------- small effects ---------- */
const fx = [];
function ripple(p){ const m = new THREE.Mesh(new THREE.RingGeometry(.15, .22, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfff1d8, transparent: true, opacity: .8, depthWrite: false })); m.position.copy(p).y += .04; scene.add(m); fx.push({ m, t: 0, d: .7, kind: 'ripple' }); }
const confettiCols = [0xff6b6b, 0xffd166, 0x4dabf7, 0x63e6be, 0xb197fc, 0xff8fd0];
function confetti(p){ for (let i = 0; i < 18; i++){ const m = new THREE.Mesh(new THREE.PlaneGeometry(.09, .14), new THREE.MeshBasicMaterial({ color: confettiCols[i % 6], side: THREE.DoubleSide, transparent: true })); m.position.copy(p).add(V(rand(-.3, .3), 1.6, rand(-.3, .3))); scene.add(m); fx.push({ m, t: 0, d: 1.6, kind: 'confetti', vx: rand(-1.2, 1.2), vy: rand(1.5, 3.2), vz: rand(-1.2, 1.2), sp: rand(4, 10) }); } }
let toastT = 0;
function toast(t){ const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2800); }

/* ---------- benches ---------- */
function placeSeated(a, i){ const s = seats[i]; a.seat = i; a.sit = true; a.pos.set(s.x, s.h - SIT_DROP * a.L.size, s.z); a.rot = s.rot; a.g.rotation.set(0, s.rot, 0); a.moving = false; }
function standUp(){ if (!me || me.seat < 0) return; const s = seats[me.seat]; s.occ = false; me.seat = -1; me.sit = false; me.pos.set(s.x + Math.sin(s.rot) * .7, 0, s.z + Math.cos(s.rot) * .7); ctrl.route = []; const [x, z] = resolve(me.pos.x, me.pos.z); me.pos.x = x; me.pos.z = z; pushPresence(true); refreshBar(); }
function sitAt(i){ const s = seats[i]; if (s.occ || s.occRemote) return; placeSeated(me, i); s.occ = true; pushPresence(true); refreshBar(); }

/* ---------- rides: walking there, queueing, boarding, getting off ---------- */
function occupiedSeats(ride){ const set = new Set(); if (typeof remotes !== 'undefined') for (const r of remotes.values()) if (r.rd === ride.index && r.rs >= 0) set.add(r.rs); return set; }
function goToRide(id){
  const ride = rideById(id); if (!ride || !me) return;
  if (myRide.id === id || ctrl.goRide === id){ openSeatPick(id); return; }
  if (myRide.id >= 0 && !myRide.queued){ toast('지금 타는 놀이기구가 끝나면 갈 수 있어요'); return; }
  leaveQueue(); standUp(); setRideMenuOpen(false);
  ctrl.pendingSeat = -1; walkTo(ride.entrance); ctrl.goRide = id; myRide.want = -1;
  toast(`${ride.emoji} ${ride.name}(으)로 가는 중 · 앉을 자리를 골라 주세요`);
  openSeatPick(id);
}
function joinQueue(id){ const ride = rideById(id); myRide.id = id; myRide.seat = -1; myRide.queued = true; myRide.at = nowS(); ctrl.goRide = -1; ctrl.target = null; ctrl.route = [];
  me.rot = Math.atan2(ride.board.x - me.pos.x, ride.board.z - me.pos.z); pushPresence(true); refreshBar();
  const w = ride.wait(nowS()); if (w > 1.5) toast(`${ride.name} 줄 서기 · ${Math.ceil(w)}초 뒤 탑승`); }
function leaveQueue(){ if (myRide.id >= 0 && myRide.queued){ myRide.id = -1; myRide.queued = false; myRide.want = -1; closeSeatPick(); pushPresence(true); refreshBar(); } }
function tryBoard(t){
  const ride = rideById(myRide.id); if (!ride) return;
  if (seatPick.id === ride.index) return; // still choosing a seat: wait for the choice (closing the picker = any seat)
  const taken = occupiedSeats(ride), openAll = ride.open(t), open = openAll.filter(i => !taken.has(i));
  let seat;
  if (myRide.want >= 0){
    // the seat you picked: wait for it; if someone else sat there first, say so once and let you pick again
    const want = wantSeats(ride, myRide.want), ok = want.filter(i => open.includes(i));
    if (!ok.length){
      if (want.some(i => openAll.includes(i))){ const key = ride.rec(t, want[0]) + ':' + myRide.want;
        if (myRide.clash !== key){ myRide.clash = key; toast('고른 자리에 다른 사람이 먼저 앉았어요 · 다른 자리를 골라 주세요'); openSeatPick(ride.index); } }
      return;
    }
    seat = ok[0];
  } else {
    if (!open.length) return;
    // any seat: pick at random among the free ones (two people boarding at once rarely collide), front rows a bit more likely
    seat = open[Math.floor(Math.pow(Math.random(), 1.4) * open.length)];
  }
  myRide.seat = seat; myRide.rec = ride.rec(t, seat); myRide.queued = false; myRide.at = t;
  me.sit = true; me.moving = false; ctrl.target = null; ctrl.route = [];
  cam.yaw = 0; cam.pitch = 0;
  if (ride.pov && cam.povPref) setCamMode('pov'); else { cam.dist = Math.max(cam.dist, ride.camDist); }
  chime(); toast(`${ride.emoji} ${seatName(ride, seat)} 탑승! ${Math.max(1, Math.ceil(myRide.rec - t))}초 뒤 출발해요${ride.gondolas ? ' · 한 바퀴 돌고 내려요' : ''}`);
  if (seatPick.id === ride.index) renderSeatPick();
  pushPresence(true); refreshBar();
}
function getOff(ride, fun){
  me.rideP = null; me.rideQ = null; me.sit = false; me.handsUp = false;
  const p = ride.exit, j = p.y > .1 ? .25 : .6; me.pos.set(p.x + rand(-j, j), 0, p.z + rand(-j * .6, j * .6)); const [x, z] = resolve(me.pos.x, me.pos.z); me.pos.x = x; me.pos.z = z; me.pos.y = groundH(x, z);
  me.rot = Math.atan2(PLAZA.x - x, PLAZA.z - z); me.g.rotation.set(0, me.rot, 0);
  myRide.id = -1; myRide.seat = -1; myRide.queued = false; myRide.want = -1; closeSeatPick();
  if (cam.mode === 'pov') setCamMode('follow');
  if (fun){ const lines = { carousel: '빙글빙글 재밌었다!', viking: '으아… 심장이 아직 두근두근', wheel: '공원이 다 보였어요', drop: '살았다… 다시 탈래!', coaster: '최고였어! 한 번 더?' }; toast(lines[ride.id] || '재밌었다!'); say(me, lines[ride.id] || '재밌었다!', 3500); confetti(me.pos); }
  pushPresence(true); refreshBar();
}
function exitRide(){
  const ride = rideById(myRide.id); if (!ride) return;
  if (myRide.queued){ leaveQueue(); toast('줄에서 나왔어요'); return; }
  if (ride.open(nowS()).includes(myRide.seat)){ getOff(ride, false); toast('놀이기구에서 내렸어요'); return; }
  toast('운행 중에는 내릴 수 없어요 · 끝나면 자동으로 내려요');
}
const _rp = V(0, 0, 0), _rq = new THREE.Quaternion(), _ru = V(0, 0, 0);
// put an avatar on a seat (shared by me, remote people and NPC riders)
function seatAvatar(a, ride, seat){
  if (!rideSeatWorld(ride, seat, _rp, _rq)) return false;
  _ru.set(0, 1, 0).applyQuaternion(_rq);
  if (!a.rideP){ a.rideP = V(0, 0, 0); a.rideQ = new THREE.Quaternion(); }
  a.rideP.copy(_rp).addScaledVector(_ru, -SIT_DROP * a.L.size); a.rideQ.copy(_rq); a.sit = true; a.moving = false;
  return true;
}
function rideHands(ride, t){ const v = ride.speedAt(t); return ride.id === 'coaster' ? v > 13 : ride.id === 'drop' ? v > 6 : ride.id === 'viking' ? v > 7 : false; }
function setCamMode(m){ cam.mode = m; camera.fov = m === 'pov' ? 72 : 50; camera.updateProjectionMatrix(); refreshBar(); }

/* ---------- HUD ---------- */
function refreshBar(){
  const riding = myRide.id >= 0 && !myRide.queued, inLine = myRide.id >= 0 && myRide.queued, ride = rideById(myRide.id);
  $('#bWave').hidden = riding || (me && me.sit && !riding) || inLine;
  $('#bStand').hidden = !(me && me.seat >= 0);
  $('#bExit').hidden = !(riding || inLine); $('#bExit').lastChild.textContent = inLine ? '줄에서 나오기' : '내리기';
  $('#bView').hidden = !(riding && ride); if (riding && ride) $('#bView').lastChild.textContent = cam.mode === 'pov' ? '밖에서 보기' : '탑승 시점';
  $('#bSnack').hidden = riding || inLine;
}
$('#bStand').onclick = () => standUp();
$('#bWave').onclick = () => { if (!me) return; me.waveUntil = performance.now() + 2200; myWave = Date.now(); pushPresence(true); };
$('#bExit').onclick = () => exitRide();
$('#bView').onclick = () => { if (myRide.id < 0 || myRide.queued) return; cam.povPref = cam.mode !== 'pov'; store.set('park-pov', cam.povPref ? '1' : '0'); cam.yaw = 0; cam.pitch = 0; setCamMode(cam.mode === 'pov' ? 'follow' : 'pov'); if (cam.mode === 'follow') cam.dist = Math.max(cam.dist, rideById(myRide.id).camDist); };

// ride menu (bottom-left chip)
function renderRideMenu(){
  const ul = $('#rideList'), t = nowS(); ul.textContent = '';
  rides.forEach(r => {
    const li = document.createElement('li'); const b = document.createElement('button'); b.type = 'button';
    const riders = [...(typeof remotes !== 'undefined' ? remotes.values() : [])].filter(x => x.rd === r.index && x.rs >= 0).length + (myRide.id === r.index && !myRide.queued ? 1 : 0);
    const mine = myRide.id === r.index;
    b.innerHTML = `<span class="re" aria-hidden="true">${r.emoji}</span><span class="rn"><b></b><em></em></span><span class="rs"></span>`;
    b.querySelector('b').textContent = r.name; b.querySelector('em').textContent = mine ? (myRide.queued ? '줄 서는 중 · ' : '타는 중 · ') + r.status(t) : r.status(t);
    b.querySelector('.rs').textContent = riders ? `${riders}명` : '';
    b.classList.toggle('mine', mine); b.onclick = () => goToRide(r.index);
    li.appendChild(b); ul.appendChild(li);
  });
}
let rideMenuT = 0;
// the joystick hides while the ride list, emoji strip or snack menu is open
function syncJoy(){ const covered = !$('#rideMenu').hidden || !$('#emoPop').hidden || !$('#menu').hidden || !$('#seatPick').hidden; if (covered) cancelJoy(); joy.el.style.visibility = covered ? 'hidden' : ''; }
function setRideMenuOpen(open){ if (open){ setPeopleOpen(false); setSoundOpen(false); setEmoOpen(false); cancelJoy(); renderRideMenu(); clearInterval(rideMenuT); rideMenuT = setInterval(renderRideMenu, 500); } else clearInterval(rideMenuT);
  $('#rideMenu').hidden = !open; $('#rideChip').setAttribute('aria-expanded', open); syncJoy(); }
$('#rideChip').addEventListener('click', e => { e.stopPropagation(); setRideMenuOpen($('#rideMenu').hidden); });
$('#rideMenu').addEventListener('pointerdown', e => e.stopPropagation());

// emoji
const EMOJIS = [...document.querySelectorAll('#emoPop [data-e]')].map(b => b.dataset.e);
function setEmoOpen(open){ if (open){ setPeopleOpen(false); setSoundOpen(false); setRideMenuOpen(false); cancelJoy(); } $('#emoPop').hidden = !open; $('#bEmo').setAttribute('aria-expanded', open); if (open) syncEmoFade(); syncJoy(); }
$('#bEmo').addEventListener('click', e => { e.stopPropagation(); setEmoOpen($('#emoPop').hidden); });
$('#emoPop').addEventListener('pointerdown', e => e.stopPropagation());
const emoStrip = $('#emoPop .strip');
function syncEmoFade(){ const max = emoStrip.scrollWidth - emoStrip.clientWidth; $('#emoPop').classList.toggle('more-l', emoStrip.scrollLeft > 2); $('#emoPop').classList.toggle('more-r', emoStrip.scrollLeft < max - 2); $('#emoPop').classList.toggle('scrolls', max > 2); }
emoStrip.addEventListener('scroll', syncEmoFade, { passive: true });
addEventListener('resize', () => { if (!$('#emoPop').hidden) syncEmoFade(); });
emoStrip.addEventListener('wheel', e => { if (emoStrip.scrollWidth <= emoStrip.clientWidth) return; const d = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX; if (!d) return; e.preventDefault(); emoStrip.scrollLeft += d * (e.deltaMode === 1 ? 32 : 1); }, { passive: false });
const emoDrag = { id: null, x: 0, sl: 0, moved: false };
emoStrip.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.button !== 0) return; emoDrag.id = e.pointerId; emoDrag.x = e.clientX; emoDrag.sl = emoStrip.scrollLeft; emoDrag.moved = false; });
emoStrip.addEventListener('pointermove', e => { if (e.pointerId !== emoDrag.id) return; const dx = e.clientX - emoDrag.x; if (!emoDrag.moved && Math.abs(dx) > 5){ emoDrag.moved = true; try { emoStrip.setPointerCapture(e.pointerId); } catch (_){} emoStrip.classList.add('drag'); } if (emoDrag.moved) emoStrip.scrollLeft = emoDrag.sl - dx; });
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => emoStrip.addEventListener(t, e => { if (e.pointerId !== emoDrag.id) return; emoDrag.id = null; emoStrip.classList.remove('drag'); }));
// a drag that scrolled the strip shouldn't also send the emoji under the mouse
emoStrip.addEventListener('click', e => { if (emoDrag.moved){ emoDrag.moved = false; e.stopPropagation(); e.preventDefault(); } }, true);
$('#emoPop').querySelectorAll('.nav').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); emoStrip.scrollBy({ left: (b.dataset.dir === 'l' ? -1 : 1) * emoStrip.clientWidth * .7, behavior: 'smooth' }); }));
$('#emoPop').addEventListener('click', e => { const b = e.target instanceof Element && e.target.closest('[data-e]'); if (!b || !me) return; myEmo = b.dataset.e; myEmoT = Date.now(); say(me, myEmo, 3200, true); pushPresence(true); setEmoOpen(false); });

// snack menu
const ml = $('#menuList');
ITEMS.forEach((it, i) => { const li = document.createElement('li'); const b = document.createElement('button'); b.type = 'button';
  b.innerHTML = `<span><i aria-hidden="true">${it.emoji}</i> ${it.name}<em>${it.desc}</em></span><span class="price">₩${it.price}</span>`; b.onclick = () => order(i); li.appendChild(b); ml.appendChild(li); });
{ const li = document.createElement('li'); const b = document.createElement('button'); b.type = 'button'; b.innerHTML = '<span>손 비우기<em>들고 있는 걸 내려놓아요</em></span>'; b.onclick = () => order(-1); li.appendChild(b); ml.appendChild(li); }
function openMenu(){ if (!entered) return; setPeopleOpen(false); setSoundOpen(false); setRideMenuOpen(false); setEmoOpen(false); $('#menu').hidden = false; syncJoy(); }
function closeMenu(){ $('#menu').hidden = true; syncJoy(); }
$('#menuClose').onclick = () => closeMenu();
$('#menu').addEventListener('click', e => { if (e.target === $('#menu')) closeMenu(); });
$('#menu').addEventListener('pointerdown', e => e.stopPropagation());
$('#bSnack').onclick = () => openMenu();
function order(i){ closeMenu(); if (!me) return;
  let bc = 0;
  if (isBalloon(i)){ do { bc = (Math.random() * BALLOON_COLORS.length) | 0; } while (BALLOON_COLORS.length > 1 && isBalloon(me.item) && bc === me.itemColor); }
  setItem(me, i, bc); pushPresence(true);
  if (i >= 0){ toast(isBalloon(i) ? `🎈 ${BALLOON_COLORS[bc][0]} 풍선 받았어요` : `${ITEMS[i].emoji} ${ITEMS[i].name} 받았어요`); chime(); } }

/* ---------- sound: carnival waltz + park ambience + ride wind ---------- */
let AC = null, sfxG = null, musicG = null, windG = null, rumbleG = null, crowdG = null;
const vol = (() => { try { return Object.assign({ park: 80, music: 60 }, JSON.parse(store.get('park-vol') || '{}')); } catch (e){ return { park: 80, music: 60 }; } })();
const level = k => clamp(vol[k] / 100, 0, 1);
function noiseBuf(){ const len = AC.sampleRate * 2, b = AC.createBuffer(1, len, AC.sampleRate), d = b.getChannelData(0); let last = 0; for (let i = 0; i < len; i++){ const w = Math.random() * 2 - 1; last = (last + .02 * w) / 1.02; d[i] = w * .5 + last * 3.5; } return b; }
function loopNoise(filterType, freq, q, dest){ const s = AC.createBufferSource(); s.buffer = noiseBuf(); s.loop = true; const f = AC.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q; const g = AC.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(dest); s.start(); return { g, f }; }
function initAudio(){
  if (AC) return; const Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return;
  try { AC = new Ctx(); } catch (e){ AC = null; return; }
  const comp = AC.createDynamicsCompressor(); comp.connect(AC.destination);
  sfxG = AC.createGain(); sfxG.connect(comp); musicG = AC.createGain(); musicG.connect(comp);
  crowdG = loopNoise('lowpass', 520, .4, sfxG).g; windG = loopNoise('highpass', 900, .3, sfxG).g; const rb = loopNoise('lowpass', 160, .8, sfxG); rumbleG = rb.g;
  applyVolumes(); scheduleMusic(); setInterval(scheduleMusic, 400);
}
function applyVolumes(){ if (!AC) return; sfxG.gain.setTargetAtTime(level('park'), AC.currentTime, .2); musicG.gain.setTargetAtTime(.32 * level('music'), AC.currentTime, .2); crowdG.gain.setTargetAtTime(.05, AC.currentTime, .5); }
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
function organ(m, t, dur, v){ const o = AC.createOscillator(), o2 = AC.createOscillator(), g = AC.createGain(); o.type = 'square'; o2.type = 'triangle'; o.frequency.value = hz(m); o2.frequency.value = hz(m) * 2;
  const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400; const g2 = AC.createGain(); g2.gain.value = .5;
  o.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); g.connect(musicG);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .02); g.gain.setTargetAtTime(v * .55, t + .05, .12); g.gain.setTargetAtTime(0, t + dur, .05);
  o.start(t); o2.start(t); o.stop(t + dur + .4); o2.stop(t + dur + .4); }
// an original little waltz in C (melody: [midi, beats]; chords per bar)
const MEL = [[64, 1], [67, 1], [72, 1], [71, 2], [67, 1], [69, 1], [72, 1], [77, 1], [76, 3], [74, 1], [72, 1], [71, 1], [69, 1], [71, 1], [72, 1], [67, 1], [64, 1], [62, 1], [60, 3],
  [64, 1], [65, 1], [67, 1], [69, 2], [65, 1], [67, 1], [69, 1], [71, 1], [72, 2], [67, 1], [69, 1], [67, 1], [65, 1], [64, 1], [65, 1], [62, 1], [67, 1], [71, 1], [74, 1], [72, 3]];
const CH = [[48, 52, 55], [43, 47, 50], [41, 45, 48], [48, 52, 55], [43, 47, 53], [41, 45, 48], [43, 47, 50], [48, 52, 55], [48, 52, 55], [41, 45, 48], [43, 47, 50], [48, 52, 55], [41, 45, 48], [48, 52, 55], [43, 47, 53], [48, 52, 55]];
const BEAT = 60 / 152; let musT = 0, melI = 0, melBeat = 0, chBeat = 0;
function scheduleMusic(){
  if (!AC || document.hidden) return; const now = AC.currentTime; if (musT < now) { musT = now + .1; melBeat = chBeat = 0; melI = 0; }
  while (musT < now + 1.2){
    const total = 48; const beatInLoop = chBeat % total, bar = Math.floor(beatInLoop / 3), b = beatInLoop % 3, ch = CH[bar];
    if (b === 0) organ(ch[0], musT, BEAT * .9, .16); else { organ(ch[1] + 12, musT, BEAT * .4, .07); organ(ch[2] + 12, musT, BEAT * .4, .06); }
    if (melBeat <= 0){ const [m, d] = MEL[melI % MEL.length]; organ(m, musT, BEAT * d * .85, .1); melBeat = d; melI++; }
    melBeat--; chBeat++; musT += BEAT;
  }
}
function chime(){ if (!AC) return; const t = AC.currentTime + .02; [84, 88, 91].forEach((m, i) => { const o = AC.createOscillator(), g = AC.createGain(); o.type = 'sine'; o.frequency.value = hz(m); o.connect(g); g.connect(sfxG); g.gain.setValueAtTime(0, t + i * .07); g.gain.linearRampToValueAtTime(.12, t + i * .07 + .01); g.gain.exponentialRampToValueAtTime(.0001, t + i * .07 + .8); o.start(t + i * .07); o.stop(t + i * .07 + .9); }); }
function soundTick(rideSpeed, coasterNearK){ if (!AC) return; const t = AC.currentTime;
  windG.gain.setTargetAtTime(clamp(rideSpeed / 24, 0, 1) * .5, t, .15); rumbleG.gain.setTargetAtTime(clamp(coasterNearK, 0, 1) * .6 + clamp(rideSpeed / 24, 0, 1) * .25, t, .2); }
function renderSound(){ for (const k of ['park', 'music']){ const v = vol[k], el = $('#' + k + 'Vol'); el.value = v; $('#' + k + 'Pct').textContent = v + '%'; el.style.backgroundImage = `linear-gradient(90deg,var(--accent) ${v}%,rgba(255,255,255,.16) ${v}%)`; $('#' + k + 'Mute').setAttribute('aria-pressed', v === 0); } }
for (const k of ['park', 'music']){
  $('#' + k + 'Vol').addEventListener('input', e => { vol[k] = +e.target.value; renderSound(); applyVolumes(); store.set('park-vol', JSON.stringify(vol)); });
  $('#' + k + 'Mute').addEventListener('click', () => { vol[k] = vol[k] ? 0 : 70; renderSound(); applyVolumes(); store.set('park-vol', JSON.stringify(vol)); });
}
document.addEventListener('visibilitychange', () => { if (!AC) return; if (document.hidden) AC.suspend(); else AC.resume(); });

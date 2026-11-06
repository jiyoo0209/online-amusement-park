/* ---------- room: real people ---------- */
let room = null; const remotes = new Map(); let lastSent = 0, presenceDirty = false;
function pushPresence(force){ presenceDirty = true; if (force) lastSent = 0; }
function sendPresence(now){
  if (!room || !me || !presenceDirty || now - lastSent < 110) return; presenceDirty = false; lastSent = now;
  const r2 = v => Math.round(v * 100) / 100;
  const riding = myRide.id >= 0 && !myRide.queued;
  room.presence({ n: myName, ap: mySeed, x: r2(me.pos.x), y: r2(me.pos.y), z: r2(me.pos.z), r: r2(me.rot), mv: me.moving ? 1 : 0, s: me.seat, i: me.item, bc: me.itemColor || 0, w: myWave, em: myEmo, et: myEmoT,
    rd: myRide.id, rs: riding ? myRide.seat : -1, rc: myRide.rec, q: myRide.queued ? 1 : 0 }).catch(() => {});
}
const num = (v, a, b, d) => (typeof v === 'number' && isFinite(v)) ? clamp(v, a, b) : d;
function handlePeers(list){
  const seen = new Set();
  for (const p of list){
    const pr = p.presence || {}; if (typeof pr.n !== 'string') continue;
    seen.add(p.peer);
    let r = remotes.get(p.peer);
    const seed = (num(pr.ap, 1, 2147483647, 1)) | 0;
    const name = pr.n.replace(/[\u0000-\u001f]/g, '').slice(0, 10) || '손님';
    if (!r){ r = { key: p.peer, a: null, name: '', seed: -1, tgt: V(0, 0, 0), rot: 0, moving: false, seat: -1, rd: -1, rs: -1, rc: 0, q: 0, w: 0, et: 0, first: true }; remotes.set(p.peer, r); }
    if (r.seed !== seed){ const old = r.a; const a = makeAvatar(seed); scene.add(a.g); if (old){ a.pos.copy(old.pos); a.g.rotation.y = old.g.rotation.y; setItem(a, old.item, old.itemColor); scene.remove(old.g); removeTag(old); } r.a = a; r.seed = seed; r.name = ''; }
    if (r.name !== name){ r.name = name; setLabel(r.a, name, r.a.L.hair); }
    r.tgt.set(num(pr.x, -80, 80, 0), num(pr.y, -2, 60, 0), num(pr.z, -120, 60, 0)); r.rot = num(pr.r, -10, 10, 0); r.moving = pr.mv === 1;
    if (r.first && typeof pr.x === 'number'){ r.a.pos.copy(r.tgt); r.first = false; }
    const si = num(pr.s, -1, seats.length - 1, -1) | 0;
    if (si !== r.seat){ if (r.seat >= 0 && seats[r.seat]) seats[r.seat].occRemote = false; r.seat = si; if (si >= 0) seats[si].occRemote = true; }
    r.rd = num(pr.rd, -1, rides.length - 1, -1) | 0; r.rs = r.rd >= 0 ? num(pr.rs, -1, rides[r.rd].seats.length - 1, -1) | 0 : -1; r.rc = num(pr.rc, -1e9, 1e12, 0); r.q = pr.q === 1 ? 1 : 0;
    setItem(r.a, num(pr.i, -1, ITEMS.length - 1, -1) | 0, num(pr.bc, 0, BALLOON_COLORS.length - 1, 0) | 0);
    const w = num(pr.w, 0, 1e15, 0); if (w && w !== r.w){ if (r.w) r.a.waveUntil = performance.now() + 2200; r.w = w; }
    const et = num(pr.et, 0, 1e15, 0); if (et && et !== r.et){ if (Date.now() - et < 5000 && EMOJIS.includes(pr.em)) say(r.a, pr.em, 3200, true); r.et = et; }
  }
  for (const [k, r] of remotes){ if (!seen.has(k)){ scene.remove(r.a.g); removeTag(r.a); if (r.seat >= 0 && seats[r.seat]) seats[r.seat].occRemote = false; remotes.delete(k); } }
  updateCount();
}
function whereText(rd, q, si){ if (rd >= 0 && rides[rd]) return `${rides[rd].emoji} ${q ? '줄' : rides[rd].name}`; return si >= 0 ? '벤치' : '산책 중'; }
function updateCount(){
  const n = remotes.size + (entered ? 1 : 0);
  $('#count').textContent = `${n}명`; $('#who').setAttribute('aria-label', `접속 중인 사람 ${n}명 보기`);
  $('#entryCount').textContent = room && remotes.size ? `지금 ${remotes.size}명이 놀고 있어요` : '지금 놀이공원에 들어가 볼까요';
  if (!$('#people').hidden) renderPeople();
}
function renderPeople(){
  const ul = $('#peopleList'), keep = ul.scrollTop; ul.textContent = '';
  const rows = [];
  if (entered && me) rows.push({ name: myName, color: me.L.hair, where: whereText(myRide.id, myRide.queued, me.seat), me: true });
  [...remotes.values()].filter(r => r.a && r.name).sort((a, b) => a.name.localeCompare(b.name, 'ko')).forEach(r => rows.push({ name: r.name, color: r.a.L.hair, where: whereText(r.rd, r.q, r.seat), me: false }));
  rows.forEach(p => {
    const li = document.createElement('li'); if (p.me) li.className = 'me';
    const av = document.createElement('span'); av.className = 'av'; av.style.background = p.color; { const c = new THREE.Color(p.color); av.style.color = (c.r * .299 + c.g * .587 + c.b * .114) < .55 ? '#fff8ee' : 'rgba(30,20,14,.82)'; } av.textContent = [...p.name][0] || '?';
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = p.name;
    if (p.me){ const t = document.createElement('span'); t.className = 'tag-me'; t.textContent = '나'; nm.appendChild(t); }
    const fl = document.createElement('span'); fl.className = 'fl'; fl.textContent = p.where;
    li.append(av, nm, fl); ul.appendChild(li);
  });
  ul.scrollTop = keep; $('#peopleFade').hidden = rows.length <= 3;
}
function setPeopleOpen(open){ if (open){ setSoundOpen(false); setRideMenuOpen(false); if (!$('#emoPop').hidden) setEmoOpen(false); } $('#people').hidden = !open; $('#who').setAttribute('aria-expanded', open); if (open) renderPeople(); }
function setSoundOpen(open){ if (open){ setPeopleOpen(false); setRideMenuOpen(false); if (!$('#emoPop').hidden) setEmoOpen(false); } $('#soundPop').hidden = !open; $('#soundBtn').setAttribute('aria-expanded', open); if (open) renderSound(); }
$('#who').addEventListener('click', e => { e.stopPropagation(); setPeopleOpen($('#people').hidden); });
$('#soundBtn').addEventListener('click', e => { e.stopPropagation(); setSoundOpen($('#soundPop').hidden); });
['#people', '#soundPop'].forEach(id => $(id).addEventListener('pointerdown', e => e.stopPropagation()));
document.addEventListener('pointerdown', e => { const t = e.target, inEl = sel => t instanceof Element && t.closest(sel);
  if (!$('#people').hidden && !inEl('#who')) setPeopleOpen(false);
  if (!$('#soundPop').hidden && !inEl('#soundBtn')) setSoundOpen(false);
  if (!$('#rideMenu').hidden && !inEl('#rideChip')) setRideMenuOpen(false);
  if (!$('#emoPop').hidden && !inEl('#bEmo')) setEmoOpen(false); });
addEventListener('keydown', e => { if (e.key === 'Escape'){ setPeopleOpen(false); setSoundOpen(false); setRideMenuOpen(false); setEmoOpen(false); closeMenu(); } });

// Supabase Realtime: presence carries name + look (slow-changing); position, ride seat and actions go over broadcast, throttled.
function makeSupabaseRoom(cfg){
  const client = window.supabase.createClient(cfg.url, cfg.key, { realtime: { params: { eventsPerSecond: 8 } } });
  const myId = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const ch = client.channel(cfg.channel || 'park-lobby', { config: { presence: { key: myId }, broadcast: { self: false } } });
  const peers = new Map(), listeners = [];
  let mine = null, tracked = '', joined = false, lastSend = 0, timer = 0;
  const emitPeers = () => { const list = [...peers.values()].map(p => ({ peer: p.peer, presence: p.presence })); listeners.forEach(f => { try { f({ peers: list }); } catch (e) {} }); };
  const sendNow = () => { if (!mine || !joined) return; lastSend = Date.now(); ch.send({ type: 'broadcast', event: 'st', payload: { id: myId, s: mine } }).catch(() => {}); };
  const trackIfChanged = () => { if (!mine || !joined) return; const k = mine.n + '|' + mine.ap; if (k === tracked) return; tracked = k; ch.track({ n: mine.n, ap: mine.ap }).catch(() => {}); };
  ch.on('presence', { event: 'sync' }, () => {
    const st = ch.presenceState(), keys = new Set(Object.keys(st)); keys.delete(myId);
    for (const k of keys){ const meta = (st[k] && st[k][0]) || {}; let p = peers.get(k); if (!p){ p = { peer: k, presence: {} }; peers.set(k, p); } if (typeof meta.n === 'string') p.presence = Object.assign({}, p.presence, { n: meta.n, ap: meta.ap }); }
    for (const k of [...peers.keys()]) if (!keys.has(k)) peers.delete(k);
    emitPeers();
  });
  ch.on('presence', { event: 'join' }, ({ key }) => { if (key !== myId) setTimeout(sendNow, 300); });
  ch.on('broadcast', { event: 'st' }, ({ payload }) => {
    if (!payload || typeof payload.id !== 'string' || payload.id === myId || !payload.s || typeof payload.s !== 'object') return;
    const p = peers.get(payload.id); if (!p) return;
    p.presence = payload.s; emitPeers();
  });
  ch.subscribe(status => { if (status === 'SUBSCRIBED'){ joined = true; tracked = ''; trackIfChanged(); sendNow(); } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED'){ joined = false; tracked = ''; } });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && joined){ tracked = ''; trackIfChanged(); sendNow(); } });
  setInterval(() => { if (mine && Date.now() - lastSend > 9000) sendNow(); }, 3000);
  return {
    myId,
    presence(obj){ mine = obj; trackIfChanged(); const gap = 380, since = Date.now() - lastSend; clearTimeout(timer); if (since >= gap) sendNow(); else timer = setTimeout(sendNow, gap - since); return Promise.resolve(); },
    onPeers(cb){ listeners.push(cb); setTimeout(emitPeers, 0); },
  };
}
// Same-browser test room (?room=local): tabs talk over BroadcastChannel, no server needed
function makeLocalRoom(){
  const bc = new BroadcastChannel('park-local'), myId = 'L' + Math.random().toString(36).slice(2, 8), peers = new Map(), listeners = [];
  let mine = null;
  const emit = () => { const list = [...peers.values()].map(p => ({ peer: p.peer, presence: p.presence })); listeners.forEach(f => f({ peers: list })); };
  bc.onmessage = e => { const d = e.data; if (!d || d.id === myId) return; if (d.bye){ peers.delete(d.id); emit(); return; } peers.set(d.id, { peer: d.id, presence: d.s, seen: Date.now() }); emit(); };
  setInterval(() => { if (mine) bc.postMessage({ id: myId, s: mine }); const now = Date.now(); let ch = false; for (const [k, p] of peers) if (now - p.seen > 6000){ peers.delete(k); ch = true; } if (ch) emit(); }, 1500);
  addEventListener('pagehide', () => bc.postMessage({ id: myId, bye: 1 }));
  return { myId, presence(obj){ mine = obj; bc.postMessage({ id: myId, s: obj }); return Promise.resolve(); }, onPeers(cb){ listeners.push(cb); } };
}
(() => {
  try {
    const cfg = window.PARK_REALTIME;
    if (QS.get('room') === 'local' && window.BroadcastChannel) room = makeLocalRoom();
    else if (cfg && cfg.url && window.supabase && window.supabase.createClient) room = makeSupabaseRoom(cfg);
    if (room){ room.onPeers(ch => handlePeers(ch.peers)); updateCount(); }
  } catch (e) { room = null; }
})();
// two people grabbed the same seat at the same moment: the one with the larger id moves over
function settleSeatClash(t){
  if (!room || myRide.id < 0 || myRide.queued) return; const ride = rideById(myRide.id);
  for (const r of remotes.values()) if (r.rd === myRide.id && r.rs === myRide.seat && r.key < room.myId){
    const taken = occupiedSeats(ride), alt = ride.open(t).find(i => !taken.has(i));
    if (alt != null){ myRide.seat = alt; pushPresence(true); } return; }
}

/* ---------- entry ---------- */
const pv = { r: null, scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(26, 240 / 280, .1, 20), a: null };
try {
  pv.r = new THREE.WebGLRenderer({ canvas: $('#preview'), alpha: true, antialias: true });
  pv.r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); pv.r.setSize(120, 140, false); pv.r.outputEncoding = THREE.sRGBEncoding; pv.r.toneMapping = THREE.ACESFilmicToneMapping;
  pv.scene.add(new THREE.HemisphereLight(C('#fff1e0'), C('#7a6070'), .9)); const dl = new THREE.DirectionalLight(C('#ffd2a8'), .9); dl.position.set(2, 3, 4); pv.scene.add(dl);
  pv.cam.position.set(0, .86, 2.9); pv.cam.lookAt(0, .7, 0);
} catch (e) { pv.r = null; }
function hairText(L){ return `${HAIR_NAMES[L.style]} · ${HAIR_COLORS[L.hairIdx][0]} 머리`; }
function showPreview(){ if (pv.a) pv.scene.remove(pv.a.g); pv.a = makeAvatar(mySeed); pv.scene.add(pv.a.g); $('#lookDesc').textContent = hairText(pv.a.L); }
showPreview();
$('#reroll').onclick = () => { mySeed = newSeed(); showPreview(); };
$('#nick').value = myName;
$('#nick').addEventListener('keydown', e => { if (e.key === 'Enter') enter(); });
$('#enter').onclick = enter;
function enter(){
  if (entered) return;
  myName = ($('#nick').value.replace(/\s+/g, ' ').trim() || myName).slice(0, 10); store.set('park-name', myName); store.set('park-seed', String(mySeed));
  me = makeAvatar(mySeed); scene.add(me.g); setLabel(me, myName, me.L.hair);
  me.pos.set(rand(-1.5, 1.5), 0, 30.5); me.rot = Math.PI; me.g.rotation.y = Math.PI; walkTo(V(me.pos.x * .5, 0, 25));
  entered = true; $('#entry').hidden = true; $('#hud').hidden = false; $('#tags').hidden = false;
  cam.mode = 'follow'; cam.theta = 0; cam.phi = .36; cam.dist = 13;
  initAudio(); if (AC && AC.state === 'suspended') AC.resume();
  setTimeout(() => toast(`어서오세요, ${myName}님! 온라인 놀이공원이에요`), 900);
  setTimeout(() => toast('놀이기구를 누르거나 왼쪽 아래 🎢 버튼으로 골라 타요'), 4200);
  if (isTouch) joy.el.hidden = false;
  refreshBar(); pushPresence(true); updateCount();
}

/* ---------- main loop ---------- */
const clock = new THREE.Clock(); let firstFrame = true, clockT = 0, infoT = 0;
const tmpV = V(0, 0, 0), fwd = V(0, 0, 0), right = V(0, 0, 0), _cq = new THREE.Quaternion(), _cf = V(0, 0, 0), _cu = V(0, 0, 0), _cs = V(0, 0, 0), _cp = V(0, 0, 0);
function moveMe(dt, now, ts){
  // on a ride: follow the seat, get off when it's over
  if (myRide.id >= 0){
    const ride = rideById(myRide.id);
    let input = false; if (keys['w'] || keys['a'] || keys['s'] || keys['d'] || keys['arrowup'] || keys['arrowdown'] || keys['arrowleft'] || keys['arrowright'] || (joy.id !== null && Math.hypot(joy.vx, joy.vy) > .4)) input = true;
    if (myRide.queued){
      if (input){ leaveQueue(); toast('줄에서 나왔어요'); return; }
      me.moving = false; tryBoard(ts); if (myRide.queued) return;
    }
    if (ride.done(myRide.rec, ts, myRide.seat)){ getOff(ride, true); return; }
    seatAvatar(me, ride, myRide.seat); me.handsUp = rideHands(ride, ts);
    me.pos.copy(ride.entrance);
    if (input && now - myRide.warned > 4000){ myRide.warned = now; toast('운행 중이에요 · 끝나면 자동으로 내려요'); }
    return;
  }
  let kx = 0, kz = 0, spMul = 1;
  if (keys['w'] || keys['arrowup']) kz += 1; if (keys['s'] || keys['arrowdown']) kz -= 1; if (keys['a'] || keys['arrowleft']) kx -= 1; if (keys['d'] || keys['arrowright']) kx += 1;
  const jm = Math.hypot(joy.vx, joy.vy);
  if (joy.id !== null && jm > .15){ kx += joy.vx; kz -= joy.vy; spMul = Math.min(1, .35 + jm * .75); }
  let dir = null, fast = keys['shift'] ? 1.6 : 1;
  if ((kx || kz) && cam.mode === 'follow'){ standUp(); ctrl.target = null; ctrl.route = []; ctrl.pendingSeat = -1; ctrl.goRide = -1; fwd.set(-Math.sin(cam.theta), 0, -Math.cos(cam.theta)); right.set(-fwd.z, 0, fwd.x); dir = fwd.multiplyScalar(kz).add(right.multiplyScalar(kx)).normalize(); }
  else if (ctrl.target){ tmpV.subVectors(ctrl.target, me.pos); tmpV.y = 0; const d = tmpV.length();
    if (d < .15){ if (ctrl.route.length){ ctrl.target = ctrl.route.shift(); } else { ctrl.target = null; if (ctrl.pendingSeat >= 0){ sitAt(ctrl.pendingSeat); ctrl.pendingSeat = -1; } if (ctrl.goRide >= 0) joinQueue(ctrl.goRide); } }
    else { dir = tmpV.normalize(); if (ctrl.goRide >= 0 && d > 8) fast = 1.5; } }
  if (dir && me.seat < 0){
    const sp = 3.2 * dt * spMul * fast, ox = me.pos.x, oz = me.pos.z;
    let [nx, nz] = resolve(me.pos.x + dir.x * sp, me.pos.z + dir.z * sp);
    // raised platforms: you can step up/down stairs, but not climb or drop off a platform edge
    const oh = groundH(ox, oz), ok = (x, z) => Math.abs(groundH(x, z) - oh) <= .45;
    if (!ok(nx, nz)){ if (ok(nx, oz)) nz = oz; else if (ok(ox, nz)) nx = ox; else { nx = ox; nz = oz; } }
    if ((nx - ox) * dir.x + (nz - oz) * dir.z >= 0){ me.pos.x = nx; me.pos.z = nz; }
    me.pos.y = groundH(me.pos.x, me.pos.z); me.rot = Math.atan2(dir.x, dir.z);
    const real = Math.hypot(me.pos.x - ox, me.pos.z - oz);
    if (real < sp * .25){ ctrl.stuck += dt;
      if (ctrl.stuck > .5 && ctrl.target){
        if (ctrl.pendingSeat >= 0 && Math.hypot(ctrl.target.x - me.pos.x, ctrl.target.z - me.pos.z) < 1.4){ sitAt(ctrl.pendingSeat); ctrl.target = null; ctrl.pendingSeat = -1; }
        else if (ctrl.goRide >= 0){ // walked into something on the way: hop to the entrance
          const e = rideById(ctrl.goRide).entrance; me.pos.set(e.x, e.y, e.z); ripple(me.pos); ctrl.target = null; joinQueue(ctrl.goRide); }
        else { ctrl.target = null; ctrl.route = []; ctrl.pendingSeat = -1; }
        ctrl.stuck = 0; } }
    else ctrl.stuck = 0;
    me.moving = true; pushPresence();
  } else me.moving = false;
}
function frame(){
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime, now = performance.now(), ts = nowS();
  clockT -= dt; if (clockT <= 0){ clockT = 10; tickClock(); }
  if (envT < 1){ envT = Math.min(1, envT + dt / 2.5); applyEnv(envLerp(envFromS, envTo, smooth01(envT))); }

  // rides first, so seats are where they should be this frame
  for (const r of rides){ r.update(ts); r.root.updateMatrixWorld(true); }

  if (me){
    moveMe(dt, now, ts);
    settleSeatClash(ts);
    if (me.rideP && myRide.id < 0){ me.rideP = null; me.rideQ = null; }
    poseAvatar(me, dt, t);
    if (myRide.id >= 0 && !myRide.queued && now % 700 < 20) pushPresence();
    sendPresence(now);
  }
  // remote people
  for (const r of remotes.values()){
    const a = r.a, ride = r.rd >= 0 && r.rs >= 0 && !r.q ? rides[r.rd] : null;
    if (ride){ seatAvatar(a, ride, r.rs); a.handsUp = rideHands(ride, ts); }
    else { a.rideP = null; a.sit = r.seat >= 0; a.handsUp = false; const d = a.pos.distanceTo(r.tgt); if (d > 6) a.pos.copy(r.tgt); else if (d > 1e-3) a.pos.lerp(r.tgt, Math.min(1, (3.8 * dt) / d)); a.rot = r.rot; a.moving = !a.sit && (r.moving || d > .05); }
    poseAvatar(a, dt, t); a.g.visible = !r.first;
  }
  updateVendor(dt, t);

  // world motion
  fountain.tick(t); bunting.tick(t);
  gateFlags.forEach(f => { f.rotation.y = Math.sin(t * 2.2 + f.userData.wave) * .35; });
  balloonStand.balloons.forEach((b, i) => { b.position.x += Math.sin(t * 1.1 + i) * .0015; b.rotation.z = Math.sin(t * 1.3 + i) * .08; });
  clouds.forEach((c, i) => { c.position.x += dt * (1.2 + i * .05); if (c.position.x > 800) c.position.x = -800; });
  for (let i = fx.length - 1; i >= 0; i--){ const e = fx[i]; e.t += dt; const k = e.t / e.d;
    if (e.kind === 'ripple'){ e.m.scale.setScalar(1 + k * 3); e.m.material.opacity = .8 * (1 - k); }
    else if (e.kind === 'confetti'){ e.vy -= 4.5 * dt; e.m.position.x += e.vx * dt; e.m.position.y += e.vy * dt; e.m.position.z += e.vz * dt; e.m.rotation.x += e.sp * dt; e.m.rotation.y += e.sp * .7 * dt; e.m.material.opacity = 1 - k * k; }
    if (k >= 1){ scene.remove(e.m); e.m.geometry.dispose(); e.m.material.dispose(); fx.splice(i, 1); } }

  // camera
  const ride = me && myRide.id >= 0 && !myRide.queued ? rideById(myRide.id) : null;
  if (cam.mode === 'pov' && ride && rideSeatWorld(ride, myRide.seat, _cp, _cq)){
    _cu.set(0, 1, 0).applyQuaternion(_cq); _cf.set(0, 0, 1).applyQuaternion(_cq); _cs.crossVectors(_cf, _cu).normalize();
    // over-the-shoulder: just above and behind my own head (chibi heads are big, eye level would sit inside the next rider's hair)
    _cf.applyAxisAngle(_cu, cam.yaw); _cs.crossVectors(_cf, _cu).normalize(); _cf.applyAxisAngle(_cs, -cam.pitch - (ride.povPitch || .12));
    camera.position.copy(_cp).addScaledVector(_cu, ride.povUp || 1.7).addScaledVector(_cf, -(ride.povBack || 1.45));
    camera.up.copy(_cu); camera.lookAt(tmpV.copy(_cp).addScaledVector(_cu, 1.05).addScaledVector(_cf, 8));
  } else {
    if (cam.mode === 'pov') setCamMode('follow');
    camera.up.set(0, 1, 0);
    if (cam.mode === 'intro'){ cam.theta += dt * .05; cam.tgt.set(0, 6, -22); cam.dist += (78 - cam.dist) * dt; cam.phi += (.38 - cam.phi) * dt; }
    else if (me){ if (me.rideP){ cam.tgt.copy(me.rideP).y += 1.0; if (ride && ride.camPhiMax){ cam.phi = Math.min(cam.phi, ride.camPhiMax); cam.dist = Math.min(cam.dist, ride.camDistMax); } } else cam.tgt.set(me.pos.x, me.pos.y + 1.0, me.pos.z); }
    cam.target.lerp(cam.tgt, 1 - Math.exp(-dt * (cam.mode === 'intro' ? 1 : me && me.rideP ? 16 : 6)));
    const cp = Math.cos(cam.phi);
    camera.position.set(cam.target.x + Math.sin(cam.theta) * cp * cam.dist, cam.target.y + Math.sin(cam.phi) * cam.dist, cam.target.z + Math.cos(cam.theta) * cp * cam.dist);
    if (camera.position.y < .4) camera.position.y = .4;
    camera.lookAt(cam.target);
  }
  // shadows follow the camera target
  { const tg = cam.mode === 'intro' ? cam.tgt : cam.target; sun.target.position.set(Math.round(tg.x / 8) * 8, 0, Math.round(tg.z / 8) * 8 - 10); sun.position.copy(env.dir).multiplyScalar(160).add(sun.target.position); }

  // sound: wind while riding, rumble when the coaster passes nearby
  { const sp = ride ? ride.speedAt(ts) : 0, cp = coaster.seats[0]; cp.getWorldPosition(tmpV); const d = tmpV.distanceTo(camera.position), cs = coaster.speedAt(ts);
    soundTick(sp, clamp(cs / 18, 0, 1) * clamp(1 - d / 55, 0, 1)); }

  // ride info pill
  infoT -= dt; if (infoT <= 0 && me){ infoT = .25; const el = $('#rideInfo');
    if (myRide.id >= 0){ const r = rideById(myRide.id); let txt;
      if (myRide.queued) txt = `${r.emoji} ${r.name} 줄 · ${r.status(ts)}`;
      else { const v = r.speedAt(ts), pt = r.phaseText ? r.phaseText(ts) : ''; const st = r.kind === 'cycle' ? cycleAt(r, ts) : null;
        txt = `${r.emoji} ${r.name} · ` + (pt || (st && st.load ? `${Math.ceil(st.left)}초 뒤 출발` : v > 1.5 ? `시속 ${Math.round(v * 3.6)}km` : '운행 중')); }
      el.textContent = txt; el.hidden = false; } else el.hidden = true; }

  // name tags & bubbles
  if (entered){
    if (me) placeTag(me, me.g, 1.5 * me.L.size, me.g.visible, now);
    for (const r of remotes.values()) placeTag(r.a, r.a.g, 1.5 * r.a.L.size, r.a.g.visible, now);
    placeTag(vendor.a, vendor.a.g, 1.5 * vendor.a.L.size, true, now);
  }
  renderer.render(scene, camera);
  if (!entered && pv.r && pv.a){ pv.a.g.rotation.y = Math.sin(t * .6) * .7; pv.a.rot = pv.a.g.rotation.y; poseAvatar(pv.a, dt, t); pv.a.g.position.set(0, 0, 0); pv.r.render(pv.scene, pv.cam); }
  if (firstFrame){ firstFrame = false; const l = $('#loading'); l.style.opacity = 0; setTimeout(() => l.remove(), 900); }
}
const fitView = () => { scrollTo(0, 0); const w = innerWidth, h = innerHeight; camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h, false); };
addEventListener('resize', fitView); addEventListener('orientationchange', () => setTimeout(fitView, 250));
if (window.visualViewport) visualViewport.addEventListener('resize', fitView);

// debug hooks for automated checks (harmless in production)
window.__park = { skew(s){ clockSkew += s * 1000; }, cycleAt, walkTo: p => walkTo(new THREE.Vector3(p[0], p[1], p[2])), groundH, rides, get me(){ return me; }, myRide, remotes, goToRide, enter, nowS, cam, setCamMode, toast, get room(){ return room; } };

let started = false;
const startNow = () => { if (started) return; started = true; redrawFontTex(); tickClock(); applyEnv(envTo); envT = 1; frame(); };
const fontsReady = document.fonts && document.fonts.load ? Promise.race([Promise.all([document.fonts.load('700 40px "Jua"'), document.fonts.load('20px "Gowun Dodum"')]), new Promise(r => setTimeout(r, 1500))]) : Promise.resolve();
fontsReady.then(startNow, startNow);

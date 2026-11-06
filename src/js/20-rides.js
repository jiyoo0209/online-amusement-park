/* ---------- rides ----------
   Every ride is a pure function of the shared clock (nowS), so all screens agree on where every seat is.
   A ride exposes seat markers (Object3D) that riders sit on, plus boarding rules:
     open(t)        → seat indices you can board right now ([] when closed)
     rec(t, seat)   → a number saved with the boarding (cycle index or wheel pass)
     done(rec, t)   → true once that ride is over
     wait(t)        → seconds until the next chance to board
     status(t)      → short Korean status text for the menu
*/
const rides = [];
const G = 9.8;
function cycleAt(r, t){ const L = r.load + r.run, k = t + r.offset, c = Math.floor(k / L), u = k - c * L; return u < r.load ? { cyc: c, load: true, u, left: r.load - u } : { cyc: c, load: false, u: u - r.load, left: L - u }; }
function cycleRide(r){
  r.kind = 'cycle';
  r.open = t => { const s = cycleAt(r, t); return s.load && s.left > 1.2 ? r.seatIdx : []; };
  r.rec = t => cycleAt(r, t).cyc;
  r.done = (rec, t) => cycleAt(r, t).cyc !== rec;
  r.wait = t => { const s = cycleAt(r, t); return s.load ? 0 : s.left; };
  r.status = t => { const s = cycleAt(r, t); return s.load ? (s.left > 1.2 ? `탑승 중 · ${Math.ceil(s.left)}초 뒤 출발` : '곧 출발해요') : `운행 중 · ${Math.ceil(s.left)}초 뒤 탑승`; };
  r.npcKey = (seat, t) => cycleAt(r, t).cyc;
  return r;
}
function seatMarker(parent, x, y, z, rotY = 0){ const o = new THREE.Object3D(); o.position.set(x, y, z); o.rotation.y = rotY; parent.add(o); return o; }
function addRide(r){ r.index = rides.length; r.seatIdx = r.seats.map((_, i) => i); rides.push(r); act(r.root, { type: 'ride', id: r.index }); return r; }

/* 1. 회전목마 — carousel */
const carousel = (() => {
  const cx = -20, cz = 6, R = { load: 12, run: 32, offset: 3 };
  const root = grp(scene, cx, 0, cz);
  cyl(7.6, 7.8, .3, mat.stone, root, 0, 0, 0, 40);
  const spin = grp(root, 0, .3, 0);
  const deck = new THREE.MeshStandardMaterial({ map: canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#c9925c'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(90,50,20,.45)'; g.lineWidth = 3; for (let i = 0; i < 32; i++){ const a = i / 32 * TAU; g.beginPath(); g.moveTo(w / 2, h / 2); g.lineTo(w / 2 + Math.cos(a) * w, h / 2 + Math.sin(a) * h); g.stroke(); } for (let r = 40; r < 256; r += 44){ g.beginPath(); g.arc(w / 2, h / 2, r, 0, TAU); g.stroke(); } }), roughness: .7 });
  cyl(7.1, 7.1, .25, deck, spin, 0, 0, 0, 40);
  cyl(7.15, 7.15, .26, mat.gold, spin, 0, -.01, 0, 40, false).scale.set(1, .5, 1);
  // centre drum with mirrors
  const drum = new THREE.MeshStandardMaterial({ map: stripeTex('#f3e2b5', '#e2b456', 16), roughness: .35, metalness: .3 });
  cyl(1.5, 1.5, 4.2, drum, spin, 0, .25, 0, 24);
  for (let i = 0; i < 12; i++){ const a = i / 12 * TAU; const m = box(.5, 1.6, .05, mat.glass, spin, Math.cos(a) * 1.53, 1.4, Math.sin(a) * 1.53, false); m.rotation.y = -a + Math.PI / 2; }
  // canopy
  const top = grp(spin, 0, 4.45, 0);
  const canopy = new THREE.MeshStandardMaterial({ map: stripeTex('#d9473f', '#fff3dc', 24), roughness: .6, side: THREE.DoubleSide });
  const cone = mesh(new THREE.ConeGeometry(8.0, 2.8, 48, 1, true), canopy, top, 0, 1.6, 0); cone.castShadow = true;
  mesh(new THREE.CylinderGeometry(7.9, 7.9, .85, 48, 1, true), new THREE.MeshStandardMaterial({ map: stripeTex('#2f4a8a', '#f2c443', 48), roughness: .6, side: THREE.DoubleSide }), top, 0, -.1, 0, false);
  sph(.45, mat.gold, top, 0, 3.2, 0, 12); cyl(.04, .04, 1.2, mat.darkSteel, top, 0, 3.3, 0, 4);
  const flag = mesh(new THREE.PlaneGeometry(.9, .5), new THREE.MeshStandardMaterial({ color: C('#f2c443'), side: THREE.DoubleSide }), top, .45, 4.25, 0, false);
  const bulbs = []; for (let i = 0; i < 40; i++){ const a = i / 40 * TAU; bulbs.push(sph(.09, i % 2 ? mat.bulb : mat.bulbPink, top, Math.cos(a) * 7.95, -.6, Math.sin(a) * 7.95, 6)); }
  // horses
  const horseCols = ['#f6f1e8', '#f5d7a1', '#c9a27e', '#f2c6d6', '#b9d7f0', '#5b4636'];
  const saddleCols = ['#d9473f', '#3f7fc9', '#8a6cc9', '#3aa3a0', '#ef8a3c', '#e2b456'];
  const bodyG = new THREE.SphereGeometry(.42, 16, 12); bodyG.scale(.8, .75, 1.55);
  const neckG = new THREE.CylinderGeometry(.16, .24, .75, 10); const headG = new THREE.BoxGeometry(.3, .32, .62); const legG = new THREE.CylinderGeometry(.06, .05, .7, 6);
  const horses = [], seats = [];
  const place = (n, r, off) => { for (let i = 0; i < n; i++){ const a = i / n * TAU + off; horses.push({ a, r }); } };
  place(10, 5.4, 0); place(6, 3.4, .3);
  horses.forEach((h, i) => {
    const px = Math.cos(h.a) * h.r, pz = Math.sin(h.a) * h.r, head = Math.atan2(Math.sin(h.a), -Math.cos(h.a));
    cyl(.045, .045, 4.2, mat.gold, spin, px, .25, pz, 8, false);
    const hg = grp(spin, px, 1.0, pz, head); h.g = hg; h.ph = i * 1.7;
    const bm = M(horseCols[i % horseCols.length], { roughness: .45 }), sm = M(saddleCols[i % saddleCols.length], { roughness: .5 });
    mesh(bodyG, bm, hg, 0, 0, 0); const nk = mesh(neckG, bm, hg, 0, .35, .48); nk.rotation.x = .55;
    const hd = mesh(headG, bm, hg, 0, .68, .72); hd.rotation.x = .55;
    const mane = mesh(new THREE.BoxGeometry(.06, .5, .25), sm, hg, 0, .55, .42); mane.rotation.x = .55;
    [[-.16, .38, -.9], [.16, .38, -.75], [-.16, -.35, .9], [.16, -.35, .7]].forEach(([x, z, r]) => { const l = mesh(legG, bm, hg, x, -.42, z); l.rotation.x = r; });
    const tail = mesh(new THREE.ConeGeometry(.1, .6, 6), sm, hg, 0, .05, -.72); tail.rotation.x = -2.3;
    box(.62, .1, .55, sm, hg, 0, .3, -.05); box(.05, .3, .05, mat.gold, hg, 0, .4, .2);
    h.seat = seatMarker(hg, 0, .38, -.08); seats.push(h.seat);
  });
  obC(cx, cz, 8.1);
  const r = cycleRide(Object.assign(R, { id: 'carousel', name: '회전목마', emoji: '🎠', desc: '천천히 돌아가는 목마', root, seats,
    entrance: V(cx + 9.0, 0, cz + 1.5), exit: V(cx + 9.2, 0, cz - 2.6), board: V(cx + 7.3, .55, cz + 1.2), camDist: 7, pov: true, density: .45, camPhiMax: .16, camDistMax: 7.5 }));
  const W = TAU / 9, ramp = 4;
  const angleAt = t => { const s = cycleAt(r, t), per = W * (r.run - ramp); let a = s.cyc * per;
    if (!s.load){ const u = s.u, d = r.run - u; if (u < ramp) a += W * u * u / (2 * ramp); else if (d < ramp) a += per - W * d * d / (2 * ramp); else a += W * ramp / 2 + W * (u - ramp); }
    return a; };
  r.speedAt = t => { const s = cycleAt(r, t); if (s.load) return 0; const k = Math.min(1, s.u / ramp, (r.run - s.u) / ramp); return W * k * 5.4; };
  r.update = t => { const a = angleAt(t); spin.rotation.y = a % TAU; horses.forEach(h => { h.g.position.y = 1.0 + .28 * Math.sin(a * 3 + h.ph); h.g.rotation.x = .06 * Math.cos(a * 3 + h.ph); }); flag.rotation.y = Math.sin(t * 2) * .3; };
  return addRide(r);
})();

/* 2. 바이킹 — pirate ship */
const viking = (() => {
  const cx = 24, cz = 4, PIV = 12.2, ARM = 8.6, R = { load: 12, run: 40, offset: 9 };
  const root = grp(scene, cx, 0, cz);
  const frame = M('#3f7fc9', { roughness: .45, metalness: .3 });
  for (const sz of [-4.6, 4.6]){ for (const sx of [-1, 1]) beam(V(sx * 7.2, 0, sz), V(0, PIV, sz * .55), .32, frame, root, 10); beam(V(-3.6, PIV / 2, sz * .78), V(3.6, PIV / 2, sz * .78), .18, frame, root, 8); }
  const axle = mesh(new THREE.CylinderGeometry(.42, .42, 5.6, 16), mat.steel, root, 0, PIV, 0); axle.rotation.x = Math.PI / 2;
  [[-7.2, -4.6], [7.2, -4.6], [-7.2, 4.6], [7.2, 4.6]].forEach(([x, z]) => { cyl(.7, .8, .4, mat.concrete, root, x, 0, z, 10); obC(cx + x, cz + z, .9); });
  const swing = grp(root, 0, PIV, 0);
  // arms
  for (const sz of [-1.9, 1.9]) for (const sx of [-1, 1]) beam(V(0, 0, sz), V(sx * 3.4, -ARM + .6, sz), .22, mat.steel, swing, 8);
  const boat = grp(swing, 0, -ARM, 0);
  const sh = new THREE.Shape(); sh.moveTo(-6.6, 2.6); sh.quadraticCurveTo(-5.6, -.4, -2.8, -.9); sh.quadraticCurveTo(0, -1.25, 2.8, -.9); sh.quadraticCurveTo(5.6, -.4, 6.6, 2.6);
  sh.lineTo(6.1, 2.6); sh.quadraticCurveTo(5.1, .3, 2.6, .25); sh.lineTo(-2.6, .25); sh.quadraticCurveTo(-5.1, .3, -6.1, 2.6); sh.closePath();
  const hullTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#a8302e'; g.fillRect(0, 0, w, h); g.fillStyle = '#f2c443'; g.fillRect(0, h * .3, w, h * .06); g.fillRect(0, h * .42, w, h * .03); g.fillStyle = '#6b2420'; for (let i = 0; i < 10; i++) g.fillRect(0, h * (.6 + i * .04), w, 2); });
  hullTex.wrapS = hullTex.wrapT = THREE.RepeatWrapping; hullTex.repeat.set(.12, .3); hullTex.offset.set(0, .25);
  const hullG = new THREE.ExtrudeGeometry(sh, { depth: 4.4, bevelEnabled: true, bevelThickness: .12, bevelSize: .1, bevelSegments: 2, curveSegments: 18 }); hullG.translate(0, 0, -2.2);
  const hull = mesh(hullG, new THREE.MeshStandardMaterial({ map: hullTex, roughness: .55 }), boat, 0, 0, 0);
  box(5.4, .12, 4.3, mat.wood, boat, 0, .2, 0);
  // figurehead (dragon) and tail
  const dragon = grp(boat, 6.5, 2.6, 0);
  const dm = M('#3aa3a0', { roughness: .5 }); const nk = mesh(new THREE.CylinderGeometry(.28, .45, 1.8, 10), dm, dragon, .4, .7, 0); nk.rotation.z = -.5;
  const hd = mesh(new THREE.SphereGeometry(.55, 12, 10), dm, dragon, .95, 1.6, 0); hd.scale.set(1.4, .8, .8);
  [-.25, .25].forEach(z => { sph(.1, mat.yellow, dragon, 1.35, 1.75, z, 8); const h2 = mesh(new THREE.ConeGeometry(.08, .5, 6), mat.cream, dragon, .7, 2.05, z); h2.rotation.z = .5; });
  const tl = mesh(new THREE.TorusGeometry(.7, .22, 8, 16, Math.PI * 1.4), dm, boat, -6.4, 3.0, 0); tl.rotation.z = 1.2;
  // mast + sail
  cyl(.12, .14, 4.4, mat.woodDark, boat, 0, .2, 0, 8);
  const sail = mesh(new THREE.PlaneGeometry(3.2, 2.4, 8, 4), new THREE.MeshStandardMaterial({ map: stripeTex('#fff6e6', '#d9473f', 6), side: THREE.DoubleSide, roughness: .8 }), boat, 0, 3.1, 0, false); sail.rotation.y = Math.PI / 2;
  // benches: riders face the middle of the ship
  const seats = [];
  const rows = [-4.5, -3.1, -1.7, 1.7, 3.1, 4.5];
  rows.forEach(x => { const lift = Math.max(0, Math.abs(x) - 2.6) * .35, y = .26 + lift;
    box(.5, .45 + lift, 4.0, mat.woodDark, boat, x, .2, 0); box(.08, .5, 4.0, mat.yellow, boat, x + (x < 0 ? -.25 : .25), .65 + lift, 0);
    for (const z of [-1.35, 0, 1.35]) seats.push(seatMarker(boat, x, y + .45, z, x < 0 ? Math.PI / 2 : -Math.PI / 2)); });
  // boarding platform (top 3.0 m) + walkable stairs on the south side
  box(8.4, .3, 1.6, mat.concrete, root, 0, 2.7, 3.2);
  for (const [x0, x1] of [[-4.2, -1.05], [1.05, 4.2]]) box(x1 - x0, .9, .06, mat.white, root, (x0 + x1) / 2, 3.0, 3.97, false);
  for (const sx of [-3.9, 3.9]) cyl(.18, .18, 2.7, mat.steel, root, sx, 0, 3.2, 8);
  for (let k = 0; k < 10; k++) box(2.0, .3 * (k + 1), .4, mat.concrete, root, 0, 0, 8.0 - .4 * k - .2);
  for (const sx of [-1.02, 1.02]) beam(V(sx, 1.0, 8.0), V(sx, 3.9, 4.0), .04, mat.steel, root, 5, false);
  surf(cx - 4.2, cx + 4.2, cz + 2.4, cz + 4.0, 3.0);
  surf(cx - 1.0, cx + 1.0, cz + 4.0, cz + 8.0, (x, z) => clamp((cz + 8.0 - z) / 4.0, 0, 1) * 3.0);
  AREAS.push({ x0: cx - 4.2, x1: cx + 4.2, z0: cz + 2.4, z1: cz + 8.0, top: V(cx, 3.0, cz + 3.6), bottom: V(cx, 0, cz + 8.6) });
  obR(cx - 7.6, cx + 7.6, cz - 2.8, cz + 2.35);
  const r = cycleRide(Object.assign(R, { id: 'viking', name: '바이킹', emoji: '🏴‍☠️', desc: '하늘 끝까지 흔들리는 배', root, seats,
    entrance: V(cx - 1.6, 3.0, cz + 3.3), exit: V(cx + 2.6, 3.0, cz + 3.3), board: V(cx, 3.2, cz + 1.0), camDist: 16, pov: true, density: .5 }));
  const AMAX = 1.25, T = 6.4;
  const angleAt = t => { const s = cycleAt(r, t); if (s.load) return 0; const u = s.u, env = smooth01(u / 15) * smooth01((r.run - 1.5 - u) / 11); return AMAX * env * Math.sin(TAU * u / T); };
  r.speedAt = t => Math.abs(angleAt(t + .05) - angleAt(t - .05)) / .1 * ARM;
  r.update = t => { swing.rotation.z = angleAt(t); sail.rotation.x = Math.sin(t * 1.3) * .05; };
  return addRide(r);
})();

/* 3. 대관람차 — Ferris wheel (always turning; board a gondola as it reaches the bottom, ride one full turn) */
const wheel = (() => {
  const cx = -28, cz = -24, HUB = 15.6, RAD = 12.4, N = 12, P = 72, WIN = 1.4 / 72;
  const root = grp(scene, cx, 0, cz);
  const frame = M('#f6f1e8', { roughness: .4, metalness: .2 });
  for (const sz of [-2.6, 2.6]) for (const sx of [-1, 1]){ beam(V(sx * 8.8, 0, sz * 1.15), V(0, HUB, sz * .62), .34, frame, root, 10); cyl(.7, .8, .4, mat.concrete, root, sx * 8.8, 0, sz * 1.15, 10); obC(cx + sx * 8.8, cz + sz * 1.15, .9); }
  const ax = mesh(new THREE.CylinderGeometry(.55, .55, 3.6, 16), mat.steel, root, 0, HUB, 0); ax.rotation.x = Math.PI / 2;
  const spin = grp(root, 0, HUB, 0);
  const rimM = M('#e85d75', { roughness: .4, metalness: .2 });
  for (const sz of [-1.2, 1.2]){ mesh(new THREE.TorusGeometry(RAD, .2, 8, 96), rimM, spin, 0, 0, sz); mesh(new THREE.TorusGeometry(RAD * .55, .12, 6, 64), frame, spin, 0, 0, sz, false);
    for (let i = 0; i < N * 2; i++){ const a = i / (N * 2) * TAU; beam(V(0, 0, sz * .5), V(Math.cos(a) * RAD, Math.sin(a) * RAD, sz), .07, frame, spin, 5, false); } }
  for (let i = 0; i < N; i++){ const a = i / N * TAU; beam(V(Math.cos(a) * RAD, Math.sin(a) * RAD, -1.3), V(Math.cos(a) * RAD, Math.sin(a) * RAD, 1.3), .1, mat.steel, spin, 6, false); }
  mesh(new THREE.CylinderGeometry(1.4, 1.4, 1.2, 20), mat.gold, spin, 0, 0, 0).rotation.x = Math.PI / 2;
  { const cols = [mat.bulb, mat.bulbPink, mat.bulbBlue], bg = new THREE.SphereGeometry(.12, 6, 4), m4 = new THREE.Matrix4();
    cols.forEach((m, ci) => { const pts = []; for (const sz of [-1.45, 1.45]) for (let i = 0; i < 72; i++) if (i % 3 === ci){ const a = i / 72 * TAU; pts.push([Math.cos(a) * RAD, Math.sin(a) * RAD, sz]); }
      const im = new THREE.InstancedMesh(bg, m, pts.length); pts.forEach(([x, y, z], i) => { m4.makeTranslation(x, y, z); im.setMatrixAt(i, m4); }); spin.add(im); }); }
  // gondolas stay upright, so they hang in root space
  const gcols = ['#ff6b6b', '#ffd166', '#4dabf7', '#63e6be', '#b197fc', '#ff8fd0'];
  const cabins = [], seats = [];
  for (let k = 0; k < N; k++){
    const g = grp(root); const body = grp(g, 0, -1.1, 0); const cm = M(gcols[k % gcols.length], { roughness: .45 });
    cyl(.05, .05, 1.1, mat.steel, g, 0, -1.1, 0, 5, false);
    cyl(1.05, .95, .85, cm, body, 0, -1.45, 0, 16); mesh(new THREE.CylinderGeometry(1.05, 1.05, .95, 16, 1, true), mat.glass, body, 0, -.12, 0, false);
    for (let i = 0; i < 6; i++){ const a = i / 6 * TAU; cyl(.04, .04, .95, cm, body, Math.cos(a) * 1.03, -.6, Math.sin(a) * 1.03, 4, false); }
    const roof = mesh(new THREE.SphereGeometry(1.08, 16, 8, 0, TAU, 0, Math.PI / 2), cm, body, 0, .35, 0); roof.scale.y = .55;
    box(.55, .42, 1.4, mat.cream, body, -.55, -1.45, 0, false); box(.55, .42, 1.4, mat.cream, body, .55, -1.45, 0, false);
    seats.push(seatMarker(body, -.5, -1.05, .25, Math.PI / 2), seatMarker(body, .5, -1.05, -.25, -Math.PI / 2));
    cabins.push({ g, body });
  }
  // boarding deck
  box(5.6, .32, 4.2, mat.concrete, root, 0, 0, 0); box(1.8, .2, 1.8, mat.concrete, root, 0, 0, 2.9);
  obR(cx - 2.2, cx + 2.2, cz - 2.2, cz + 1.6);
  const phi = (k, t) => { const v = t / P + k / N; return v - Math.floor(v); };
  const r = addRide({ id: 'wheel', kind: 'wheel', name: '대관람차', emoji: '🎡', desc: '공원 전체가 한눈에 보이는 관람차', root, seats,
    entrance: V(cx + 1.6, 0, cz + 5.6), exit: V(cx - 2.4, 0, cz + 5.4), board: V(cx, .4, cz + 2.4), camDist: 14, pov: false, density: .3, period: P });
  const atBottom = t => { for (let k = 0; k < N; k++){ const f = phi(k, t); if (f < WIN * .6 || f > 1 - WIN) return k; } return -1; };
  r.open = t => { const k = atBottom(t); return k < 0 ? [] : [k * 2, k * 2 + 1]; };
  r.rec = (t, seat) => Math.round(t / P + (seat >> 1) / N);
  r.done = (rec, t, seat) => t / P + (seat >> 1) / N - rec > 1 - WIN * .5;
  r.wait = t => { let best = 1e9; for (let k = 0; k < N; k++){ const f = phi(k, t); best = Math.min(best, (1 - WIN - f + (f > 1 - WIN ? 1 : 0)) * P); } return atBottom(t) >= 0 ? 0 : best; };
  r.status = t => atBottom(t) >= 0 ? '곤돌라 도착 · 지금 탈 수 있어요' : `다음 곤돌라 ${Math.ceil(r.wait(t))}초 뒤`;
  r.npcKey = (seat, t) => Math.round(t / P + (seat >> 1) / N - .5 + WIN);
  r.speedAt = () => RAD * TAU / P;
  r.update = t => { spin.rotation.z = (t / P % 1) * TAU;
    cabins.forEach((c, k) => { const a = -Math.PI / 2 + phi(k, t) * TAU; c.g.position.set(Math.cos(a) * RAD, HUB + Math.sin(a) * RAD, 0); c.body.rotation.z = Math.sin(t * .9 + k) * .035; }); };
  return r;
})();

/* 4. 자이로드롭 — drop tower */
const drop = (() => {
  const cx = 26, cz = -22, TOP = 37.5, LOW = .65, R = { load: 10, run: 30, offset: 17 };
  const root = grp(scene, cx, 0, cz);
  const towerTex = canvasTex(64, 512, (g, w, h) => { for (let i = 0; i < 11; i++){ g.fillStyle = i % 2 ? '#f6f1e8' : '#3f7fc9'; g.fillRect(0, i * h / 11, w, h / 11 + 1); } g.fillStyle = 'rgba(0,0,0,.12)'; for (let i = 0; i < 4; i++) g.fillRect(i * 16 + 6, 0, 3, h); });
  cyl(3.0, 3.3, .6, mat.concrete, root, 0, 0, 0, 24); cyl(1.15, 1.35, 44, new THREE.MeshStandardMaterial({ map: towerTex, roughness: .5 }), root, 0, .6, 0, 20);
  cyl(2.0, 1.4, 1.6, mat.navy, root, 0, 44.4, 0, 20); mesh(new THREE.ConeGeometry(.9, 3.2, 12), mat.red, root, 0, 47.6, 0); sph(.35, mat.bulbRed, root, 0, 49.3, 0, 8);
  for (let i = 0; i < 20; i++){ const a = i / 20 * TAU; sph(.13, i % 2 ? mat.bulb : mat.bulbBlue, root, Math.cos(a) * 2.02, 45.2, Math.sin(a) * 2.02, 6); }
  for (let i = 0; i < 44; i += 2){ const a = i * .9; sph(.07, mat.bulb, root, Math.cos(a) * 1.25, 1.5 + i, Math.sin(a) * 1.25, 4); }
  const car = grp(root, 0, LOW, 0);
  mesh(new THREE.CylinderGeometry(2.1, 2.1, .8, 28, 1, true), M('#f2c443', { roughness: .45, side: THREE.DoubleSide }), car, 0, .4, 0); cyl(1.9, 1.9, .2, mat.navy, car, 0, .1, 0, 28);
  cyl(2.15, 2.15, .12, mat.gold, car, 0, .82, 0, 28, false);
  const seats = [], NS = 10;
  for (let i = 0; i < NS; i++){ const a = i / NS * TAU, ry = Math.atan2(Math.cos(a), Math.sin(a)), x = Math.cos(a) * 2.45, z = Math.sin(a) * 2.45;
    const sg = grp(car, x, 0, z, ry); box(.6, .1, .55, mat.red, sg, 0, .5, 0); box(.6, 1.3, .12, mat.red, sg, 0, .5, -.3); const harness = mesh(new THREE.TorusGeometry(.26, .05, 6, 12, Math.PI), mat.darkSteel, sg, 0, 1.45, -.08); harness.rotation.x = .2;
    seats.push(seatMarker(sg, 0, .6, .02)); }
  obC(cx, cz, 3.6);
  const r = cycleRide(Object.assign(R, { id: 'drop', name: '자이로드롭', emoji: '🗼', desc: '40m 꼭대기에서 수직 낙하', root, seats,
    entrance: V(cx + 1.4, 0, cz + 6.3), exit: V(cx - 2.6, 0, cz + 6.1), board: V(cx, .3, cz + 3.4), camDist: 12, pov: true, density: .5, povUp: 1.85, povBack: .7, povPitch: .3 }));
  const tf = Math.sqrt(2 * (TOP - 12) / G), vf = G * tf, ab = vf * vf / (2 * (12 - 1.6)), tb = vf / ab;
  const yAt = u => {
    if (u < 2) return LOW;
    if (u < 20) return LOW + (TOP - LOW) * smooth01((u - 2) / 18);
    if (u < 24) return TOP;
    let k = u - 24; if (k < tf) return TOP - .5 * G * k * k;
    k -= tf; if (k < tb) return 12 - (vf * k - .5 * ab * k * k);
    k -= tb; return 1.6 - (1.6 - LOW) * smooth01(k / 2.2);
  };
  const state = t => { const s = cycleAt(r, t); return s.load ? { y: LOW, rot: 0 } : { y: yAt(s.u), rot: smooth01((s.u - 2) / 18) * TAU }; };
  r.speedAt = t => Math.abs(state(t + .04).y - state(t - .04).y) / .08;
  r.update = t => { const s = state(t); car.position.y = s.y; car.rotation.y = s.rot; };
  r.phaseText = t => { const s = cycleAt(r, t); if (s.load) return ''; const u = s.u; return u > 20 && u < 24 ? '두근두근… 곧 떨어져요!' : ''; };
  return addRide(r);
})();

/* 5. 롤러코스터 — roller coaster */
const coaster = (() => {
  const CTRL = [[-11, 1.6, -30], [-2, 1.6, -30], [6, 1.6, -30], [12.5, 1.8, -31.8], [16.2, 2.4, -37], [16.6, 4.6, -43], [16.6, 15.6, -57.5], [16.4, 26.4, -71.5],
    [14.8, 28, -78], [9.5, 27.4, -82.6], [3, 22, -84.2], [-4.5, 4.2, -84.2], [-11.5, 2.6, -83], [-19.5, 14.5, -80], [-27, 4.2, -76.5], [-35, 6.2, -70],
    [-38.5, 9.2, -60], [-37.2, 13.6, -50.5], [-33, 6.2, -41.5], [-25.5, 3.2, -36.2], [-17.5, 2.0, -32]].map(([x, y, z]) => V(x, y, z));
  const curve = new THREE.CatmullRomCurve3(CTRL, true, 'centripetal');
  const LEN = curve.getLength(), N = Math.ceil(LEN / .5), ds = LEN / N;
  const P = curve.getSpacedPoints(N); P.pop();
  // the station stop: where the front of the train halts
  let s0 = 0; { let best = 1e9; P.forEach((p, i) => { const d = Math.hypot(p.x - 6.6, p.z + 30); if (d < best){ best = d; s0 = i; } }); }
  const idx = s => ((Math.round(s / ds) % N) + N) % N;
  const at = s => { const f = (((s / ds) % N) + N) % N, i = Math.floor(f), j = (i + 1) % N, k = f - i; return { i, j, k }; };
  // tangents
  const T = P.map((p, i) => P[(i + 1) % N].clone().sub(P[(i - 1 + N) % N]).normalize());
  // speed along the lap, measured from the station stop
  let crest = 0; P.forEach((p, i) => { if (p.y > P[crest].y) crest = i; });
  const liftStart = (() => { let i = crest; while (P[(i - 1 + N) % N].y < P[i].y - .02 && P[(i - 1 + N) % N].y > 3.5) i = (i - 1 + N) % N; return i; })();
  const lap = i => ((i - s0) % N + N) % N; // distance in samples from the station
  const VL = 3.6, KF = .32, AB = 4.2, VEND = .9;
  const vel = new Float32Array(N + 1);
  for (let n = 0; n <= N; n++){
    const i = (s0 + n) % N, s = n * ds, toEnd = LEN - s;
    let v;
    if (n <= lap(liftStart)) v = Math.min(VL, .7 + Math.sqrt(2 * 1.2 * s));
    else if (n <= lap(crest)) v = VL;
    else { const sc = lap(crest) * ds; v = Math.sqrt(Math.max(.5, VL * VL + 2 * G * (P[crest].y - P[i].y) - 2 * KF * (s - sc))); }
    v = Math.min(v, Math.sqrt(VEND * VEND + 2 * AB * Math.max(0, toEnd - 1.5)) + (toEnd < 1.5 ? 0 : 0));
    if (toEnd < 1.5) v = Math.max(.35, VEND * toEnd / 1.5);
    vel[n] = Math.max(.35, v);
  }
  const tim = new Float32Array(N + 1); for (let n = 1; n <= N; n++) tim[n] = tim[n - 1] + ds * 2 / (vel[n - 1] + vel[n]);
  const RUN = Math.ceil(tim[N]) + 1;
  // banking from horizontal curvature and speed, smoothed
  const bank = new Float32Array(N);
  for (let i = 0; i < N; i++){ const a = T[(i - 3 + N) % N], b = T[(i + 3) % N]; const h1 = Math.atan2(a.x, a.z), h2 = Math.atan2(b.x, b.z); let dh = h2 - h1; dh = ((dh + Math.PI) % TAU + TAU) % TAU - Math.PI;
    const k = dh / (6 * ds), v = vel[lap(i)]; bank[i] = clamp(Math.atan(v * v * k / G) * .85, -1.05, 1.05); }
  const bs = new Float32Array(N); for (let i = 0; i < N; i++){ let s = 0; for (let d = -10; d <= 10; d++) s += bank[(i + d + N) % N]; bs[i] = s / 21; }
  const U = [], X = [];
  for (let i = 0; i < N; i++){ const t = T[i]; const u = _up.clone().addScaledVector(t, -t.y).normalize(); u.applyAxisAngle(t, -bs[i]); U.push(u); X.push(u.clone().cross(t).normalize()); }

  const root = grp(scene);
  // rails, spine, ties
  const railCurve = off => new THREE.CatmullRomCurve3(P.filter((_, i) => i % 2 === 0).map((p, ii) => { const i = ii * 2; return p.clone().addScaledVector(X[i], off.x).addScaledVector(U[i], off.y); }), true);
  const segs = Math.floor(N / 2);
  const railM = M('#e8edf2', { roughness: .3, metalness: .6 }), spineM = M('#ef6a3a', { roughness: .45, metalness: .3 });
  [[-.55, 0], [.55, 0]].forEach(([x, y]) => mesh(new THREE.TubeGeometry(railCurve({ x, y }), segs, .09, 6, true), railM, root, 0, 0, 0));
  mesh(new THREE.TubeGeometry(railCurve({ x: 0, y: -.42 }), segs, .2, 8, true), spineM, root, 0, 0, 0);
  { const tie = new THREE.BoxGeometry(1.25, .1, .22), n = Math.floor(N / 3), im = new THREE.InstancedMesh(tie, M('#c84c2c', { roughness: .6 }), n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), one = V(1, 1, 1);
    for (let k = 0; k < n; k++){ const i = k * 3; m4.makeBasis(X[i], U[i], T[i]); q.setFromRotationMatrix(m4); m4.compose(P[i].clone().addScaledVector(U[i], -.2), q, one); im.setMatrixAt(k, m4); } im.castShadow = true; root.add(im); }
  // supports
  const near = []; P.forEach((p, i) => { if (i % 6 === 0) near.push([p.x, p.z, p.y]); });
  { const pts = []; for (let i = 0; i < N; i += 10){ const p = P[i]; if (p.y < 2.4 || (p.x > -12 && p.x < 9 && p.z > -33 && p.z < -27)) continue; pts.push(p); }
    const cg = new THREE.CylinderGeometry(.16, .2, 1, 8); cg.translate(0, .5, 0);
    const im = new THREE.InstancedMesh(cg, M('#3aa3a0', { roughness: .5, metalness: .2 }), pts.length), m4 = new THREE.Matrix4();
    pts.forEach((p, k) => { m4.makeScale(1, p.y - .55, 1).setPosition(p.x, 0, p.z); im.setMatrixAt(k, m4); obC(p.x, p.z, .4); });
    im.castShadow = true; root.add(im);
    const fg = new THREE.CylinderGeometry(.45, .5, .3, 8); const fm = new THREE.InstancedMesh(fg, mat.concrete, pts.length); pts.forEach((p, k) => { m4.makeTranslation(p.x, .15, p.z); fm.setMatrixAt(k, m4); }); root.add(fm); }
  // low track is a barrier
  for (let i = 0; i < N; i += 3){ const p = P[i]; if (p.y < 2.6 && !(p.x > -12.5 && p.x < 10.5 && p.z > -33 && p.z < -26)) obC(p.x, p.z, .95); }
  // station
  { const st = grp(root, -1, 0, -30);
    box(21, 1.35, 2.6, mat.concrete, st, -.5, 0, 2.7); box(21, .08, .08, mat.yellow, st, -.5, 1.36, 1.45, false);
    // walkable stairs up to the platform (top 1.35 m), between the roof posts
    for (let k = 0; k < 5; k++) box(2.2, .27 * (k + 1), .49, mat.concrete, st, 4, 0, 6.4 - .49 * k - .245);
    for (const x of [-10, -4, 2, 8]) for (const z of [-2.4, 3.8]){ cyl(.14, .14, 4.8, mat.navy, st, x, 0, z, 8); obC(x - 1, z - 30, .3); }
    const roof = box(22, .3, 7.2, mat.red, st, -.5, 4.8, .7); roof.castShadow = true;
    const sign = textTex([['롤러코스터', 130, '#fff6d8', .52]], { bg: '#2f4a8a', border: '#f2c443', w: 1024, h: 256, r: 60 });
    const sm = new THREE.MeshStandardMaterial({ map: sign, emissive: C('#ffffff'), emissiveMap: sign, emissiveIntensity: .2 }); glow.push({ mat: sm, base: .2, night: .9 });
    const s1 = mesh(new THREE.PlaneGeometry(6, 1.5), sm, st, 1, 5.9, 4.32); signMeshes.push(s1);
    box(6.2, 1.6, .1, mat.navy, st, 1, 5.1, 4.26);
    surf(-12, 9, -28.65, -26.05, 1.35);
    surf(1.9, 4.1, -26.05, -23.6, (x, z) => clamp((-23.6 - z) / 2.45, 0, 1) * 1.35);
    AREAS.push({ x0: -12, x1: 9, z0: -28.65, z1: -23.6, top: V(3, 1.35, -26.4), bottom: V(3, 0, -23.1) });
    obR(-12.5, 10.5, -32.8, -28.7); }
  // train: 4 red racer cars × 4 seats (models in 15-coaster-car.js)
  const CARS = 4, GAP = 2.55, cars = [], seats = [];
  for (let c = 0; c < CARS; c++){
    const g = grp(root), b = buildCoasterCar(c, CARS); g.add(b.group);
    b.seats.forEach(p => seats.push(seatMarker(g, p.x, p.y, p.z)));
    cars.push(g);
  }
  const R = { load: 14, run: RUN, offset: 0 };
  const r = cycleRide(Object.assign(R, { id: 'coaster', name: '롤러코스터', emoji: '🎢', desc: `길이 ${Math.round(LEN)}m · 최고 ${Math.round(P[crest].y)}m 높이`, root, seats,
    entrance: V(1.2, 1.35, -27.4), exit: V(6.2, 1.35, -27.4), board: V(1.2, 1.4, -29.5), camDist: 12, pov: true, density: .5, povUp: 1.95, povBack: 1.5 }));
  // where the front car is (distance along the track from the station stop) at time t
  const frontAt = t => { const s = cycleAt(r, t); if (s.load) return 0; const u = Math.min(s.u, tim[N]); let lo = 0, hi = N; while (hi - lo > 1){ const m = (lo + hi) >> 1; if (tim[m] <= u) lo = m; else hi = m; } const k = (u - tim[lo]) / Math.max(1e-4, tim[hi] - tim[lo]); return (lo + k) * ds; };
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), tmpX = V(0, 0, 0), tmpU = V(0, 0, 0), tmpT = V(0, 0, 0), tmpP = V(0, 0, 0), one = V(1, 1, 1);
  const frameAt = s => { const { i, j, k } = at(s); tmpP.lerpVectors(P[i], P[j], k); tmpT.lerpVectors(T[i], T[j], k).normalize(); tmpU.lerpVectors(U[i], U[j], k).normalize(); tmpX.crossVectors(tmpU, tmpT).normalize(); tmpU.crossVectors(tmpT, tmpX).normalize(); };
  r.speedAt = t => { const s = cycleAt(r, t); if (s.load) return 0; const f = frontAt(t) / ds; return vel[Math.min(N, Math.round(f))]; };
  r.update = t => { const f = frontAt(t) + s0 * ds;
    cars.forEach((g, c) => { frameAt(f - 1.25 - c * GAP); m4.makeBasis(tmpX, tmpU, tmpT); q.setFromRotationMatrix(m4); g.position.copy(tmpP).addScaledVector(tmpU, .3); g.quaternion.copy(q); }); };
  r.phaseText = t => { const s = cycleAt(r, t); if (s.load) return ''; const n = Math.round(frontAt(t) / ds); return n > lap(liftStart) - 8 && n < lap(crest) ? '철컥철컥… 올라가는 중' : ''; };
  r.stats = { LEN, RUN, top: P[crest].y, vmax: Math.max(...vel) };
  window.__coaster = r.stats;
  r.near = (x, z, rad) => near.some(([px, pz]) => Math.hypot(x - px, z - pz) < rad);
  return addRide(r);
})();
function coasterNear(x, z, r){ return coaster.near(x, z, r); }
plantTrees();

// ride lookups shared by player, network and NPCs
const rideById = id => rides[id] || null;
function rideSeatWorld(ride, seat, pos, quat){ const m = ride.seats[seat]; if (!m) return false; m.matrixWorld.decompose(pos, quat, _sc); return true; }
const _sc = V(1, 1, 1);

/* ---------- world: sky, light, ground, plaza, gate, trees, lamps ---------- */
// Layout (metres): gate on the south edge (z ≈ 34), round plaza with a fountain in the middle (0, 10),
// rides around it, roller coaster along the back (north).
const PLAZA = { x: 0, z: 10, r: 14 };
const BOUNDS = { x0: -60, x1: 60, z0: -93, z1: 33.5 };

/* sky dome */
const skyU = { uTop: { value: C('#5aa9e6') }, uHor: { value: C('#d8eefb') }, uSun: { value: V(0, 1, 0) }, uSunC: { value: C('#fff3d6') }, uDisk: { value: 1 } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
  vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform vec3 uTop, uHor, uSun, uSunC; uniform float uDisk; varying vec3 vP;
    void main(){ float h = clamp(vP.y, -0.2, 1.0); vec3 c = mix(uHor, uTop, pow(max(h, 0.0), 0.55));
      float s = max(dot(normalize(vP), normalize(uSun)), 0.0); c += uSunC * (pow(s, 900.0) * 3.0 * uDisk + pow(s, 12.0) * 0.25);
      gl_FragColor = vec4(c, 1.0); }`,
}));
sky.renderOrder = -10; scene.add(sky);
// stars (night only)
const stars = (() => { const n = 700, p = new Float32Array(n * 3); for (let i = 0; i < n; i++){ const u = Math.random() * TAU, v = Math.acos(rand(.08, 1)); p[i * 3] = Math.cos(u) * Math.sin(v) * 850; p[i * 3 + 1] = Math.cos(v) * 850; p[i * 3 + 2] = Math.sin(u) * Math.sin(v) * 850; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const s = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false })); scene.add(s); return s; })();

const hemi = new THREE.HemisphereLight(C('#cfe8ff'), C('#6f8f55'), .75); scene.add(hemi);
const sun = new THREE.DirectionalLight(C('#fff1d8'), 2.2);
sun.castShadow = true; sun.shadow.mapSize.set(isTouch ? 1024 : 2048, isTouch ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -75, right: 75, top: 75, bottom: -75, near: 10, far: 300 }); sun.shadow.bias = -.0006; sun.shadow.normalBias = .04;
scene.add(sun); scene.add(sun.target); sun.target.position.set(0, 0, -20);

const PRESETS = {
  day: { top: '#4f9fe0', hor: '#d6ecfa', sunC: '#fff2d8', el: 52, az: 150, sunI: 2.3, hemiS: '#d4ebff', hemiG: '#7a9a5c', hemiI: .8, fog: '#cfe6f5', exp: 1.0, stars: 0, disk: 1, night: 0 },
  sunset: { top: '#3d4f8f', hor: '#f6a46b', sunC: '#ffb27a', el: 7, az: 255, sunI: 1.6, hemiS: '#f2b894', hemiG: '#5c5048', hemiI: .7, fog: '#e7a37e', exp: 1.05, stars: .15, disk: 1, night: .55 },
  night: { top: '#0b1430', hor: '#2a3563', sunC: '#9fb4ff', el: 38, az: 210, sunI: .35, hemiS: '#5b6fa8', hemiG: '#1d2233', hemiI: .55, fog: '#1b2346', exp: 1.15, stars: 1, disk: 0, night: 1 },
};
function dirFrom(el, az){ el *= Math.PI / 180; az *= Math.PI / 180; return V(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize(); }
function envFrom(p){ return { top: C(p.top), hor: C(p.hor), sunC: C(p.sunC), dir: dirFrom(p.el, p.az), sunI: p.sunI, hemiS: C(p.hemiS), hemiG: C(p.hemiG), hemiI: p.hemiI, fog: C(p.fog), exp: p.exp, stars: p.stars, disk: p.disk, night: p.night }; }
function envLerp(a, b, t){ const o = {}; for (const k in a){ const v = a[k]; if (v && v.isColor) o[k] = v.clone().lerp(b[k], t); else if (v && v.isVector3) o[k] = v.clone().lerp(b[k], t).normalize(); else o[k] = v + (b[k] - v) * t; } return o; }
let env = envFrom(PRESETS.day), envFromS = env, envTo = env, envT = 1, envName = '';
function seoulHour(){ return new Date(Date.now() + 9 * 3600e3).getUTCHours(); }
function presetForHour(h){ return h >= 6 && h < 17 ? 'day' : h >= 17 && h < 19 ? 'sunset' : 'night'; }
function setPreset(name, instant){ if (name === envName) return; envName = name; envFromS = env; envTo = envFrom(PRESETS[name]); envT = instant ? 1 : 0; if (instant) applyEnv(env = envTo); }
const forcedTime = PRESETS[QS.get('t')] ? QS.get('t') : '';
function tickClock(){ setPreset(forcedTime || presetForHour(seoulHour())); }
function applyEnv(e){
  env = e;
  skyU.uTop.value.copy(e.top); skyU.uHor.value.copy(e.hor); skyU.uSun.value.copy(e.dir); skyU.uSunC.value.copy(e.sunC); skyU.uDisk.value = e.disk;
  sun.color.copy(e.sunC); sun.intensity = e.sunI; sun.position.copy(e.dir).multiplyScalar(160).add(sun.target.position);
  hemi.color.copy(e.hemiS); hemi.groundColor.copy(e.hemiG); hemi.intensity = e.hemiI;
  scene.fog.color.copy(e.fog); renderer.toneMappingExposure = e.exp;
  stars.material.opacity = e.stars;
  glow.forEach(g => g.mat.emissiveIntensity = g.base + (g.night - g.base) * e.night);
  nightLights.forEach(l => l.intensity = l.userData.max * e.night);
}
const nightLights = [];

/* ground: one painted texture for grass, paths and pads */
const GROUND = { x: 0, z: -30, w: 240, h: 240, px: 2048 };
const gx = x => (x - (GROUND.x - GROUND.w / 2)) / GROUND.w * GROUND.px, gz = z => (z - (GROUND.z - GROUND.h / 2)) / GROUND.h * GROUND.px, gs = m => m / GROUND.w * GROUND.px;
const PATHS = [ // [x0, z0, x1, z1, width]
  [0, 40, 0, 20, 7], [0, 0, 0, -26, 6], [-10, 8, -15, 7, 5], [10, 8, 22, 7.5, 5],
  [-8, 0, -27, -17, 5], [8, 0, 26, -15, 5], [0, -24, -20, -30, 4], [0, -24, 22, -28, 4],
];
const groundTex = canvasTex(GROUND.px, GROUND.px, (g, w, h) => {
  g.fillStyle = '#7fb35f'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 26000; i++){ const v = Math.random(); g.fillStyle = v < .5 ? 'rgba(60,110,45,.22)' : v < .85 ? 'rgba(160,200,110,.18)' : 'rgba(230,240,180,.18)'; g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 3, 2 + Math.random() * 3); }
  const pave = (fn) => { g.fillStyle = '#e4d2b0'; g.strokeStyle = '#cdb68e'; fn(); };
  g.lineCap = 'round';
  // paths
  for (const [x0, z0, x1, z1, wd] of PATHS){ g.strokeStyle = '#d7c19a'; g.lineWidth = gs(wd + .8); g.beginPath(); g.moveTo(gx(x0), gz(z0)); g.lineTo(gx(x1), gz(z1)); g.stroke(); g.strokeStyle = '#dcc7a2'; g.lineWidth = gs(wd); g.stroke(); }
  // plaza: concentric paving
  pave(() => { g.beginPath(); g.arc(gx(PLAZA.x), gz(PLAZA.z), gs(PLAZA.r + .6), 0, TAU); g.fillStyle = '#d2bb92'; g.fill(); g.beginPath(); g.arc(gx(PLAZA.x), gz(PLAZA.z), gs(PLAZA.r), 0, TAU); g.fillStyle = '#dcc6a0'; g.fill(); });
  g.strokeStyle = 'rgba(190,160,120,.55)'; g.lineWidth = 2; for (let r = 4; r < PLAZA.r; r += 1.6){ g.beginPath(); g.arc(gx(PLAZA.x), gz(PLAZA.z), gs(r), 0, TAU); g.stroke(); }
  g.strokeStyle = 'rgba(214,120,96,.55)'; g.lineWidth = gs(.5); [6.5, 11].forEach(r => { g.beginPath(); g.arc(gx(PLAZA.x), gz(PLAZA.z), gs(r), 0, TAU); g.stroke(); });
  // ride pads
  const pad = (x, z, r, c = '#d9cdb8') => { g.fillStyle = '#c4b293'; g.beginPath(); g.arc(gx(x), gz(z), gs(r + .5), 0, TAU); g.fill(); g.fillStyle = c; g.beginPath(); g.arc(gx(x), gz(z), gs(r), 0, TAU); g.fill(); };
  pad(-20, 6, 9.5, '#e5d6bd'); pad(26, -22, 6, '#d6d0c6'); pad(-28, -24, 7.5, '#ded3c0');
  g.fillStyle = '#d6cdbf'; g.fillRect(gx(15), gz(-2), gs(18), gs(12)); // viking pad
  g.fillStyle = '#d0c7b8'; g.fillRect(gx(-12), gz(-33), gs(24), gs(9)); // coaster station
  // flower beds near the gate
  for (const sx of [-1, 1]) for (let i = 0; i < 160; i++){ const x = sx * rand(5, 13), z = rand(22, 31); g.fillStyle = ['#f28aa0', '#f6d25c', '#ffffff', '#b58fe0', '#ff9c5a'][(Math.random() * 5) | 0]; g.beginPath(); g.arc(gx(x), gz(z), gs(rand(.12, .28)), 0, TAU); g.fill(); }
});
const ground = new THREE.Mesh(new THREE.PlaneGeometry(GROUND.w, GROUND.h), new THREE.MeshStandardMaterial({ map: groundTex, roughness: .95 }));
ground.rotation.x = -Math.PI / 2; ground.position.set(GROUND.x, 0, GROUND.z); ground.receiveShadow = true; scene.add(ground);
// far grass ring so the horizon is not a hard edge
{ const far = new THREE.Mesh(new THREE.RingGeometry(150, 900, 48, 1), M('#6e9e55', { roughness: 1 })); far.rotation.x = -Math.PI / 2; far.position.set(0, -.02, -30); far.receiveShadow = false; scene.add(far); }
// distant hills
{ const hm = M('#5f8f58', { roughness: 1, flatShading: true }), hm2 = M('#7aa06a', { roughness: 1, flatShading: true });
  for (let i = 0; i < 26; i++){ const a = i / 26 * TAU + rand(-.05, .05), r = rand(330, 420), h = rand(40, 110), w = rand(90, 170);
    const m = new THREE.Mesh(new THREE.ConeGeometry(w, h, 7, 1), i % 2 ? hm : hm2); m.position.set(Math.cos(a) * r, h / 2 - 4, -30 + Math.sin(a) * r); m.rotation.y = rand(0, TAU); scene.add(m); } }

/* fountain in the plaza */
const fountain = (() => {
  const g = grp(scene, PLAZA.x, 0, PLAZA.z);
  cyl(3.4, 3.6, .7, mat.stone, g, 0, 0, 0, 32); const w = cyl(3.05, 3.05, .08, mat.water, g, 0, .58, 0, 32, false);
  cyl(.5, .7, 1.6, mat.stone, g, 0, 0, 0, 16); cyl(1.4, 1.2, .3, mat.stone, g, 0, 1.6, 0, 20); cyl(1.25, 1.25, .05, mat.water, g, 0, 1.85, 0, 20, false);
  cyl(.25, .35, 1.0, mat.stone, g, 0, 1.8, 0, 12);
  const jets = []; const jm = new THREE.MeshStandardMaterial({ color: C('#d8f2ff'), transparent: true, opacity: .55, roughness: .05, depthWrite: false });
  const top = mesh(new THREE.ConeGeometry(.35, 1.6, 12, 1, true), jm, g, 0, 3.4, 0, false); jets.push(top);
  for (let i = 0; i < 8; i++){ const a = i / 8 * TAU; const j = mesh(new THREE.CylinderGeometry(.05, .12, 1.6, 6, 1, true), jm, g, Math.cos(a) * 2.2, 1.2, Math.sin(a) * 2.2, false); j.rotation.z = Math.cos(a) * .5; j.rotation.x = -Math.sin(a) * .5; jets.push(j); }
  const ring = glowMat('#8fe3ff', .05, 1.6); for (let i = 0; i < 16; i++){ const a = i / 16 * TAU; sph(.09, ring, g, Math.cos(a) * 3.0, .66, Math.sin(a) * 3.0, 6); }
  obC(PLAZA.x, PLAZA.z, 3.8);
  return { tick(t){ jets.forEach((j, i) => { const s = 1 + Math.sin(t * 3 + i) * .08; j.scale.set(1, s, 1); }); w.rotation.y = t * .1; } };
})();

/* entrance gate */
function textTex(lines, o = {}){
  const W = o.w || 1024, Hh = o.h || 256;
  const t = canvasTex(W, Hh, (g, w, h) => {
    if (o.bg){ g.fillStyle = o.bg; roundRect(g, 6, 6, w - 12, h - 12, o.r || 40); g.fill(); }
    if (o.border){ g.strokeStyle = o.border; g.lineWidth = 10; roundRect(g, 14, 14, w - 28, h - 28, (o.r || 40) - 8); g.stroke(); }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach(([txt, size, color, y]) => { g.font = `700 ${size}px "Jua","Gowun Dodum",sans-serif`; g.lineWidth = size * .14; g.strokeStyle = o.stroke || 'rgba(80,30,20,.65)'; g.strokeText(txt, w / 2, h * y); g.fillStyle = color; g.fillText(txt, w / 2, h * y); });
  });
  fontTex.push(t); return t;
}
function roundRect(g, x, y, w, h, r){ g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
const gateFlags = [], signMeshes = [];
const gate = (() => {
  const g = grp(scene, 0, 0, 34);
  const stripe = new THREE.MeshStandardMaterial({ map: stripeTex('#d9473f', '#f6f1e8', 12), roughness: .6 });
  for (const sx of [-1, 1]){
    const t = grp(g, sx * 6.2, 0, 0);
    cyl(1.3, 1.5, 7.5, mat.cream, t, 0, 0, 0, 16); cyl(1.55, 1.55, .5, mat.red, t, 0, 7.5, 0, 16);
    const roof = mesh(new THREE.ConeGeometry(1.9, 3.2, 16), stripe, t, 0, 9.6, 0); roof.castShadow = true;
    sph(.3, mat.gold, t, 0, 11.4, 0, 10); cyl(.03, .03, 1.4, mat.darkSteel, t, 0, 11.5, 0, 4);
    const flag = mesh(new THREE.PlaneGeometry(1.1, .6), new THREE.MeshStandardMaterial({ color: C(sx < 0 ? '#3f7fc9' : '#f2c443'), side: THREE.DoubleSide }), t, .55, 12.55, 0, false);
    flag.userData.wave = sx; gateFlags.push(flag);
    obC(sx * 6.2, 34, 1.7);
  }
  // arch with the park sign
  const arch = mesh(new THREE.TorusGeometry(6.2, .35, 10, 40, Math.PI), mat.red, g, 0, 7.6, 0); arch.scale.y = .38;
  box(12.4, .6, .6, mat.red, g, 0, 7.2, 0);
  const st = textTex([['온라인 놀이공원', 120, '#fff6d8', .44], ['ONLINE  AMUSEMENT  PARK', 46, '#ffd27a', .8]], { bg: '#2f4a8a', border: '#f2c443', w: 1024, h: 300 });
  const sm = new THREE.MeshStandardMaterial({ map: st, emissive: C('#ffffff'), emissiveMap: st, emissiveIntensity: .25, roughness: .6 }); glow.push({ mat: sm, base: .25, night: .9 });
  const signMesh = mesh(new THREE.PlaneGeometry(9, 2.64), sm, g, 0, 8.9, .36); signMesh.userData.signIdx = 0; signMeshes.push(signMesh);
  const back = mesh(new THREE.PlaneGeometry(9, 2.64), sm, g, 0, 8.9, -.36); back.rotation.y = Math.PI; signMeshes.push(back);
  for (let i = 0; i < 18; i++){ const a = Math.PI * (i / 17); sph(.12, i % 2 ? mat.bulb : mat.bulbRed, g, Math.cos(a) * 6.2, 7.6 + Math.sin(a) * 6.2 * .38 + .35, .3, 6); }
  // ticket booth
  const tb = grp(g, -11, 0, -1.5);
  box(2.6, 2.6, 2.2, mat.cream, tb, 0, 0, 0); box(3, .25, 2.6, mat.red, tb, 0, 2.6, 0); mesh(new THREE.ConeGeometry(2.1, 1.3, 4), mat.red, tb, 0, 3.5, 0).rotation.y = Math.PI / 4;
  box(1.6, .9, .05, mat.glass, tb, 0, 1.2, 1.12, false); obR(-12.5, -9.5, 31.3, 33.7);
  return g;
})();

/* perimeter fence */
(() => {
  const posts = [], rails = [];
  const line = (x0, z0, x1, z1) => { const len = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(len / 2.5); for (let i = 0; i <= n; i++) posts.push([x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n]); rails.push([x0, z0, x1, z1]); };
  const X0 = BOUNDS.x0 - 1.2, X1 = BOUNDS.x1 + 1.2, Z0 = BOUNDS.z0 - 1.2, Z1 = 34;
  line(X0, Z0, X1, Z0); line(X0, Z0, X0, Z1); line(X1, Z0, X1, Z1); line(X0, Z1, -7.6, Z1); line(7.6, Z1, X1, Z1);
  const pg = new THREE.CylinderGeometry(.09, .09, 1.3, 6); pg.translate(0, .65, 0);
  const im = new THREE.InstancedMesh(pg, mat.navy, posts.length); const m4 = new THREE.Matrix4();
  posts.forEach(([x, z], i) => { m4.makeTranslation(x, 0, z); im.setMatrixAt(i, m4); }); im.castShadow = true; scene.add(im);
  for (const [x0, z0, x1, z1] of rails) for (const y of [.55, 1.15]){ const len = Math.hypot(x1 - x0, z1 - z0); const r = box(len, .07, .07, mat.white, scene, (x0 + x1) / 2, y, (z0 + z1) / 2, false); r.rotation.y = -Math.atan2(z1 - z0, x1 - x0); }
})();

/* lamps along the paths and around the plaza */
const lampSpots = [];
(() => {
  for (let i = 0; i < 10; i++){ const a = (i + .5) / 10 * TAU; lampSpots.push([PLAZA.x + Math.cos(a) * (PLAZA.r + .4), PLAZA.z + Math.sin(a) * (PLAZA.r + .4)]); }
  for (const [x0, z0, x1, z1, wd] of PATHS){ const len = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(len / 11); const nx = -(z1 - z0) / len, nz = (x1 - x0) / len;
    for (let i = 1; i <= n; i++){ const k = i / (n + 1), x = x0 + (x1 - x0) * k, z = z0 + (z1 - z0) * k; if (Math.hypot(x - PLAZA.x, z - PLAZA.z) < PLAZA.r + 3) continue; const sd = i % 2 ? 1 : -1; lampSpots.push([x + nx * sd * (wd / 2 + .5), z + nz * sd * (wd / 2 + .5)]); } }
  const pole = new THREE.CylinderGeometry(.07, .1, 3.6, 8); pole.translate(0, 1.8, 0);
  const head = new THREE.SphereGeometry(.26, 12, 8); head.translate(0, 3.75, 0);
  const pm = new THREE.InstancedMesh(pole, mat.navy, lampSpots.length), hm = new THREE.InstancedMesh(head, mat.bulb, lampSpots.length), m4 = new THREE.Matrix4();
  lampSpots.forEach(([x, z], i) => { m4.makeTranslation(x, 0, z); pm.setMatrixAt(i, m4); hm.setMatrixAt(i, m4); obC(x, z, .3); });
  pm.castShadow = true; scene.add(pm, hm);
  // a few real lights around the plaza at night
  [0, 3, 5, 8].forEach(i => { const [x, z] = lampSpots[i]; const l = new THREE.PointLight(C('#ffd9a0'), 0, 18, 2); l.position.set(x, 3.6, z); l.userData.max = 3.2; nightLights.push(l); scene.add(l); });
  // string lights across the plaza between lamps
  const pts = []; const hang = (a, b) => { const [x0, z0] = a, [x1, z1] = b, n = Math.max(6, Math.round(Math.hypot(x1 - x0, z1 - z0) / .9)); for (let i = 1; i < n; i++){ const t = i / n; pts.push([x0 + (x1 - x0) * t, 3.7 - Math.sin(t * Math.PI) * .9, z0 + (z1 - z0) * t]); } };
  for (let i = 0; i < 10; i++) hang(lampSpots[i], lampSpots[(i + 1) % 10]);
  [[0, 5], [2, 7]].forEach(([a, b]) => { const A = lampSpots[a], B = lampSpots[b], mid = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2]; const P = [PLAZA.x + (mid[0] - PLAZA.x) * .1, PLAZA.z + (mid[1] - PLAZA.z) * .1]; hang(A, [P[0] + (A[0] - P[0]) * .25, P[1] + (A[1] - P[1]) * .25]); hang([P[0] + (B[0] - P[0]) * .25, P[1] + (B[1] - P[1]) * .25], B); });
  const cols = [mat.bulb, mat.bulbRed, mat.bulbBlue, mat.bulbPink], bg = new THREE.SphereGeometry(.07, 6, 4);
  cols.forEach((m, ci) => { const mine = pts.filter((_, i) => i % 4 === ci); const im = new THREE.InstancedMesh(bg, m, mine.length); mine.forEach(([x, y, z], i) => { m4.makeTranslation(x, y, z); im.setMatrixAt(i, m4); }); scene.add(im); });
})();

/* benches around the plaza (tap to sit) */
(() => {
  const angles = [-.55, -2.55, .95, 2.2, 3.85, 5.55].map(a => a);
  for (const a of angles){
    const r = PLAZA.r - 1.6, x = PLAZA.x + Math.cos(a) * r, z = PLAZA.z + Math.sin(a) * r, rot = Math.atan2(PLAZA.x - x, PLAZA.z - z);
    const g = grp(scene, x, 0, z, rot);
    box(2.2, .08, .55, mat.wood, g, 0, .45, 0); box(2.2, .5, .08, mat.wood, g, 0, .6, -.3).rotation.x = -.15;
    for (const sx of [-.9, .9]){ box(.08, .45, .5, mat.navy, g, sx, 0, 0); }
    obC(x, z, 1.05);
    const first = seats.length;
    for (const sx of [-.5, .5]){ const sxw = Math.cos(rot) * sx, szw = -Math.sin(rot) * sx; seats.push({ x: x + sxw, z: z + szw, rot, h: .5, occ: false, occRemote: false }); }
    act(g, { type: 'bench', i: first });
  }
})();

/* trees: scattered where nothing else stands */
const KEEP_OUT = [ // circles [x, z, r]
  [PLAZA.x, PLAZA.z, PLAZA.r + 3], [-20, 6, 11], [24, 4, 13], [-28, -24, 14], [26, -22, 9], [0, -30, 12], [0, 28, 9], [-11, 32, 3],
];
function nearTrack(x, z){ return typeof coasterNear === 'function' && coasterNear(x, z, 6); }
function onPath(x, z){ for (const [x0, z0, x1, z1, wd] of PATHS){ const dx = x1 - x0, dz = z1 - z0, L2 = dx * dx + dz * dz, t = clamp(((x - x0) * dx + (z - z0) * dz) / L2, 0, 1); if (Math.hypot(x - x0 - dx * t, z - z0 - dz * t) < wd / 2 + 2) return true; } return false; }
function plantTrees(){
  const spots = [];
  for (let i = 0; i < 2600 && spots.length < 150; i++){
    const x = rand(BOUNDS.x0 + 1, BOUNDS.x1 - 1), z = rand(BOUNDS.z0 + 1, BOUNDS.z1 - 2);
    if (KEEP_OUT.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r) || onPath(x, z) || nearTrack(x, z)) continue;
    if (spots.some(([sx, sz]) => Math.hypot(x - sx, z - sz) < 4.2)) continue;
    // keep the middle walkable, push trees toward the edges
    const edge = Math.min(x - BOUNDS.x0, BOUNDS.x1 - x, z - BOUNDS.z0, BOUNDS.z1 - z);
    if (edge > 14 && Math.random() < .75) continue;
    spots.push([x, z, rand(.8, 1.35), Math.random()]);
  }
  const trunkG = new THREE.CylinderGeometry(.18, .26, 2.2, 7); trunkG.translate(0, 1.1, 0);
  const crownA = new THREE.IcosahedronGeometry(1.7, 1); crownA.translate(0, 3.3, 0);
  const crownB = new THREE.ConeGeometry(1.6, 4.2, 8); crownB.translate(0, 4.1, 0);
  const ta = spots, A = ta.filter(s => s[3] < .65), B = ta.filter(s => s[3] >= .65);
  const tr = new THREE.InstancedMesh(trunkG, mat.trunk, ta.length), ca = new THREE.InstancedMesh(crownA, mat.leaf, A.length), cb = new THREE.InstancedMesh(crownB, mat.leafDark, B.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  ta.forEach(([x, z, k], i) => { m4.compose(V(x, 0, z), q.setFromAxisAngle(_up, k * 9), s.setScalar(k)); tr.setMatrixAt(i, m4); obC(x, z, .45 * k); });
  A.forEach(([x, z, k], i) => { m4.compose(V(x, 0, z), q.setFromAxisAngle(_up, k * 9), s.setScalar(k)); ca.setMatrixAt(i, m4); });
  B.forEach(([x, z, k], i) => { m4.compose(V(x, 0, z), q.setFromAxisAngle(_up, k * 9), s.setScalar(k)); cb.setMatrixAt(i, m4); });
  [tr, ca, cb].forEach(m => { m.castShadow = true; m.receiveShadow = true; scene.add(m); });
}

/* snack cart (tap for the snack menu) and balloon stand */
const snackCart = (() => {
  const g = grp(scene, 9.5, 0, 21.5, -2.4);
  box(3.2, 1.1, 1.6, mat.cream, g, 0, .35, 0); box(3.3, .12, 1.7, mat.red, g, 0, 1.45, 0);
  for (const sx of [-1.4, 1.4]) for (const sz of [-.6, .6]) cyl(.05, .05, 1.3, mat.steel, g, sx, 1.5, sz, 6);
  const aw = mesh(new THREE.BoxGeometry(3.7, .14, 2.2), new THREE.MeshStandardMaterial({ map: stripeTex('#d9473f', '#fff6e6', 10), roughness: .7 }), g, 0, 2.85, 0); aw.rotation.x = .08;
  for (const sx of [-1.2, 1.2]){ const w = mesh(new THREE.TorusGeometry(.32, .08, 8, 16), mat.darkSteel, g, sx, .35, .85); }
  // cotton candy & churros on the counter
  sph(.28, mat.pink, g, -.8, 1.85, 0, 10); sph(.24, M('#b7d9ff'), g, -.3, 1.8, .1, 10); cyl(.05, .05, .9, M('#c98a4a'), g, .7, 1.5, 0, 6);
  const sign = textTex([['간식', 150, '#fff6d8', .52]], { bg: '#e0603e', border: '#fff1c8', w: 512, h: 256, r: 60 });
  const sm = new THREE.MeshStandardMaterial({ map: sign, emissive: C('#ffffff'), emissiveMap: sign, emissiveIntensity: .2 }); glow.push({ mat: sm, base: .2, night: .8 });
  const s1 = mesh(new THREE.PlaneGeometry(1.6, .8), sm, g, 0, 3.4, .5); signMeshes.push(s1);
  act(g, { type: 'snack' });
  const wx = 9.5, wz = 21.5; obC(wx, wz, 2.0);
  return g;
})();
const balloonStand = (() => {
  const g = grp(scene, -9.5, 0, 21.5);
  cyl(.06, .06, 2.4, mat.steel, g, 0, 0, 0, 6); cyl(.4, .5, .5, mat.navy, g, 0, 0, 0, 12);
  const cols = ['#ff6b6b', '#ffd166', '#4dabf7', '#b197fc', '#63e6be', '#ff8fd0', '#ffa94d'];
  const balloons = [];
  for (let i = 0; i < 9; i++){ const a = i / 9 * TAU, r = .5 + (i % 3) * .25, y = 3.4 + (i % 4) * .35;
    const b = sph(.32, M(cols[i % cols.length], { roughness: .3 }), g, Math.cos(a) * r, y, Math.sin(a) * r, 12); b.scale.y = 1.18;
    beam(V(0, 2.4, 0), V(Math.cos(a) * r, y - .35, Math.sin(a) * r), .006, mat.white, g, 3, false); balloons.push(b); }
  act(g, { type: 'snack' }); obC(-9.5, 21.5, .9);
  return { g, balloons };
})();
// little flags on lines over the gate path
const bunting = (() => {
  const g = grp(scene); const cols = ['#ff6b6b', '#ffd166', '#4dabf7', '#63e6be', '#b197fc'];
  const tri = new THREE.BufferGeometry(); tri.setAttribute('position', new THREE.Float32BufferAttribute([-.22, 0, 0, .22, 0, 0, 0, -.45, 0], 3)); tri.computeVertexNormals();
  const flags = [];
  for (const z of [26, 30]){ const n = 14; for (let i = 0; i < n; i++){ const t = (i + .5) / n, x = -6 + 12 * t, y = 6.6 - Math.sin(t * Math.PI) * .8; const f = mesh(tri, new THREE.MeshStandardMaterial({ color: C(cols[i % 5]), side: THREE.DoubleSide }), g, x, y, z, false); flags.push(f); } }
  for (const sx of [-6.3, 6.3]) for (const z of [26, 30]) cyl(.08, .08, 6.8, mat.navy, g, sx, 0, z, 6);
  [-6.3, 6.3].forEach(x => [26, 30].forEach(z => obC(x, z, .3)));
  return { tick(t){ flags.forEach((f, i) => f.rotation.x = Math.sin(t * 2.4 + i * .7) * .25); } };
})();

/* drifting clouds */
const clouds = [];
{ const cm = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: .92, fog: false });
  for (let i = 0; i < 16; i++){ const g = new THREE.Group(); const n = 4 + (i % 3);
    for (let k = 0; k < n; k++){ const s = new THREE.Mesh(new THREE.SphereGeometry(rand(10, 18), 10, 8), cm); s.position.set(k * 14 - n * 7, rand(-3, 4), rand(-5, 5)); s.scale.y = .55; g.add(s); }
    g.position.set(rand(-700, 700), rand(150, 230), rand(-650, 450)); scene.add(g); clouds.push(g); } }

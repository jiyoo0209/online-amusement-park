/* ---------- Ferris wheel gondolas: glass capsules ----------
   Origin = the pivot on the wheel rim; the capsule hangs below it (-y). The wheel rims sit at z = ±1.2, so it stays within |z| < 0.9.
   Two riders face each other across x. Merged into one mesh per material like the coaster cars. */
const buildGondola = (() => {
const C = hex => new THREE.Color(hex).convertSRGBToLinear();
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;
let ENV = null;
const COLS = ['#ff7f98', '#5fd0b7', '#6fa8ff', '#ffc94d', '#a98bff', '#ff9d66', '#ff6fb5', '#4cc3e8', '#9bd65a', '#f2a5ff', '#ffb347', '#7c8cff'];
const cache = new Map(), once = (k, f) => { if (!cache.has(k)) cache.set(k, f()); return cache.get(k); };
const paint = (hex, o = {}) => once('p' + hex + JSON.stringify(o), () => new THREE.MeshPhysicalMaterial(Object.assign({ color: C(hex), metalness: .1, roughness: .35, clearcoat: .7, clearcoatRoughness: .12, envMap: ENV, envMapIntensity: .35 }, o)));
const chrome = () => once('chrome', () => new THREE.MeshStandardMaterial({ color: C('#eef2f6'), metalness: 1, roughness: .14, envMap: ENV, envMapIntensity: 1.1 }));
const glass = () => once('glass', () => new THREE.MeshPhysicalMaterial({ color: C('#cfeeff'), metalness: 0, roughness: .04, transparent: true, opacity: .26, envMap: ENV, envMapIntensity: 1.4, side: THREE.DoubleSide, depthWrite: false }));
const matte = (hex, o = {}) => once('m' + hex + JSON.stringify(o), () => new THREE.MeshStandardMaterial(Object.assign({ color: C(hex), roughness: .7 }, o)));
const glowing = hex => once('g' + hex, () => glowMat(hex, .45, 2.6));
function add(p, geo, m, x = 0, y = 0, z = 0, cast = true){ const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = cast; o.receiveShadow = true; p.add(o); return o; }
function tube(p, pts, r, m, closed = false, seg = 40){ return add(p, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, closed), seg, r, 8, closed), m); }
function ring(p, rx, rz, y, r, m){ const g = new THREE.TorusGeometry(1, r, 8, 48); g.scale(rx, rz, 1); g.rotateX(Math.PI / 2); return add(p, g, m, 0, y, 0); }
function axle(g){ const a = add(g, new THREE.CylinderGeometry(.06, .06, .62, 12), chrome()); a.rotation.x = Math.PI / 2; add(g, new THREE.SphereGeometry(.1, 14, 10), chrome()); }
function bench(g, x, y, hex, len = .9){ add(g, new THREE.BoxGeometry(.38, .09, len), paint(hex, { roughness: .55, clearcoat: .2 }), x, y, 0); add(g, new THREE.BoxGeometry(.06, .3, len * .9), matte('#c9ced6', { metalness: .7, roughness: .35, envMap: ENV }), x, y - .2, 0); }
const seatsFacing = (y, x = .5) => [{ p: V(-x, y, .2), rot: Math.PI / 2 }, { p: V(x, y, -.2), rot: -Math.PI / 2 }];

/* A. 글래스 캡슐 — panoramic glass egg on a chrome collar, white shell, coloured band that glows at night */
function capsule(k){
  const g = new THREE.Group(), col = COLS[k % COLS.length], cy = -1.7, rx = 1.32, ry = 1.0, rz = .84;
  axle(g); add(g, new THREE.CylinderGeometry(.05, .07, .62, 12), chrome(), 0, -.36, 0); ring(g, .16, .16, -.68, .04, chrome());
  const part = (t0, t1, m, seg = 40) => { const s = new THREE.SphereGeometry(1, seg, 24, 0, TAU, t0 * Math.PI, (t1 - t0) * Math.PI); s.scale(rx, ry, rz); return add(g, s, m, 0, cy, 0); };
  part(0, .13, paint('#f7f4ee')); part(.13, .6, glass()).castShadow = false; part(.6, 1, paint('#f7f4ee'));
  const bandY = cy + ry * Math.cos(.6 * Math.PI), bs = Math.sin(.6 * Math.PI);
  ring(g, rx * bs * 1.01, rz * bs * 1.01, bandY, .055, paint(col));
  ring(g, rx * bs * 1.02, rz * bs * 1.02, bandY - .09, .018, glowing(col)).castShadow = false;
  const ts = Math.sin(.13 * Math.PI); ring(g, rx * ts, rz * ts, cy + ry * Math.cos(.13 * Math.PI), .03, chrome());
  // chrome ribs over the glass
  for (let i = 0; i < 8; i++){ const ph = i / 8 * TAU + Math.PI / 8, pts = []; for (let j = 0; j <= 12; j++){ const th = (.13 + .47 * j / 12) * Math.PI; pts.push(V(rx * 1.008 * Math.sin(th) * Math.cos(ph), cy + ry * 1.008 * Math.cos(th), rz * 1.008 * Math.sin(th) * Math.sin(ph))); } tube(g, pts, .018, chrome(), false, 24); }
  // floor and two curved benches in the band colour
  const fl = new THREE.CylinderGeometry(1, 1, .06, 32); fl.scale(rx * .72, 1, rz * .72); add(g, fl, matte('#5a606a', { metalness: .3 }), 0, -2.42, 0);
  bench(g, -.56, -2.06, col, .95); bench(g, .56, -2.06, col, .95);
  add(g, new THREE.SphereGeometry(.07, 12, 8), glowing('#fff1c4'), 0, cy + ry * .86, 0, false); // ceiling light
  return { group: g, seats: seatsFacing(-1.98, .52) };
}

const fn = k => { ENV = envMap(); const b = capsule(k); mergeByMaterial(b.group); return b; };
fn.colors = COLS;
return fn;
})();

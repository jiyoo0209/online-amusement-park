/* ---------- core: helpers, renderer, materials ---------- */
const $ = s => document.querySelector(s);
const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth01 = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const lerpAngle = (a, b, t) => { const d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI; return a + d * t; };
const C = hex => new THREE.Color(hex).convertSRGBToLinear();
const store = { get(k){ try { return localStorage.getItem(k); } catch (e){ return null; } }, set(k, v){ try { localStorage.setItem(k, v); } catch (e){} } };
const QS = new URLSearchParams(location.search);
const isTouch = matchMedia('(pointer: coarse)').matches;
function hash32(n){ n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); return (n ^ (n >>> 16)) >>> 0; }
const hash01 = (...k) => { let h = 2166136261; for (const v of k) h = hash32(h ^ ((v | 0) + 0x9e3779b9)); return h / 4294967296; };

// Shared clock: every ride moves as a function of wall-clock time, so every screen shows the same ride at the same moment.
let clockSkew = 0;
const nowS = () => (Date.now() + clockSkew) / 1000;

/* ---------- renderer ---------- */
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight, false);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('#stage').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 1600);
scene.fog = new THREE.Fog(C('#cfe6f5'), 120, 520);

/* ---------- textures & materials ---------- */
function canvasTex(w, h, draw, rep){
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; t.userData = t.userData || {}; t.userData.draw = draw;
  if (rep){ t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
  return t;
}
const M = (hex, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: C(hex), roughness: .8, metalness: 0 }, o));
const glow = []; // emissive materials that brighten at night: {mat, base, night}
function glowMat(hex, base = .25, night = 2.2, o = {}){ const m = new THREE.MeshStandardMaterial(Object.assign({ color: C(hex), emissive: C(hex), emissiveIntensity: base, roughness: .4 }, o)); glow.push({ mat: m, base, night }); return m; }
function stripeTex(a, b, n = 8, vertical = true){
  return canvasTex(256, 256, (g, w, h) => { for (let i = 0; i < n; i++){ g.fillStyle = i % 2 ? b : a; if (vertical) g.fillRect(i * w / n, 0, w / n + 1, h); else g.fillRect(0, i * h / n, w, h / n + 1); } });
}
const mat = {
  white: M('#f6f1e8', { roughness: .6 }), cream: M('#f3e6c8'), red: M('#d9473f', { roughness: .55 }), deepRed: M('#a8302e', { roughness: .6 }),
  yellow: M('#f2c443', { roughness: .55 }), blue: M('#3f7fc9', { roughness: .55 }), navy: M('#26406b', { roughness: .6 }), teal: M('#3aa3a0', { roughness: .6 }),
  pink: M('#ef8fae', { roughness: .6 }), mint: M('#9ed9c3', { roughness: .6 }), purple: M('#8a6cc9', { roughness: .6 }), orange: M('#ef8a3c', { roughness: .6 }),
  steel: M('#cfd6dd', { roughness: .35, metalness: .6 }), darkSteel: M('#56606b', { roughness: .45, metalness: .5 }), gold: M('#e2b456', { roughness: .3, metalness: .7 }),
  wood: M('#9a6a43'), woodDark: M('#6b4428'), stone: M('#c9c1b4', { roughness: .9 }), concrete: M('#b9b4ac', { roughness: .95 }),
  leaf: M('#5f9e4f', { roughness: .9 }), leafDark: M('#3f7a3a', { roughness: .9 }), trunk: M('#7a5434', { roughness: .95 }),
  water: new THREE.MeshStandardMaterial({ color: C('#6cc3e0'), roughness: .1, metalness: .2, transparent: true, opacity: .85 }),
  glass: new THREE.MeshStandardMaterial({ color: C('#bfe3f2'), roughness: .1, metalness: .1, transparent: true, opacity: .35 }),
  bulb: glowMat('#ffe6a8', .5, 3.2), bulbRed: glowMat('#ff8a7a', .4, 2.8), bulbBlue: glowMat('#8fd0ff', .4, 2.8), bulbPink: glowMat('#ffa8d8', .4, 2.8),
};

/* ---------- scene helpers ---------- */
const interactives = [];
const obstacles = [];   // {t:'c', x, z, r} | {t:'r', x0, x1, z0, z1}
const seats = [];       // benches: {x, z, rot, h, occ, occRemote}
function mesh(geo, m, parent, x = 0, y = 0, z = 0, cast = true){ const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = cast; o.receiveShadow = true; parent.add(o); return o; }
function box(w, h, d, m, parent, x, y, z, cast){ return mesh(new THREE.BoxGeometry(w, h, d), m, parent, x, y + h / 2, z, cast); }
function cyl(rt, rb, h, m, parent, x, y, z, seg = 20, cast){ return mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m, parent, x, y + h / 2, z, cast); }
function sph(r, m, parent, x, y, z, seg = 16){ return mesh(new THREE.SphereGeometry(r, seg, Math.max(8, seg * .7 | 0)), m, parent, x, y, z); }
function grp(parent, x = 0, y = 0, z = 0, rot = 0){ const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot; parent.add(g); return g; }
function act(obj, data){ obj.traverse(o => { if (o.isMesh){ o.userData.act = data; interactives.push(o); } }); }
function obC(x, z, r){ obstacles.push({ t: 'c', x, z, r }); }
function obR(x0, x1, z0, z1){ obstacles.push({ t: 'r', x0, x1, z0, z1 }); }
// a beam (cylinder) between two points
const _up = new THREE.Vector3(0, 1, 0);
function beam(a, b, r, m, parent, seg = 8, cast = true){
  const d = new THREE.Vector3().subVectors(b, a), len = d.length();
  const o = mesh(new THREE.CylinderGeometry(r, r, len, seg), m, parent, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, cast);
  o.quaternion.setFromUnitVectors(_up, d.normalize()); return o;
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);
// redraw canvas textures that use web fonts once the fonts have arrived
const fontTex = [];
function redrawFontTex(){ fontTex.forEach(t => { const cv = t.image, g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height); t.userData.draw(g, cv.width, cv.height); t.needsUpdate = true; }); }

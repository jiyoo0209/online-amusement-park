/* ---------- roller coaster train: red racer cars ----------
   Car frame: +z forward, +y up, origin 0.3 m above the rail centre line (rails at x = ±0.55, y = -0.3).
   Built from ~90 parts, then merged into one mesh per material so the whole train stays cheap to draw. */
const buildCoasterCar = (() => {
const C = hex => new THREE.Color(hex).convertSRGBToLinear();
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const SCHEMES = {
  red: { name: '레드 레이서', body: '#c0141d', stripe: '#ffc93c', pin: '#fff4dc', seat: '#1f2b4a', bolster: '#ffc93c', bar: '#ffc93c', led: '#ffd58a', num: '#fff4dc' },
};
const matCache = new Map();
function mats(scheme, env){
  const key = scheme + (env ? 1 : 0); if (matCache.has(key)) return matCache.get(key);
  const s = SCHEMES[scheme], e = env || null;
  const paint = hex => new THREE.MeshPhysicalMaterial({ color: C(hex), metalness: .1, roughness: .38, clearcoat: .7, clearcoatRoughness: .14, envMap: e, envMapIntensity: .32 });
  const m = {
    body: paint(s.body), stripe: paint(s.stripe),
    chrome: new THREE.MeshStandardMaterial({ color: C('#eef2f6'), metalness: 1, roughness: .12, envMap: e, envMapIntensity: 1.1 }),
    satin: new THREE.MeshStandardMaterial({ color: C('#c7ced8'), metalness: .85, roughness: .32, envMap: e, envMapIntensity: .8 }),
    frame: new THREE.MeshStandardMaterial({ color: C('#2a2f37'), metalness: .6, roughness: .45, envMap: e, envMapIntensity: .5 }),
    seat: new THREE.MeshStandardMaterial({ color: C(s.seat), roughness: .62, metalness: 0 }),
    bolster: new THREE.MeshStandardMaterial({ color: C(s.bolster), roughness: .55 }),
    pad: new THREE.MeshStandardMaterial({ color: C(s.bar), roughness: .5 }),
    tyre: new THREE.MeshStandardMaterial({ color: C('#25262b'), roughness: .75 }),
    hub: new THREE.MeshStandardMaterial({ color: C(s.stripe), metalness: .3, roughness: .35 }),
    floor: new THREE.MeshStandardMaterial({ color: C('#3a3f47'), roughness: .85, metalness: .3 }),
    led: glowMat(s.led, .5, 2.4), lamp: glowMat('#fff1c4', .8, 3.0), tail: glowMat('#ff3b3b', .6, 2.4),
    glass: new THREE.MeshPhysicalMaterial({ color: C('#bfe6ff'), metalness: 0, roughness: .05, transparent: true, opacity: .32, envMap: e, envMapIntensity: 1.2, side: THREE.DoubleSide }),
    grille: new THREE.MeshStandardMaterial({ color: C('#15171c'), metalness: .5, roughness: .5 }),
  };
  matCache.set(key, m); return m;
}
function add(parent, geo, m, x = 0, y = 0, z = 0){ const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o; }
// a side profile (in z/y) extruded across the car (x), centred on x
function profile(pts, width, bevel = .05, curveSegs = 14){
  const sh = new THREE.Shape(); sh.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++){ const p = pts[i]; if (p.length === 4) sh.quadraticCurveTo(p[0], p[1], p[2], p[3]); else sh.lineTo(p[0], p[1]); }
  sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: width - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: curveSegs });
  g.translate(0, 0, -(width - bevel * 2) / 2); g.rotateY(-Math.PI / 2); // shape x → car z (forward), extrude → car x
  g.computeVertexNormals(); return g;
}
function wheel(parent, m, r, w, x, y, z, axis = 'x'){
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  const t = add(g, new THREE.CylinderGeometry(r, r, w, 20), m.tyre); const h = add(g, new THREE.CylinderGeometry(r * .55, r * .55, w + .012, 16), m.hub); const c = add(g, new THREE.CylinderGeometry(r * .18, r * .18, w + .03, 10), m.chrome);
  if (axis === 'x') g.rotation.z = Math.PI / 2; return g;
}
const decalCache = new Map();
function decal(k, scheme, flip){
  const key = k + scheme + (flip ? 'f' : ''); if (decalCache.has(key)) return decalCache.get(key);
  const s = SCHEMES[scheme];
  const t = canvasTex(1024, 256, g => {
  // swoosh stripe that sweeps up towards the back
  if (flip) g.setTransform(-1, 0, 0, 1, 1024, 0);
  g.fillStyle = s.stripe; g.beginPath(); g.moveTo(0, 170); g.bezierCurveTo(300, 175, 650, 150, 1024, 60); g.lineTo(1024, 120); g.bezierCurveTo(660, 200, 320, 215, 0, 212); g.closePath(); g.fill();
  g.strokeStyle = s.pin; g.lineWidth = 7; g.beginPath(); g.moveTo(0, 232); g.bezierCurveTo(320, 236, 660, 220, 1024, 140); g.stroke(); g.setTransform(1, 0, 0, 1, 0, 0);
  g.font = 'italic 800 46px "Jua","Arial Black",sans-serif'; g.fillStyle = s.pin; g.textBaseline = 'middle'; g.textAlign = flip ? 'right' : 'left'; g.fillText('ONLINE PARK', flip ? 954 : 70, 110); g.textAlign = 'left';
  g.font = 'italic 900 120px "Arial Black",sans-serif'; g.fillStyle = s.num; g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 8; const num = String(k + 1).padStart(2, '0'), nx = flip ? 90 : 760; g.strokeText(num, nx, 100); g.fillText(num, nx, 100);
  }); fontTex.push(t);
  const m = new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: .35, metalness: .1, polygonOffset: true, polygonOffsetFactor: -2 });
  decalCache.set(key, m); return m;
}

function seatShell(parent, m, x, z){
  const g = new THREE.Group(); g.position.set(x, .25, z); parent.add(g);
  // bucket seat: pan + reclined back + headrest, rounded edges
  add(g, profile([[.26, .38], [.26, .5], [.26, .55, .12, .55], [-.1, .55], [-.2, .6, -.24, .7], [-.33, 1.02], [-.35, 1.16, -.26, 1.2], [-.3, 1.26, -.42, 1.22], [-.48, 1.0], [-.44, .62], [-.4, .4]], .5, .045), m.seat);
  // side bolsters in the accent colour
  for (const sx of [-.235, .235]) add(g, profile([[.24, .44], [.24, .62], [-.14, .66], [-.3, 1.0], [-.4, .98], [-.36, .5]], .05, .02), m.bolster).position.x = sx;
  // padded lap bar on a chrome post
  const post = add(g, new THREE.CylinderGeometry(.03, .035, .42, 10), m.chrome, 0, .42, .42); post.rotation.x = -.35;
  const bar = add(g, new THREE.CylinderGeometry(.055, .055, .44, 14), m.pad, 0, .66, .3); bar.rotation.z = Math.PI / 2;
  for (const sx of [-.22, .22]) add(g, new THREE.SphereGeometry(.055, 12, 10), m.pad, sx, .66, .3);
  return g;
}

function build(k, n, scheme, env){
  const m = mats(scheme, env), car = new THREE.Group(); car.name = 'coasterCar' + k;
  const front = k === 0, last = k === n - 1, HW = .81;
  const zf = 1.06, zb = -1.1; // body ends (cars sit 2.55 m apart, so curves keep a gap)
  // lower hull: full width, rounded
  add(car, profile([[zb, .06], [zb, .36], [zb + .1, .44], [zf - .1, .44], [zf, .36], [zf, .12], [zf - .06, .04, zf - .2, .02], [zb + .2, .02], [zb + .06, .04, zb, .1]], HW * 2, .07), m.body);
  // side walls: sculpted, higher at the back of each row
  const wall = [[zb, .3], [zb, .95], [zb + .02, 1.16, zb + .22, 1.12], [-.6, .9], [-.38, .8, -.14, .84], [.2, .9], [.42, .8, .62, .78], [zf - .1, .76], [zf + .02, .72, zf, .45], [zf, .3]];
  for (const sx of [-1, 1]){ const w = add(car, profile(wall, .1, .035), m.body); w.position.x = sx * (HW - .05);
    // decal on the outer face
    const d = add(car, new THREE.PlaneGeometry(2.3, .575), decal(k, scheme, sx < 0), sx * (HW + .002), .52, -.01); d.rotation.y = sx * Math.PI / 2; d.castShadow = false;
    // chrome edge trim along the wall top
    const trim = new THREE.CatmullRomCurve3([V(0, .95, zb + .02), V(0, 1.13, zb + .22), V(0, .9, -.6), V(0, .82, -.3), V(0, .88, .2), V(0, .8, .6), V(0, .76, zf - .1)]);
    add(car, new THREE.TubeGeometry(trim, 40, .022, 8, false), m.chrome).position.x = sx * (HW - .05);
    // LED strip along the lower edge
    add(car, new THREE.BoxGeometry(.02, .025, 2.05), m.led, sx * (HW + .005), .1, 0).castShadow = false;
  }
  // floor & footwells
  add(car, new THREE.BoxGeometry(1.45, .04, 2.1), m.floor, 0, .45, -.02);
  // dashboard cowl in front of the front row, with a chrome grab rail
  add(car, profile([[.76, .44], [.76, .74], [.8, .88, .96, .88], [zf + .02, .84, zf + .02, .55], [zf, .44]], 1.5, .05), m.body);
  add(car, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(-.6, .84, .86), V(-.62, 1.0, .86), V(0, 1.04, .86), V(.62, 1.0, .86), V(.6, .84, .86)]), 30, .025, 8, false), m.chrome);
  // seats: front row at z .42, rear row at z -.55
  const seats = [];
  for (const z of [.44, -.5]) for (const sx of [-.37, .37]){ seatShell(car, m, sx, z); seats.push(V(sx, .83, z)); }
  // rear deck behind the back row, with a stripe across
  add(car, profile([[zb, .44], [zb, .98], [zb + .04, 1.16, zb + .22, 1.13], [-.98, .8], [-.95, .44]], 1.5, .05), m.body);
  add(car, profile([[zb + .02, .99], [zb + .06, 1.14, zb + .22, 1.12], [zb + .23, 1.07], [zb + .07, 1.08, zb + .04, .97]], 1.52, .015), m.stripe);

  if (front){
    // sculpted nose: long, low, rounded, with headlights, grille and a small windscreen
    add(car, profile([[zf - .05, .04], [1.62, .08], [1.95, .12, 1.98, .3], [1.98, .42, 1.78, .52], [1.42, .78], [zf + .05, .86], [zf - .05, .7]], 1.56, .12, 20), m.body);
    add(car, profile([[1.5, .62], [1.72, .5], [1.86, .45, 1.9, .38], [1.92, .36], [1.78, .53], [1.5, .66]], 1.58, .015), m.stripe);
    for (const sx of [-.46, .46]){ const l = add(car, new THREE.CylinderGeometry(.1, .1, .04, 20), m.lamp, sx, .3, 1.99); l.rotation.x = Math.PI / 2; const rim = add(car, new THREE.TorusGeometry(.105, .018, 8, 24), m.chrome, sx, .3, 1.985); }
    add(car, new THREE.BoxGeometry(.5, .14, .05), m.grille, 0, .26, 1.985); add(car, new THREE.BoxGeometry(.54, .02, .06), m.chrome, 0, .34, 1.985);
    const ws = add(car, new THREE.CylinderGeometry(.95, .95, .3, 24, 1, true, -.7, 1.4), m.glass, 0, 1.05, .52); ws.rotation.x = -.35; ws.scale.set(.82, 1, .42); ws.castShadow = false;
    // badge
    const bc = document.createElement('canvas'); bc.width = bc.height = 128; const bg = bc.getContext('2d'); bg.fillStyle = SCHEMES[scheme].stripe; bg.beginPath(); bg.arc(64, 64, 60, 0, Math.PI * 2); bg.fill(); bg.font = '76px sans-serif'; bg.textAlign = 'center'; bg.textBaseline = 'middle'; bg.fillText('🎢', 64, 70);
    const bt = new THREE.CanvasTexture(bc); bt.encoding = THREE.sRGBEncoding; const badge = add(car, new THREE.CircleGeometry(.11, 24), new THREE.MeshStandardMaterial({ map: bt, roughness: .3, metalness: .2 }), 0, .56, 1.735); badge.rotation.x = -.62;
  } else {
    // drawbar to the car in front
    const db = add(car, new THREE.CylinderGeometry(.05, .05, .5, 10), m.frame, 0, .04, zf + .12); db.rotation.x = Math.PI / 2;
    add(car, new THREE.SphereGeometry(.075, 12, 10), m.chrome, 0, .04, zf + .36);
  }
  if (last){
    // low rear bumper with tail lights, and a spoiler on two struts above the rear deck
    add(car, profile([[zb + .06, .06], [zb - .14, .1], [zb - .2, .24, zb - .15, .44], [zb + .06, .5]], 1.5, .05), m.body);
    for (const sx of [-.48, .48]) add(car, new THREE.BoxGeometry(.3, .06, .03), m.tail, sx, .3, zb - .21).castShadow = false;
    for (const sx of [-.55, .55]) add(car, new THREE.BoxGeometry(.05, .2, .08), m.satin, sx, 1.2, zb + .1);
    const sp = add(car, new THREE.BoxGeometry(1.5, .04, .3), m.stripe, 0, 1.31, zb + .08); sp.rotation.x = .12;
  }
  // chassis: frame, two bogies with road wheels on the rails and guide wheels on the sides, brake fin
  for (const sx of [-.45, .45]) add(car, new THREE.BoxGeometry(.08, .1, 2.0), m.frame, sx, -.02, 0);
  for (const z of [-.78, .78]){
    add(car, new THREE.BoxGeometry(1.36, .09, .16), m.frame, 0, -.06, z);
    for (const sx of [-1, 1]){
      const x = sx * .55;
      add(car, new THREE.BoxGeometry(.08, .34, .34), m.frame, x + sx * .1, -.2, z); // bogie cheek outside the rail
      wheel(car, m, .12, .085, x, -.09, z + .12); wheel(car, m, .12, .085, x, -.09, z - .12); // road wheels
      wheel(car, m, .07, .06, x + sx * .17, -.3, z, 'y'); // side guide wheel
    }
  }
  add(car, new THREE.BoxGeometry(.02, .16, 1.6), m.satin, 0, -.2, 0); // brake fin
  return { group: car, seats };
}
return (k, n) => { const b = build(k, n, 'red', envMap()); mergeByMaterial(b.group); return b; };
})();

/* ---------- avatars: seeded chibi characters with outfits (same system as the cafe, chars/*.glb) ---------- */
function rng(seed){ let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const LOOK = {
  skin: ['#f8dfca', '#f2d0b4', '#e9bd96', '#d6a37a', '#b07c55', '#85593b'],
  hair: ['#2a1d18', '#3d2a20', '#5e3f2c', '#8a5a3a', '#b98a5a', '#d4a94f', '#9b9590', '#8e3f32', '#d88fa6', '#7c9cc4', '#6b4f8a'],
  top: ['#e9a37c', '#9cc6b6', '#f0d27a', '#a9b9ea', '#e6a7c2', '#cdb594', '#f4ecdf', '#7f9bb5', '#c96f5a', '#8fb08a', '#3f5570', '#e7d9c4', '#b7a0d6', '#f2b8a0'],
  bottom: ['#3f4a5a', '#5a6b7d', '#d9cbb4', '#2f2a27', '#7a5a44', '#8fa0b8', '#c9b28c', '#55705f'],
  shoe: ['#f4efe6', '#4a3b33', '#2a2a2a', '#c96f5a', '#7f9bb5', '#e8c46a'],
};
const HAIR_STYLES = 8, HAT_TYPES = 4;
function lookFrom(seed){
  const r = rng(seed), pick = a => a[(r() * a.length) | 0];
  const L = { skin: pick(LOOK.skin), hair: pick(LOOK.hair), style: (r() * HAIR_STYLES) | 0, top: pick(LOOK.top), longSleeve: r() < .5, stripe: r() < .2,
    bottom: pick(LOOK.bottom), skirt: r() < .24, shorts: false, shoe: pick(LOOK.shoe), hat: r() < .3 ? (r() * HAT_TYPES) | 0 : -1, hatC: pick(LOOK.top),
    glasses: r() < .26, scarf: r() < .13, scarfC: pick(LOOK.top), phones: r() < .1, phonesC: pick(LOOK.top), size: .92 + r() * .13, wide: .9 + r() * .2, happy: r() < .22, freckles: r() < .15 };
  L.shorts = !L.skirt && r() < .22;
  if (L.style === 5 && L.hat < 0) L.hat = 0;
  // chibi: hairstyle and hair colour come from the seed (random with 다른 모습 뽑기)
  // girls (8 hairstyles): dress, or a top with a skirt or shorts; boys (2 hairstyles): a top with long pants or shorts
  L.male = r() < .35; L.style = L.male ? 8 + ((seed >>> 1) & 1) : (seed >>> 1) & 7;
  L.dress = !L.male && r() < .4; L.outfitC = (r() * DRESS_COLORS.length) | 0;
  L.top = r() < .55 ? 'tshirt' : 'tank'; L.bottom = L.male ? (r() < .55 ? 'pants' : 'short') : (r() < .55 ? 'skirt' : 'short');
  L.topC = (r() * TOP_COLORS.length) | 0; L.botC = (r() * BOTTOM_COLORS.length) | 0; L.shoeC = (r() * SHOE_COLORS.length) | 0;
  L.outfit = L.dress ? 0 : OUTFIT_KEY[L.top]; L.hairIdx = ((seed >>> 3) & 15) % HAIR_COLORS.length; L.hair = HAIR_COLORS[L.hairIdx][1]; L.size = .96 + r() * .08;
  return L;
}
const HIP = .44;
/* ---------- chibi avatars: one body rigged in the page, 8 hairstyles, face decal (chars/chibi.glb) ---------- */
const HAIR_KEYS = ['twin', 'bob', 'fluffy', 'sidetail', 'wavy', 'braid', 'bunears', 'x7', 'm1', 'm2'];
const MALE_HAIRS = ['m1', 'm2'];   // separate files chars/hair_<key>.glb, no hair-coloured scalp
const HAIR_NAMES = ['트윈테일', '긴 생머리', '레이어드 컷', '웨이브 양갈래', '긴 웨이브', '옆 땋은 머리', '단발', '낮은 양묶음', '짧은 웨이브', '넘긴 머리'];
const HAIR_COLORS = [['흑갈색', '#2b2220'], ['다크 브라운', '#4a2e22'], ['초코', '#5e3a29'], ['밤색', '#7a4b32'], ['캐러멜', '#a8714a'], ['금발', '#d9b77a'],
  ['애쉬 그레이', '#a9a4a2'], ['와인', '#8a3b45'], ['핑크', '#e7a0b5'], ['하늘', '#9ab6e2'], ['라벤더', '#b49ad8'], ['민트', '#9cc9b7']];
// outfits (more to come): each is a mesh already fitted to the chibi body in chars/outfits/<key>.glb
const OUTFITS = [{ key: 'dress', name: '드레스' }, { key: 'tshirt', name: '티셔츠' }, { key: 'tank', name: '나시' }, { key: 'short', name: '반바지' }, { key: 'skirt', name: '플리츠 치마' }];
const OUTFIT_KEY = Object.fromEntries(OUTFITS.map((o, i) => [o.key, i]));
const TOP_COLORS = [['화이트', '#f4efe6'], ['하늘', '#a9c6ee'], ['네이비', '#3f5570'], ['민트', '#a7d6c3'], ['레몬', '#f2dc8e'], ['핑크', '#e7a0b5'], ['세이지', '#8fb08a'], ['라벤더', '#b3a2db'], ['코랄', '#f2b8a0'], ['차콜', '#4a4a50']];
const BOTTOM_COLORS = [['데님', '#3f5570'], ['연청', '#7f9bb5'], ['베이지', '#d9cbb4'], ['카키', '#8a8a5c'], ['브라운', '#7a5a44'], ['블랙', '#2f2a27'], ['아이보리', '#f4efe6'], ['그레이', '#8c8c90']];
const SHOE_COLORS = ['#4a3b33', '#f4efe6', '#2a2a2a', '#c96f5a', '#7d9fd6', '#d9b45a'];
const DRESS_COLORS = [['더스티 핑크', '#c9a6bb', '#b98aa4'], ['라벤더', '#b3a2db', '#8f7cc0'], ['민트', '#a7d6c3', '#6fae98'], ['하늘', '#a9c6ee', '#7d9fd6'],
  ['레몬', '#f2dc8e', '#d9b45a'], ['피치', '#f3b39c', '#d98a72'], ['아이보리', '#f4efe6', '#c9b7a6'], ['네이비', '#3f5570', '#2b3a52']];
const CHIBI_S = .83;     // model units → metres (about the height of the old avatar)
const CB = (() => {
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  // joints measured from the mesh (model units, Y up, facing +Z)
  const J = {
    hips: V3(0, .47, .02), spine: V3(0, .6, .02), chest: V3(0, .72, 0), neck: V3(0, .86, 0), head: V3(0, .93, .02), headEnd: V3(0, 1.66, 0),
    'shoulder.L': V3(.07, .79, 0), 'upperArm.L': V3(.135, .79, 0), 'foreArm.L': V3(.33, .79, 0), 'hand.L': V3(.48, .785, 0), 'handEnd.L': V3(.59, .79, 0),
    'thigh.L': V3(.1, .47, .02), 'shin.L': V3(.11, .24, .03), 'foot.L': V3(.135, .075, .02), 'toe.L': V3(.15, .02, .12),
  };
  for (const k of Object.keys(J)) if (k.endsWith('.L')) J[k.replace('.L', '.R')] = V3(-J[k].x, J[k].y, J[k].z);
  const parentOf = { spine: 'hips', chest: 'spine', neck: 'chest', head: 'neck', 'shoulder.L': 'chest', 'upperArm.L': 'shoulder.L', 'foreArm.L': 'upperArm.L', 'hand.L': 'foreArm.L', 'thigh.L': 'hips', 'shin.L': 'thigh.L', 'foot.L': 'shin.L' };
  const tailOf = { hips: 'spine', spine: 'chest', chest: 'neck', neck: 'head', head: 'headEnd', 'shoulder.L': 'upperArm.L', 'upperArm.L': 'foreArm.L', 'foreArm.L': 'hand.L', 'hand.L': 'handEnd.L', 'thigh.L': 'shin.L', 'shin.L': 'foot.L', 'foot.L': 'toe.L' };
  for (const m of [parentOf, tailOf]) for (const k of Object.keys(m)) if (k.endsWith('.L')) m[k.replace('.L', '.R')] = m[k].replace('.L', '.R');
  const names = Object.keys(tailOf);
  const segDist = (p, a, b) => { const ab = b.clone().sub(a), t = THREE.MathUtils.clamp(p.clone().sub(a).dot(ab) / ab.lengthSq(), 0, 1); return p.distanceTo(a.clone().addScaledVector(ab, t)); };
  // which bones a vertex may follow, by body region, so arms never pull the torso and legs never pull each other
  const allowed = p => { const s = p.x >= 0 ? 'L' : 'R', ax = Math.abs(p.x);
    if (p.y > .9) return ['head', 'neck'];
    if (p.y > .67 && ax > .12 && p.y < .9) return ['chest', 'shoulder.' + s, 'upperArm.' + s, 'foreArm.' + s, 'hand.' + s];
    if (p.y > .84) return ['neck', 'chest', 'head'];
    if (p.y < .43) return ['thigh.' + s, 'shin.' + s, 'foot.' + s, 'hips'];
    if (p.y < .56) return ['hips', 'spine', 'thigh.' + s];
    return ['spine', 'chest', 'hips', 'shoulder.' + s, 'neck']; };
  const skin = geo => { const pos = geo.attributes.position, n = pos.count, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4), p = new THREE.Vector3();
    for (let i = 0; i < n; i++){ p.fromBufferAttribute(pos, i);
      const cand = allowed(p).map(b => ({ b, d: segDist(p, J[b], J[tailOf[b]]) })).sort((a, c) => a.d - c.d).slice(0, 3);
      let tot = 0; cand.forEach(c => { c.w = 1 / Math.pow(c.d + .012, 4); tot += c.w; });
      cand.forEach((c, k) => { si[i * 4 + k] = names.indexOf(c.b); sw[i * 4 + k] = c.w / tot; }); }
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4)); };
  let G = null; const waiting = [], hairMats = new Map(), skinMats = new Map(), clothMats = new Map();
  const ready = gl => { if (G) return; G = {}; gl.scene.traverse(o => { if (o.isMesh){ const g = o.geometry; g.computeVertexNormals(); G[o.name] = g; if (o.name === 'face'){ const m = o.material; G.faceMat = new THREE.MeshStandardMaterial({ map: m.map, transparent: true, alphaTest: .05, depthWrite: false, roughness: .7, polygonOffset: true, polygonOffsetFactor: -2 }); if (m.map){ m.map.encoding = THREE.sRGBEncoding; m.map.anisotropy = 4; } } } });
    smooth(G.body); skin(G.body); makeShells(); let left = 2; const go = () => { if (--left === 0) waiting.splice(0).forEach(f => f()); }; loadOutfits(go); loadMaleHair(go); };
  // socks, shoes and a hidden under-layer are offset copies of the body surface, so they bend with the same bones
  function makeShells(){ const g = G.body, P = g.attributes.position, N = g.attributes.normal, idx = g.index.array, p = new THREE.Vector3();
    const shell = (test, d) => { const pos = new Float32Array(P.count * 3); for (let i = 0; i < P.count; i++){ pos[i * 3] = P.getX(i) + N.getX(i) * d; pos[i * 3 + 1] = P.getY(i) + N.getY(i) * d; pos[i * 3 + 2] = P.getZ(i) + N.getZ(i) * d; }
      const keep = []; for (let t = 0; t < idx.length; t += 3){ let ok = true; for (let q = 0; q < 3; q++){ p.fromBufferAttribute(P, idx[t + q]); if (!test(p)) ok = false; } if (ok) keep.push(idx[t], idx[t + 1], idx[t + 2]); }
      const s = new THREE.BufferGeometry(); s.setAttribute('position', new THREE.BufferAttribute(pos, 3)); s.setAttribute('normal', N); s.setAttribute('skinIndex', g.attributes.skinIndex); s.setAttribute('skinWeight', g.attributes.skinWeight); s.setIndex(keep); return s; };
    G.socks = shell(p => p.y < .2, .009); G.shoes = shell(p => p.y < .095, .024); G.under = shell(p => p.y > .58 && p.y < .8 && Math.abs(p.x) < .21, .008);
    // long pants (boys): the hips and legs pushed out, a little wider towards the hem
    { const pos = new Float32Array(P.count * 3); for (let i = 0; i < P.count; i++){ const y = P.getY(i), d = .02 + (y < .3 ? .018 * (.3 - y) / .2 : 0) + (y > .5 ? .004 : 0); pos[i * 3] = P.getX(i) + N.getX(i) * d; pos[i * 3 + 1] = y + N.getY(i) * d; pos[i * 3 + 2] = P.getZ(i) + N.getZ(i) * d; }
      const keep = []; for (let t = 0; t < idx.length; t += 3){ let ok = true; for (let q = 0; q < 3; q++){ const y = P.getY(idx[t + q]); if (!(y > .085 && y < .625)) ok = false; } if (ok) keep.push(idx[t], idx[t + 1], idx[t + 2]); }
      const s = new THREE.BufferGeometry(); s.setAttribute('position', new THREE.BufferAttribute(pos, 3)); s.setAttribute('normal', N); s.setAttribute('skinIndex', g.attributes.skinIndex); s.setAttribute('skinWeight', g.attributes.skinWeight); s.setIndex(keep); G.outfit_pants = s; } }
  function loadMaleHair(done){ let left = MALE_HAIRS.length; const fin = () => { if (--left === 0) done(); };
    MALE_HAIRS.forEach(k => { const url = 'chars/hair_' + k + '.glb', ok = gl => { let m; gl.scene.traverse(x => { if (x.isMesh && !m) m = x; }); m.geometry.computeVertexNormals(); G['hair_' + k] = m.geometry; fin(); };
      if (!THREE.GLTFLoader) return fin(); const ld = new THREE.GLTFLoader(); ld.load(url, ok, undefined, () => {
        fetch(url + '.txt').then(r => r.ok ? r.text() : Promise.reject()).then(b64 => { const bin = Uint8Array.from(atob(b64.trim()), c => c.charCodeAt(0)); ld.parse(bin.buffer, 'chars/', ok, fin); }).catch(fin); }); }); }
  function loadOutfits(done){ let left = OUTFITS.length; const fin = () => { if (--left === 0) done(); };
    OUTFITS.forEach(o => { const url = 'chars/outfits/' + o.key + '.glb', ok = gl => { let m; gl.scene.traverse(x => { if (x.isMesh && !m) m = x; }); const g = m.geometry; g.computeVertexNormals(); skin(g);
        // skirt below the waist follows the hips and, lower down, partly the thigh on its side
        const P = g.attributes.position, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight, BI = n => names.indexOf(n);
        if (o.key === 'dress' || o.key === 'skirt') for (let i = 0; i < P.count; i++) if (P.getY(i) < .63){ const t = Math.min(1, (.63 - P.getY(i)) / .43), w = .6 * Math.pow(t, 1.3); SI.setXYZW(i, BI('hips'), BI(P.getX(i) >= 0 ? 'thigh.L' : 'thigh.R'), 0, 0); SW.setXYZW(i, 1 - w, w, 0, 0); }
        G['outfit_' + o.key] = g; fin(); };
      if (!THREE.GLTFLoader) return fin(); const ld = new THREE.GLTFLoader(); ld.load(url, ok, undefined, () => {
        fetch(url + '.txt').then(r => r.ok ? r.text() : Promise.reject()).then(b64 => { const bin = Uint8Array.from(atob(b64.trim()), c => c.charCodeAt(0)); ld.parse(bin.buffer, 'chars/', ok, fin); }).catch(fin); }); }); }
  // vertices at the same spot share one normal, so the body shades smoothly instead of showing facet lines
  function smooth(geo){ const P = geo.attributes.position, N = geo.attributes.normal, key = i => `${P.getX(i).toFixed(4)},${P.getY(i).toFixed(4)},${P.getZ(i).toFixed(4)}`, acc = new Map(), idx = geo.index ? geo.index.array : null, cnt = idx ? idx.length : P.count;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), fn = new THREE.Vector3();
    for (let t = 0; t < cnt; t += 3){ const i0 = idx ? idx[t] : t, i1 = idx ? idx[t + 1] : t + 1, i2 = idx ? idx[t + 2] : t + 2;
      a.fromBufferAttribute(P, i0); b.fromBufferAttribute(P, i1); c.fromBufferAttribute(P, i2); fn.subVectors(c, b).cross(a.sub(b));
      for (const i of [i0, i1, i2]){ const k = key(i); let v = acc.get(k); if (!v) acc.set(k, v = new THREE.Vector3()); v.add(fn); } }
    for (let i = 0; i < P.count; i++){ const v = acc.get(key(i)).clone().normalize(); N.setXYZ(i, v.x, v.y, v.z); } N.needsUpdate = true; }
  if (THREE.GLTFLoader){ const ld = new THREE.GLTFLoader(); ld.load('chars/chibi.glb', ready, undefined, () => {
    fetch('chars/chibi.glb.txt').then(r => r.ok ? r.text() : Promise.reject()).then(b64 => { const bin = Uint8Array.from(atob(b64.trim()), c => c.charCodeAt(0)); ld.parse(bin.buffer, 'chars/', ready, () => {}); }).catch(() => {}); }); }
  const matFor = (map, hex, o) => { if (!map.has(hex)) map.set(hex, new THREE.MeshStandardMaterial(Object.assign({ color: C(hex) }, o))); return map.get(hex); };
  // put the body, hair, scalp and face on an avatar (now, or as soon as chars/chibi.glb has loaded)
  const dress = a => {
    const B = {}; names.forEach(nm => { const b = new THREE.Bone(); b.name = nm.replace('.', '_'); B[nm] = b; });
    names.forEach(nm => { const pa = parentOf[nm], b = B[nm]; if (pa){ B[pa].add(b); b.position.copy(J[nm]).sub(J[pa]); } else b.position.copy(J[nm]); });
    const body = new THREE.SkinnedMesh(G.body, matFor(skinMats, a.L.skin, { roughness: .55, skinning: true }));
    body.add(B.hips); body.bind(new THREE.Skeleton(names.map(nm => B[nm]))); body.castShadow = true; body.receiveShadow = true; body.frustumCulled = false;
    const hm = matFor(hairMats, a.L.hair, { roughness: .6, side: THREE.DoubleSide }), key = HAIR_KEYS[a.L.style];
    const onHead = (geo, m, cast) => { const o = new THREE.Mesh(geo, m); o.position.copy(J.head).negate(); o.castShadow = cast; B.head.add(o); return o; };
    if (G['hair_' + key]) onHead(G['hair_' + key], hm, true); if (!MALE_HAIRS.includes(key)) onHead(key === 'braid' ? G.scalpLo : G.scalp, hm, false); onHead(G.face, G.faceMat, false).renderOrder = 1;
    B['hand.L'].add(a.holder); a.holder.position.set(.05, .01, .045);
    a.g.add(body); a.B = B;
    // outfit
    const L = a.L, dc = DRESS_COLORS[L.outfitC], cloth = hex => matFor(clothMats, hex, { roughness: .9, side: THREE.DoubleSide, skinning: true });
    const wear = (geo, m) => { if (!geo) return; const o = new THREE.SkinnedMesh(geo, m); o.bind(body.skeleton, body.bindMatrix); o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; a.g.add(o); };
    if (L.dress){ const cm = cloth(dc[1]); wear(G.outfit_dress, cm); wear(G.under, cm); }
    else { wear(G['outfit_' + L.top], cloth(TOP_COLORS[L.topC][1])); wear(G['outfit_' + L.bottom], cloth(BOTTOM_COLORS[L.botC][1])); }
    wear(G.socks, matFor(clothMats, '#fbf6f0', { roughness: .85, skinning: true })); wear(G.shoes, matFor(clothMats, L.dress ? dc[2] : SHOE_COLORS[L.shoeC], { roughness: .45, skinning: true }));
  };
  return { J, whenReady: f => { if (G) f(); else waiting.push(f); }, dress };
})();
function makeAvatar(seed){
  const L = lookFrom(seed);
  const g = new THREE.Group(); g.scale.setScalar(L.size * CHIBI_S);
  const a = { g, L, B: null, holder: new THREE.Group(), phase: rand(0, 10), seed, waveK: 0, handsK: 0, handsUp: false,
    pos: new THREE.Vector3(), rot: 0, moving: false, sit: false, seat: -1, rideP: null, rideQ: null,
    waveUntil: 0, item: -1, itemObj: null, bubbleUntil: 0, tag: null };
  CB.whenReady(() => CB.dress(a));
  return a;
}
const SIT_DROP = HIP - .06;
const lookColor = L => L.dress ? DRESS_COLORS[L.outfitC][1] : TOP_COLORS[L.topC][1]; // name-tag dot: the outfit colour // seat surface → avatar origin (× size)

/* snacks you can hold */
const ITEMS = [
  { name: '솜사탕', desc: '구름처럼 폭신한 딸기 솜사탕', price: '3,000', emoji: '🍭' },
  { name: '츄러스', desc: '설탕 듬뿍 시나몬 츄러스', price: '3,500', emoji: '🥖' },
  { name: '풍선', desc: '어떤 색이 나올지는 받아 봐야 알아요', price: '2,000', emoji: '🎈', balloon: true },
  { name: '아이스크림', desc: '바닐라 소프트콘', price: '2,500', emoji: '🍦' },
  { name: '핫도그', desc: '케첩 지그재그 핫도그', price: '3,000', emoji: '🌭' },
];
const BALLOON = ITEMS.findIndex(it => it.balloon);
/* balloon colors: picked at random each time you buy one (synced so everyone sees the same color) */
const BALLOON_COLORS = [['빨간', '#ff5a5a'], ['주황', '#ff9a3c'], ['노란', '#ffd43b'], ['연두', '#a9e34b'], ['초록', '#40c057'], ['민트', '#63e6be'],
  ['하늘색', '#7cc4ff'], ['파란', '#3b7dff'], ['남색', '#4c4fd6'], ['보라', '#9b6bff'], ['라벤더', '#d0bfff'], ['분홍', '#ff8fd0'],
  ['핫핑크', '#f03e8c'], ['코랄', '#ff8a7a'], ['살구', '#ffc9a0'], ['하얀', '#f8f6f0'], ['금색', '#e8b64a'], ['은색', '#c9d1db']];
const isBalloon = i => i === BALLOON;
function makeItem(i, bc = 0){
  const g = new THREE.Group();
  if (i === 0){ cyl(.012, .012, .28, M('#f4ecdf'), g, 0, -.12, 0, 5); const c = sph(.13, M('#f7a8c8', { roughness: 1 }), g, 0, .2, 0, 12); c.scale.set(1, 1.15, 1); sph(.08, M('#fbc4dc', { roughness: 1 }), g, .07, .26, .04, 8); }
  else if (i === 1){ const c = mesh(new THREE.CylinderGeometry(.03, .032, .42, 7), M('#c98a4a', { roughness: .8 }), g, 0, .12, 0); c.rotation.z = .12; }
  else if (i === BALLOON){ const col = (BALLOON_COLORS[bc] || BALLOON_COLORS[0])[1]; const s = new THREE.Group(); g.add(s); s.userData.balloon = true;
    beam(V(0, 0, 0), V(0, 1.0, 0), .004, M('#ffffff'), s, 3, false); const b = sph(.22, M(col, { roughness: .25 }), s, 0, 1.22, 0, 14); b.scale.y = 1.18; mesh(new THREE.ConeGeometry(.04, .06, 6), M(col), s, 0, .98, 0, false).rotation.x = Math.PI; }
  else if (i === 3){ const c = mesh(new THREE.ConeGeometry(.055, .18, 10), M('#d9a35a'), g, 0, 0, 0); c.rotation.x = Math.PI; sph(.065, M('#fff6e6', { roughness: .6 }), g, 0, .11, 0, 10); const tip = mesh(new THREE.ConeGeometry(.04, .08, 10), M('#fff6e6'), g, 0, .18, 0); }
  else if (i === 4){ cyl(.008, .008, .12, M('#e8d8b8'), g, 0, -.1, 0, 4); const d = cyl(.035, .035, .2, M('#d98a3c'), g, 0, 0, 0, 8); cyl(.025, .025, .23, M('#b4452f'), g, 0, -.015, 0, 8); }
  g.traverse(o => { if (o.isMesh) o.castShadow = false; });
  return g;
}
function setItem(a, i, bc = 0){ if (!isBalloon(i)) bc = 0; if (a.item === i && (a.itemColor || 0) === bc) return; a.item = i; a.itemColor = bc; if (a.itemObj){ a.holder.remove(a.itemObj); a.itemObj = null; } if (i >= 0 && ITEMS[i]){ a.itemObj = makeItem(i, bc); a.holder.add(a.itemObj); } }

/* names and speech bubbles are HTML laid over the canvas, so they keep the same size at any zoom */
const tagLayer = $('#tags');
function ensureTag(a){ if (a.tag) return a.tag; const el = document.createElement('div'); el.className = 'tag'; const bub = document.createElement('div'); bub.className = 'bub'; bub.hidden = true; const nm = document.createElement('div'); nm.className = 'nm'; nm.hidden = true; el.append(bub, nm); tagLayer.appendChild(el); a.tag = { el, bub, nm, shown: true }; return a.tag; }
function removeTag(a){ if (a && a.tag){ a.tag.el.remove(); a.tag = null; } }
function setLabel(a, text, color){ const t = ensureTag(a); t.nm.textContent = ''; const i = document.createElement('i'); i.style.background = color || '#fff5e8'; t.nm.append(i, document.createTextNode(text)); t.nm.hidden = false; }
function say(a, text, dur = 6500, emo = false){ const t = ensureTag(a); t.bub.classList.toggle('emo', emo); if (emo){ t.bub.style.animation = 'none'; void t.bub.offsetWidth; t.bub.style.animation = ''; } t.bub.textContent = text; t.bub.hidden = false; t.bub.style.opacity = 1; a.bubbleUntil = performance.now() + dur; }
const projV = new THREE.Vector3();
function placeTag(a, obj, h, visible, now){
  const t = a.tag; if (!t) return;
  if (!t.bub.hidden){ const life = a.bubbleUntil - now; if (life <= 0) t.bub.hidden = true; else t.bub.style.opacity = Math.min(1, life / 350); }
  let show = visible && (!t.bub.hidden || !t.nm.hidden), x = 0, y = 0;
  if (show){ obj.getWorldPosition(projV); projV.y += h; if (projV.distanceToSquared(camera.position) > 110 * 110 && t.bub.hidden) show = false; else { projV.project(camera); x = (projV.x * .5 + .5) * innerWidth; y = (-projV.y * .5 + .5) * innerHeight; if (projV.z > 1 || x < -150 || x > innerWidth + 150 || y < -40 || y > innerHeight + 260) show = false; } }
  if (show !== t.shown){ t.el.style.display = show ? '' : 'none'; t.shown = show; }
  if (show) t.el.style.transform = `translate3d(${x.toFixed(1)}px,${(y - 4).toFixed(1)}px,0) translate(-50%,-100%)`;
}

/* poses: walk, idle, sit (benches and rides), hands up on the big drops, wave, hold a snack */
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), mix3 = (p, q, k) => p.map((v, i) => v + (q[i] - v) * k);
function poseAvatar(a, dt, t){
  const now = performance.now();
  if (a.rideP){ a.g.position.copy(a.rideP); a.g.quaternion.copy(a.rideQ); }
  else { a.g.position.copy(a.pos); a.g.rotation.set(0, lerpAngle(a.g.rotation.y, a.rot, Math.min(1, dt * 10)), 0); }
  if (a.moving) a.phase += dt * 8; else a.phase += dt * 1.3;
  a.waveK += ((now < a.waveUntil ? 1 : 0) - a.waveK) * Math.min(1, dt * 7);
  a.handsK += ((a.handsUp ? 1 : 0) - a.handsK) * Math.min(1, dt * 5);
  const B = a.B; if (!B) return;
  const J = CB.J, R = (n, x = 0, y = 0, z = 0) => B[n].rotation.set(x, y, z);
  for (const k in B) B[k].rotation.set(0, 0, 0); B.hips.position.copy(J.hips);
  const ph = a.phase, s = Math.sin(ph), co = Math.cos(ph), br = Math.sin(t * 2 + a.phase * .3);
  let uaL = [0, 0, -1.22], uaR = [0, 0, 1.22], faL = [0, 0, 0], faR = [0, 0, 0];
  if (a.sit){
    B.hips.position.y = .53; B.hips.position.z = J.hips.z - .04;
    for (const [sd, o, m] of [['L', 0, 1], ['R', 2.2, -1]]){ const sw = Math.sin(t * 2.6 + a.phase + o); R('thigh.' + sd, -1.5, 0, m * .02); R('shin.' + sd, 1.3 + .14 * sw); R('foot.' + sd, .15 - .08 * sw); }
    R('spine', .04 + .012 * br); R('chest', .02 + .01 * br);
    uaL = [-.75, 0, -1.3]; uaR = [-.75, 0, 1.3]; faL = [0, -.45, 0]; faR = [0, .45, 0];
  } else if (a.moving){
    const leg = (sd, sg) => { const f = sg * s, sw = sg * co, th = -.42 * f - .05, knee = .15 + .75 * Math.pow(Math.max(0, sw), 1.5) + .1 * Math.max(0, -f);
      R('thigh.' + sd, th); R('shin.' + sd, knee); R('foot.' + sd, -(th + knee) * .55 + .12 * Math.max(0, -f)); };
    leg('L', 1); leg('R', -1);
    B.hips.position.y = J.hips.y - .012 + .014 * Math.cos(2 * ph); R('hips', 0, .1 * s, .03 * s);
    R('spine', .06); R('chest', 0, -.16 * s, 0); R('head', -.03 + .02 * Math.cos(2 * ph));
    uaL = [.45 * s, 0, -1.22]; uaR = [-.45 * s, 0, 1.22]; faL = [0, -.2 - .15 * Math.max(0, -s), 0]; faR = [0, .2 + .15 * Math.max(0, s), 0];
  } else {
    R('spine', .012 * br); R('chest', .01 * br); uaL[2] -= .02 * br; uaR[2] += .02 * br;
  }
  B.neck.rotation.y = a.moving || a.rideP ? 0 : Math.sin(t * .35 + a.phase) * .3;
  B.head.rotation.z += Math.sin(t * .5 + a.phase * 2) * .04;
  // snack in the left hand (a sip/bite now and then)
  if (a.itemObj){ const balloon = isBalloon(a.item); const bite = !balloon && !a.moving && Math.sin(t * .4 + a.phase) > .93; uaL = balloon ? [-.35, 0, -.9] : bite ? [-.95, 0, -.95] : [-.55, 0, -1.15]; faL = balloon ? [0, -.7, 0] : bite ? [0, -1.95, 0] : [0, -1.3, 0]; }
  // hands up on drops and big swings
  const hu = a.handsK;
  if (hu > .01){ const w = Math.sin(t * 9) * .12 * hu; uaL = mix3(uaL, [-.25, 0, 1.25 + w], hu); uaR = mix3(uaR, [-.25, 0, -1.25 - w], hu); faL = mix3(faL, [0, 0, .25], hu); faR = mix3(faR, [0, 0, -.25], hu); B.head.rotation.x -= .25 * hu; }
  // right hand waves beside the cheek
  const u = a.waveK;
  if (u > .01 && hu < .5){ const w = Math.sin(t * TAU * 2.2) * u;
    uaR = mix3(uaR, [0, .85, -.15], u); faR = mix3(faR, [0, .15, -1.2 - .4 * w], u);
    R('hand.R', 0, 0, -.1 * u - .2 * w); B['shoulder.R'].rotation.z = -.12 * u; B.head.rotation.z += .1 * u; }
  B['shoulder.L'].rotation.z -= .08; B['shoulder.R'].rotation.z += .08;
  R('upperArm.L', ...uaL); R('upperArm.R', ...uaR); R('foreArm.L', ...faL); R('foreArm.R', ...faR);
  // keep snacks upright whatever the arm is doing (balloons also sway)
  if (a.itemObj){ a.holder.parent.getWorldQuaternion(_q1).invert(); a.g.getWorldQuaternion(_q2); if (a.rideP) _q2.identity(); a.holder.quaternion.copy(_q1.multiply(_q2));
    if (isBalloon(a.item)){ const b = a.itemObj.children[0]; b.rotation.z = Math.sin(t * 1.3 + a.phase) * .12; b.rotation.x = Math.cos(t * 1.1 + a.phase) * .1; } }
}

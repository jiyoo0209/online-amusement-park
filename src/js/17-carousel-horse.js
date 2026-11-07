/* ---------- carousel horses: the rearing cartoon horse (assets/rides/carousel_horse.glb) in 8 paint schemes ----------
   The model's origin is the saddle seat; it faces +z like the ride's horse groups. All 16 horses share one geometry per part and
   are drawn as instanced meshes (one per part and finish), so the whole herd costs about a dozen draw calls. */
const HORSE_SCHEMES = [
  { body: '#f3ede2', mane: '#e8bf5a', saddle: '#d9473f', tack: 'gold', hoof: 'gold' },     // 화이트 & 골드
  { body: '#f4a7c3', mane: '#fff3f7', saddle: '#2f9c98', tack: 'gold', hoof: '#d9839f' },  // 벚꽃 핑크
  { body: '#b9784a', mane: '#4e2f22', saddle: '#3f7fc9', tack: 'gold', hoof: '#3b2a22' },  // 밤색
  { body: '#8fc0ee', mane: '#fbf6ee', saddle: '#ef7f2f', tack: 'gold', hoof: '#6f9fd0' },  // 하늘색
  { body: '#2f2a2c', mane: '#f4efe6', saddle: '#e2b456', tack: '#c23b3b', hoof: '#1d191a' }, // 블랙 & 레드
  { body: '#b598e6', mane: '#6a46b0', saddle: '#f2c443', tack: 'gold', hoof: '#8f72c4' },  // 라일락
  { body: '#86d8b9', mane: '#f28a55', saddle: '#d9473f', tack: 'gold', hoof: '#5fb894' },  // 민트
  { body: 'goldbody', mane: '#fff1c9', saddle: '#b5283a', tack: '#7d1f33', hoof: 'gold' }  // 골드 메탈
];
const HORSE_SCALE = 1.45, HORSE_AT = V(0, .38, -.08);
const HORSE_TILT = -.44;   // the seat leans back with the rearing horse (about half the horse's pitch)
// horses: [{ g }] where g is the bobbing horse group (a child of parent). Returns { update() } to call after the groups move.
function buildCarouselHorses(parent, horses){
  const vis = { ims: [], update(){} };
  if (!THREE.GLTFLoader) return vis;
  new THREE.GLTFLoader().load('rides/carousel_horse.glb', gl => {
    const env = envMap(), geo = {};
    gl.scene.updateMatrixWorld(true);
    gl.scene.traverse(o => { if (!o.isMesh) return; const k = (o.material && o.material.name) || o.name;
      const g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld); for (const a of Object.keys(g.attributes)) if (a !== 'position' && a !== 'normal') g.deleteAttribute(a);
      (geo[k] = geo[k] || []).push(g); });
    const join = names => { const l = [].concat(...names.map(n => geo[n] || [])); if (!l.length) return null;
      return l.length === 1 ? l[0] : THREE.BufferGeometryUtils ? THREE.BufferGeometryUtils.mergeBufferGeometries(l, false) : l[0]; };
    const parts = { body: join(['body']), hoof: join(['hoof']), mane: join(['mane']), saddle: join(['saddle']), tack: join(['strap', 'bridle']), eye: join(['eye']) };
    // every instance sits within the carousel, so cull the herd as one carousel-sized sphere in the parent's space
    const bound = new THREE.Sphere(V(0, 2, 0), 7.5);
    const paint = o => new THREE.MeshPhysicalMaterial(Object.assign({ color: 0xffffff, roughness: .38, metalness: 0, clearcoat: .85, clearcoatRoughness: .12, envMap: env, envMapIntensity: .35 }, o));
    const mats = {
      gold: new THREE.MeshPhysicalMaterial({ color: C('#e2b04a'), metalness: .95, roughness: .28, envMap: env, envMapIntensity: 1.2, clearcoat: .6, clearcoatRoughness: .2 }),
      goldbody: new THREE.MeshPhysicalMaterial({ color: C('#e0b24f'), metalness: .85, roughness: .3, envMap: env, envMapIntensity: 1.15, clearcoat: .8, clearcoatRoughness: .15 }),
      eye: new THREE.MeshPhysicalMaterial({ color: C('#1b1411'), roughness: .08, clearcoat: 1, clearcoatRoughness: .02, envMap: env, envMapIntensity: 1.4 }),
      body: paint({}), hoof: paint({ roughness: .3 }), mane: paint({ roughness: .45, clearcoat: .5 }), saddle: paint({ roughness: .4, clearcoat: .9 }), tack: paint({ roughness: .35 })
    };
    for (const part of Object.keys(parts)){
      const g = parts[part]; if (!g) continue; g.boundingSphere = bound;
      const groups = new Map();
      horses.forEach((h, i) => { const s = HORSE_SCHEMES[i % HORSE_SCHEMES.length], v = part === 'eye' ? 'eye' : s[part];
        const kind = v === 'gold' || v === 'goldbody' || v === 'eye' ? v : 'paint';
        if (!groups.has(kind)) groups.set(kind, []); groups.get(kind).push({ i, col: v }); });
      for (const [kind, list] of groups){
        const im = new THREE.InstancedMesh(g, kind === 'paint' ? mats[part] : mats[kind], list.length);
        if (kind === 'paint') list.forEach((e, j) => im.setColorAt(j, C(e.col)));
        im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        im.castShadow = part === 'body' || part === 'mane'; im.receiveShadow = true;
        im.userData.horses = list.map(e => e.i); parent.add(im); vis.ims.push(im);
      }
    }
    const off = new THREE.Matrix4().compose(HORSE_AT, new THREE.Quaternion(), V(HORSE_SCALE, HORSE_SCALE, HORSE_SCALE)), hm = horses.map(() => new THREE.Matrix4());
    vis.update = () => {
      horses.forEach((h, i) => { h.g.updateMatrix(); hm[i].multiplyMatrices(h.g.matrix, off); });
      for (const im of vis.ims){ const l = im.userData.horses; for (let j = 0; j < l.length; j++) im.setMatrixAt(j, hm[l[j]]); im.instanceMatrix.needsUpdate = true; }
    };
    vis.update();
  }, undefined, () => console.warn('carousel horse model failed to load'));
  return vis;
}

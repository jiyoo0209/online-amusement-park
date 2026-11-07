/* ---------- shared helpers for detailed ride models (coaster cars, gondolas) ---------- */
// A soft studio reflection for glossy paint, chrome and glass. Only the ride models use it; the rest of the park keeps its flat look.
let envTex;
function envMap(){ if (envTex !== undefined) return envTex; envTex = null;
  try { if (THREE.RoomEnvironment){ const pm = new THREE.PMREMGenerator(renderer); envTex = pm.fromScene(new THREE.RoomEnvironment(), .04).texture; pm.dispose(); } } catch (e){ envTex = null; }
  return envTex; }
// one mesh per material: same look, a fraction of the draw calls
function mergeByMaterial(root){
  if (!THREE.BufferGeometryUtils) return;
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert(), buckets = new Map(), meshes = [];
  root.traverse(o => { if (o.isMesh) meshes.push(o); });
  for (const o of meshes){
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.clearGroups();
    const key = o.material.uuid; if (!buckets.has(key)) buckets.set(key, { mat: o.material, geos: [], cast: false });
    const b = buckets.get(key); b.geos.push(g); b.cast = b.cast || o.castShadow;
  }
  while (root.children.length) root.remove(root.children[0]);
  for (const b of buckets.values()){
    const geo = THREE.BufferGeometryUtils.mergeBufferGeometries(b.geos, false); b.geos.forEach(g => g.dispose()); if (!geo) continue;
    const m = new THREE.Mesh(geo, b.mat); m.castShadow = b.cast; m.receiveShadow = true; root.add(m);
  }
  meshes.forEach(o => o.geometry.dispose());
}

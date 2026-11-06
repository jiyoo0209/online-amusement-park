/* ---------- the only NPC: the snack stand clerk ---------- */
const vendor = (() => {
  const a = makeAvatar(918273645); scene.add(a.g);
  // beside the cart, facing the plaza (cart at (9.5, 21.5), turned -2.4 rad)
  const r = -2.4, lx = 2.05, lz = .35;
  a.pos.set(9.5 + lx * Math.cos(r) + lz * Math.sin(r), 0, 21.5 - lx * Math.sin(r) + lz * Math.cos(r)); a.rot = r; a.g.rotation.y = r; obC(a.pos.x, a.pos.z, .45); CB.whenReady(() => act(a.g, { type: 'snack' }));
  setItem(a, 0); setLabel(a, '매점 직원', '#ff8fae');
  return { a, sayT: 4, waveT: 9 };
})();
const VENDOR_LINES = ['어서오세요! 솜사탕 방금 나왔어요', '츄러스 따끈따끈해요', '풍선 하나 들고 다니면 사진이 예뻐요', '아이스크림 녹기 전에 드세요', '롤러코스터 타기 전에 간식 어때요?', '천천히 구경하세요'];
function updateVendor(dt, t){
  const v = vendor, near = me && Math.hypot(me.pos.x - v.a.pos.x, me.pos.z - v.a.pos.z) < 9;
  v.sayT -= dt; v.waveT -= dt;
  if (near && v.sayT < 0){ v.sayT = rand(7, 12); say(v.a, VENDOR_LINES[(Math.random() * VENDOR_LINES.length) | 0], 4200); }
  if (near && v.waveT < 0){ v.waveT = rand(10, 16); v.a.waveUntil = performance.now() + 2000; }
  poseAvatar(v.a, dt, t);
}

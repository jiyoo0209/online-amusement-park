/* ---------- NPCs: riders who fill some seats, and visitors strolling the plaza (same on every screen) ---------- */
const npcRiders = rides.map(() => new Map()); // ride index → seat → avatar
function npcSeed(ri, i){ return 1 + Math.floor(hash01(ri, i, 77) * 2147483000); }
function updateNpcRiders(t, dt, tt){
  rides.forEach((r, ri) => {
    const taken = occupiedSeats(r); if (myRide.id === ri && !myRide.queued) taken.add(myRide.seat);
    const pool = npcRiders[ri];
    for (let i = 0; i < r.seats.length; i++){
      const key = r.npcKey(i, t), want = hash01(ri, key, i) < r.density && !taken.has(i);
      let a = pool.get(i);
      if (!want){ if (a) a.g.visible = false; continue; }
      if (!a){ a = makeAvatar(npcSeed(ri, i)); scene.add(a.g); pool.set(i, a); if (hash01(ri, i, 5) < .3) setItem(a, 2 + (i % 2)); }
      a.g.visible = true; seatAvatar(a, r, i);
      a.handsUp = rideHands(r, t) && hash01(ri, key, i, 9) < .75;
      if (a.g.position.distanceToSquared(camera.position) < 90 * 90) poseAvatar(a, dt, tt); else { a.g.position.copy(a.rideP); a.g.quaternion.copy(a.rideQ); }
    }
  });
}
const WALK_ROUTES = (() => {
  const circle = (r, n, cw) => { const p = []; for (let i = 0; i < n; i++){ const a = (cw ? -1 : 1) * i / n * TAU; p.push(V(PLAZA.x + Math.cos(a) * r, 0, PLAZA.z + Math.sin(a) * r)); } return p; };
  const pl = pts => pts.map(([x, z]) => V(x, 0, z));
  return [
    { pts: circle(8.5, 24, false), sp: 1.05, n: 3 }, { pts: circle(10.2, 28, true), sp: 1.15, n: 2 },
    { pts: pl([[1.6, 18], [1.6, 30], [-1.6, 30], [-1.6, 18]]), sp: 1.1, n: 1 }, { pts: pl([[1.3, -2], [1.3, -21.6], [-1.3, -21.6], [-1.3, -2]]), sp: 1.2, n: 1 },
    { pts: pl([[13.5, 8.6], [21.5, 11.6], [21.5, 12.8], [13.5, 10.2]]), sp: 1.0, n: 1 }, { pts: pl([[-12.6, 9.6], [-11.2, 2.0], [-10.2, 2.4], [-11.4, 10.2]]), sp: .9, n: 1 },
  ].map(r => { const seg = []; let L = 0; r.pts.forEach((p, i) => { const q = r.pts[(i + 1) % r.pts.length], d = p.distanceTo(q); seg.push({ p, q, d, s: L }); L += d; }); return Object.assign(r, { seg, L }); });
})();
const LINES = ['롤러코스터 또 타자!', '솜사탕 먹고 싶다', '관람차 꼭대기에서 사진 찍자', '바이킹 맨 끝자리가 제일 무서워', '회전목마 너무 예쁘다', '자이로드롭 진짜 높다…', '다음엔 뭐 탈까?', '오늘 날씨 딱 좋다', '분수 앞에서 만나', '풍선 하나 살까?'];
const walkers = [];
WALK_ROUTES.forEach((r, ri) => { for (let k = 0; k < r.n; k++){ const a = makeAvatar(npcSeed(9 + ri, k)); scene.add(a.g); const w = { a, r, off: k / r.n * r.L + hash01(ri, k) * 3 }; if (hash01(ri, k, 3) < .55) setItem(a, [0, 2, 3, 4, 1][(ri + k) % 5]); walkers.push(w); } });
let walkerSayT = 6;
function updateWalkers(t, dt, tt){
  for (const w of walkers){
    const s = ((t * w.r.sp + w.off) % w.r.L + w.r.L) % w.r.L; const sg = w.r.seg.find(g => s >= g.s && s < g.s + g.d) || w.r.seg[0];
    const k = (s - sg.s) / sg.d; w.a.pos.lerpVectors(sg.p, sg.q, k); w.a.rot = Math.atan2(sg.q.x - sg.p.x, sg.q.z - sg.p.z); w.a.moving = true;
    if (w.a.g.position.distanceToSquared(camera.position) < 90 * 90) poseAvatar(w.a, dt, tt); else w.a.g.position.copy(w.a.pos);
  }
  walkerSayT -= dt;
  if (walkerSayT < 0){ walkerSayT = rand(5, 10); const w = walkers[(Math.random() * walkers.length) | 0]; if (w && w.a.g.position.distanceTo(camera.position) < 40) say(w.a, LINES[(Math.random() * LINES.length) | 0], 4200); }
}

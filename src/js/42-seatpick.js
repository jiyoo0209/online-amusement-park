/* ---------- seat picker: choose where to sit ----------
   Opens when you pick a ride. You walk to the entrance as before; at boarding time you sit in the seat you chose
   (on the Ferris wheel you choose a gondola, either of its two seats). "아무 자리나" takes any free seat. */
const seatPick = { id: -1, timer: 0 };
const isWheel = r => !!r.gondolas;
// seats that satisfy a choice: on the wheel a choice is a gondola (either of its two seats)
function wantSeats(r, want){ if (want < 0) return []; return isWheel(r) ? [want & ~1, (want & ~1) + 1] : [want]; }
function seatName(r, i){
  if (r.id === 'coaster'){ const c = i >> 2, j = i & 3; return c === 0 && j < 2 ? `맨 앞자리 ${j % 2 ? '왼쪽' : '오른쪽'}` : `${c + 1}번 칸 ${j < 2 ? '앞줄' : '뒷줄'} ${j % 2 ? '왼쪽' : '오른쪽'}`; }
  if (r.id === 'viking'){ const row = Math.floor(i / 3), col = i % 3; return `${row + 1}열 ${['왼쪽', '가운데', '오른쪽'][col]}${row === 0 || row === 5 ? ' · 맨 끝' : ''}`; }
  if (r.id === 'carousel') return i < 10 ? `바깥쪽 ${i + 1}번 목마` : `안쪽 ${i - 9}번 목마`;
  if (r.id === 'wheel') return `${(i >> 1) + 1}번 곤돌라`;
  return `${i + 1}번 자리`;
}
function seatWait(r, t){ return r.wait(t); }
// where each seat (or gondola) sits on the little map, in 0..1 of the map box; ratio = width / height
function seatLayout(r, t){
  const S = [];
  if (r.id === 'coaster'){
    // numbers read left to right, front row first (seat j: 0 = front right, 1 = front left, 2 = rear right, 3 = rear left)
    for (let i = 0; i < 16; i++){ const c = i >> 2, j = i & 3, left = j % 2 === 1, row = j < 2 ? 0 : 1; S.push({ i, label: c * 4 + row * 2 + (left ? 1 : 2), x: left ? .36 : .64, y: .075 + c * .232 + (row ? .158 : .062) }); }
    return { ratio: .7, cls: 'coaster', seats: S };
  }
  if (r.id === 'viking'){
    const rows = [-4.5, -3.1, -1.7, 1.7, 3.1, 4.5];
    for (let i = 0; i < 18; i++){ const row = Math.floor(i / 3), col = i % 3; S.push({ i, x: .5 + rows[row] / 11.5, y: .5 + (col - 1) * .25 }); }
    return { ratio: 1.75, cls: 'viking', seats: S };
  }
  if (r.id === 'carousel'){
    for (let i = 0; i < 16; i++){ const outer = i < 10, a = outer ? i / 10 * TAU : (i - 10) / 6 * TAU + .3, rr = outer ? .4 : .24; S.push({ i, x: .5 + Math.cos(a) * rr, y: .5 + Math.sin(a) * rr }); }
    return { ratio: 1, cls: 'carousel', seats: S };
  }
  if (r.id === 'wheel'){
    for (let k = 0; k < 12; k++){ const v = r.turnAt(t) + k / 12, f = v - Math.floor(v), a = -Math.PI / 2 + f * TAU; S.push({ i: k * 2, x: .5 + Math.cos(a) * .39, y: .5 - Math.sin(a) * .39, gondola: k }); }
    return { ratio: 1, cls: 'wheel', seats: S };
  }
  for (let i = 0; i < 10; i++){ const a = i / 10 * TAU; S.push({ i, x: .5 + Math.cos(a) * .36, y: .5 + Math.sin(a) * .36 }); }
  return { ratio: 1, cls: 'drop', seats: S };
}
function remoteOn(r, i){ for (const x of remotes.values()) if (x.rd === r.index && x.rs === i && !x.q) return x; return null; }
function seatedHere(id){ return myRide.id === id && !myRide.queued; }
function canSwitchNow(r, t){ return seatedHere(r.index) && r.open(t).includes(myRide.seat); }

function openSeatPick(id){
  const r = rideById(id); if (!r || !me) return;
  setRideMenuOpen(false); setEmoOpen(false);
  seatPick.id = id; renderSeatPick(); $('#seatPick').hidden = false; syncJoy();
  clearInterval(seatPick.timer); seatPick.timer = setInterval(renderSeatPick, 500);
}
function closeSeatPick(){ if ($('#seatPick').hidden) return; $('#seatPick').hidden = true; clearInterval(seatPick.timer); seatPick.id = -1; syncJoy(); }
function renderSeatPick(){
  const r = rideById(seatPick.id); if (!r) return closeSeatPick();
  const t = nowS(), riding = seatedHere(r.index), going = myRide.id === r.index || ctrl.goRide === r.index;
  if (!riding && !going) return closeSeatPick();
  const openNow = r.open(t), sw = canSwitchNow(r, t), want = wantSeats(r, myRide.want);
  $('#spTitle').textContent = `${r.emoji} ${r.name} 자리 고르기`;
  let sub;
  if (riding) sub = sw ? `지금 ${seatName(r, myRide.seat)} · 출발 전이라 바꿀 수 있어요` : '운행 중이에요 · 끝나면 자동으로 내려요';
  else if (want.length){ const w = seatWait(r, t, want[0]); sub = `${seatName(r, want[0])} · ${w <= 0 ? '지금 탈 수 있어요' : `${Math.ceil(w)}초 뒤 탑승`}`; }
  else sub = `아무 자리나 · ${r.status(t)}`;
  $('#spSub').textContent = sub;
  const L = seatLayout(r, t), map = $('#spMap');
  map.className = 'spmap ' + L.cls; map.style.aspectRatio = String(L.ratio); map.style.maxWidth = L.ratio < 1 ? `${Math.round(300 * L.ratio)}px` : '';
  // ride outline drawn once per ride type
  if (map.dataset.ride !== r.id){ map.dataset.ride = r.id; map.textContent = '';
    const deco = document.createElement('div'); deco.className = 'deco'; deco.setAttribute('aria-hidden', 'true');
    if (r.id === 'coaster'){ for (let c = 0; c < 4; c++){ const car = document.createElement('i'); car.className = 'car'; car.style.top = `${4.6 + c * 23.2}%`; car.textContent = `0${c + 1}`; deco.appendChild(car); } const f = document.createElement('b'); f.textContent = '▲ 앞'; deco.appendChild(f); }
    else if (r.id === 'viking'){ const h = document.createElement('i'); h.className = 'hull'; deco.appendChild(h); const f = document.createElement('b'); f.textContent = '🐉'; deco.appendChild(f); }
    else if (r.id === 'wheel'){ const w = document.createElement('i'); w.className = 'rim'; deco.appendChild(w); const g = document.createElement('b'); g.textContent = '탑승'; deco.appendChild(g); }
    else { const p = document.createElement('i'); p.className = 'disc'; deco.appendChild(p); const c = document.createElement('i'); c.className = 'core'; deco.appendChild(c); }
    map.appendChild(deco);
    const seatsEl = document.createElement('div'); seatsEl.className = 'seats'; map.appendChild(seatsEl);
  }
  const box = map.querySelector('.seats'); box.textContent = '';
  for (const s of L.seats){
    const b = document.createElement('button'); b.type = 'button'; b.className = 'seat';
    b.style.left = `${(s.x * 100).toFixed(2)}%`; b.style.top = `${(s.y * 100).toFixed(2)}%`;
    const ids = isWheel(r) ? [s.i, s.i + 1] : [s.i];
    const who = ids.map(i => remoteOn(r, i)).filter(Boolean), mine = riding && ids.includes(myRide.seat), chosen = !riding && want.includes(s.i);
    const full = who.length >= ids.length && !mine;
    // during boarding a taken seat really is taken; while the ride runs, its riders get off before the next boarding
    const takenNow = full && ids.some(i => openNow.includes(i));
    const disabled = riding ? (mine || !sw || !ids.some(i => openNow.includes(i) && !remoteOn(r, i))) : takenNow;
    if (isWheel(r)){ b.classList.add('gon'); b.style.setProperty('--c', buildGondola.colors[s.gondola % buildGondola.colors.length]); b.textContent = String(s.gondola + 1); if (ids.some(i => openNow.includes(i))) b.classList.add('here'); }
    else b.textContent = String(s.label || s.i + 1);
    if (who.length){ b.classList.add('taken'); const dot = document.createElement('i'); dot.style.background = lookColor(who[0].a.L); dot.textContent = [...who[0].name][0] || ''; b.appendChild(dot); }
    if (mine) b.classList.add('mine'); if (chosen) b.classList.add('chosen');
    b.disabled = disabled && !mine;
    b.setAttribute('aria-label', seatName(r, s.i) + (mine ? ' (내 자리)' : chosen ? ' (고른 자리)' : who.length ? ` (${who.map(w => w.name).join(', ')})` : ''));
    b.onclick = () => chooseSeat(r, s.i);
    box.appendChild(b);
  }
  $('#spAny').hidden = riding; $('#spCancel').textContent = riding ? '닫기' : '안 탈래요';
}
function chooseSeat(r, i){
  const t = nowS();
  if (seatedHere(r.index)){
    const target = (isWheel(r) ? [i, i + 1] : [i]).find(k => r.open(t).includes(k) && !remoteOn(r, k));
    if (target == null || !canSwitchNow(r, t)) return;
    myRide.seat = target; myRide.rec = r.rec(t, target); pushPresence(true); chime(); toast(`${seatName(r, target)}(으)로 옮겼어요`); closeSeatPick(); return;
  }
  myRide.want = i; myRide.clash = null; toast(`💺 ${seatName(r, i)}에 앉을게요`); closeSeatPick();
}
$('#spAny').onclick = () => { myRide.want = -1; closeSeatPick(); toast('남는 자리에 앉을게요'); };
$('#spCancel').onclick = () => {
  const id = seatPick.id; closeSeatPick(); if (seatedHere(id)) return;
  if (myRide.id === id && myRide.queued){ leaveQueue(); toast('줄에서 나왔어요'); }
  if (ctrl.goRide === id){ ctrl.goRide = -1; ctrl.target = null; ctrl.route = []; toast('안 타기로 했어요'); }
  myRide.want = -1;
};
$('#bSeat').onclick = () => { const id = myRide.id >= 0 ? myRide.id : ctrl.goRide; if (id >= 0) openSeatPick(id); };
$('#seatPick').addEventListener('pointerdown', e => e.stopPropagation());

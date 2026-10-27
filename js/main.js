(() => {
  const API_BASE = (window.SMARTROOM_API_BASE || '').replace(/\/$/, '');
  const SCREENS = [
    { id: 'home',    label: 'Beranda',   icon: 'i-home',   tpl: 'tpl-home',    desc: 'Status ruangan, grid sensor 2×2, dan kontrol cepat.' },
    { id: 'room',    label: 'Ruangan',   icon: 'i-room',   tpl: 'tpl-room',    desc: 'Grafik tren harian dan rincian status lingkungan.' },
    { id: 'device',  label: 'Perangkat', icon: 'i-device', tpl: 'tpl-device',  desc: 'Daftar perangkat IoT, status online/offline, dan toggle.' },
    { id: 'ai',      label: 'AI Insight',icon: 'i-spark',  tpl: 'tpl-ai',      desc: 'Rekomendasi AI, alasan, dan umpan balik jempol.' },
    { id: 'profile', label: 'Profil',    icon: 'i-user',   tpl: 'tpl-profile', desc: 'Akun, notifikasi, dan izin privasi sensor.' },
  ];
  const icon = id => `<svg class="icon" aria-hidden="true"><use href="#${id}"/></svg>`;
  const $$ = sel => document.querySelectorAll(sel);

  /* ================= Mockup ponsel ================= */
  const phones = [...$$('[data-phone]')];
  const select = (phone, id) => {
    phone.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.dataset.screen === id));
    phone.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', t.dataset.tab === id));
    phone.querySelector('.screens').scrollTop = 0;
  };
  phones.forEach(phone => {
    phone.innerHTML = `
      <div class="phone-status"><span>09:41</span><span aria-hidden="true">●●● ▭</span></div>
      <div class="screens">${SCREENS.map(s => `<section class="screen" data-screen="${s.id}"></section>`).join('')}</div>
      <nav class="tabbar" role="tablist" aria-label="Navigasi bawah">${SCREENS.map(s =>
        `<button class="tab" role="tab" data-tab="${s.id}" aria-selected="false">${icon(s.icon)}${s.label}</button>`).join('')}</nav>`;
    SCREENS.forEach(s => phone.querySelector(`[data-screen="${s.id}"]`).append(document.getElementById(s.tpl).content.cloneNode(true)));
    phone.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
      select(phone, t.dataset.tab); if (phone.hasAttribute('data-showcase')) syncList(t.dataset.tab);
    }));
    select(phone, 'home');
  });

  const list = document.getElementById('showList');
  const showPhone = document.querySelector('[data-showcase]');
  list.innerHTML = SCREENS.map(s => `<button class="show-item" role="tab" data-id="${s.id}" aria-selected="false">
    <span class="ico">${icon(s.icon)}</span><span><b>${s.label}</b><span>${s.desc}</span></span></button>`).join('');
  function syncList(id) { list.querySelectorAll('.show-item').forEach(b => b.setAttribute('aria-selected', b.dataset.id === id)); }
  list.addEventListener('click', e => {
    const b = e.target.closest('.show-item'); if (!b) return;
    select(showPhone, b.dataset.id); syncList(b.dataset.id);
  });
  syncList('home');

  /* ================= State sensor (simulasi) ================= */
  const DEFAULT = { suhu: 32, lembap: 65, cahaya: 420, orang: 1, lampu: true, kipas: false };
  const state = { ...DEFAULT };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const setText = (key, text) => $$(`[data-bind="${key}"]`).forEach(e => { e.textContent = text; });
  const setBadge = (key, cls, text) => $$(`[data-badge="${key}"]`).forEach(e => { e.className = 'badge ' + cls; e.textContent = text; });

  function render() {
    const hot = state.suhu > 30, cold = state.suhu < 20;
    setText('suhu', `${Math.round(state.suhu)}°C`);
    setText('lembap', `${Math.round(state.lembap)}%`);
    setText('cahaya', `${Math.round(state.cahaya)} lx`);
    setText('orangval', state.orang > 0 ? 'Ada' : 'Kosong');
    setBadge('suhu', hot ? 'err' : cold ? 'info' : 'ok', hot ? 'Tinggi' : cold ? 'Rendah' : 'Normal');
    setBadge('lembap', state.lembap > 70 || state.lembap < 40 ? 'warn' : 'ok', state.lembap > 70 ? 'Tinggi' : state.lembap < 40 ? 'Rendah' : 'Normal');
    setBadge('cahaya', state.cahaya < 300 ? 'warn' : 'ok', state.cahaya < 300 ? 'Redup' : 'Cukup');
    setBadge('orang', state.orang > 0 ? 'info' : 'ok', state.orang > 0 ? `${state.orang} orang` : '0 orang');
    setText('status', hot ? 'Perlu perhatian' : 'Nyaman');
    $$('[data-bind="pill"]').forEach(e => { e.className = 'pill' + (hot ? '' : ' ok'); e.textContent = hot ? 'Suhu tinggi' : 'Semua normal'; });
    $$('[data-readout]').forEach(e => {
      e.textContent = `Simulasi langsung: ${Math.round(state.suhu)}°C · ${Math.round(state.lembap)}% · ${Math.round(state.cahaya)} lx · ${state.orang} orang · lampu ${state.lampu ? 'menyala' : 'mati'} · kipas ${state.kipas ? 'menyala' : 'mati'}`;
    });
  }

  function tick() {
    if (document.hidden) return;
    const r = () => Math.random() - 0.5;
    state.suhu = clamp(state.suhu + (state.kipas ? -0.5 : state.orang > 0 ? 0.25 : 0.05) + r() * 0.4, 24, 36);
    state.lembap = clamp(state.lembap + r() * 2, 40, 80);
    state.cahaya = Math.max(0, (state.lampu ? 420 : 60) + r() * 30);
    render();
  }

  function setDevice(name, on) {
    state[name] = on;
    $$(`[data-device="${name}"]`).forEach(sw => {
      sw.setAttribute('aria-checked', on);
      const st = sw.closest('.row')?.querySelector('[data-state]');
      if (st) st.textContent = st.textContent.replace(/Menyala|Mati/, on ? 'Menyala' : 'Mati');
    });
    render();
  }

  /* ================= AI Insight ================= */
  const SUMBER = {
    claude: 'Dibuat oleh Claude AI dari data sensor',
    aturan: 'Dibuat dari aturan server (AI belum aktif / tidak tersedia)',
    lokal: 'Dibuat dari aturan lokal (server belum terhubung)',
  };
  const PRIO = { tinggi: ['err', 'Prioritas tinggi'], sedang: ['warn', 'Prioritas sedang'], rendah: ['info', 'Prioritas rendah'] };

  // Cadangan jika server tidak bisa dihubungi (mis. dibuka lewat Live Server)
  function aturanLokal(d) {
    if (d.suhu > 30 && !d.kipas && d.orang > 0) return { judul: 'Nyalakan kipas sekarang', ringkasan: 'Suhu ruangan di atas batas nyaman saat ada orang di dalamnya.', alasan: `Suhu ${Math.round(d.suhu)}°C (batas aman 20–30°C) dan ruangan sedang terisi.`, prioritas: 'tinggi', aksi: 'kipas_on' };
    if (d.orang === 0 && d.lampu) return { judul: 'Matikan lampu utama', ringkasan: 'Lampu menyala padahal tidak ada orang di ruangan.', alasan: 'Sensor keberadaan tidak mendeteksi siapa pun.', prioritas: 'sedang', aksi: 'lampu_off' };
    if (d.orang === 0 && d.kipas) return { judul: 'Matikan kipas', ringkasan: 'Kipas menyala di ruangan kosong.', alasan: 'Tidak ada orang yang membutuhkannya.', prioritas: 'sedang', aksi: 'kipas_off' };
    if (d.cahaya < 300 && d.orang > 0 && !d.lampu) return { judul: 'Nyalakan lampu utama', ringkasan: 'Ruangan terlalu redup.', alasan: `Cahaya ${Math.round(d.cahaya)} lx di bawah ideal 300–500 lx.`, prioritas: 'sedang', aksi: 'lampu_on' };
    return { judul: 'Kondisi ruangan nyaman', ringkasan: 'Semua parameter berada di rentang aman.', alasan: 'Suhu, kelembapan, dan cahaya masih dalam batas yang direkomendasikan.', prioritas: 'rendah', aksi: 'none' };
  }

  let current = null, inflight = false, debounce;
  const setLoading = on => {
    $$('.rec, #aiDemo').forEach(e => e.classList.toggle('is-loading', on));
    $$('[data-refresh]').forEach(b => { b.disabled = on; });
    if (on) $$('[data-ai="judul"]').forEach(e => { e.textContent = 'Menganalisis data sensor…'; });
  };

  function showInsight(d) {
    current = d;
    const [cls, label] = PRIO[d.prioritas] || PRIO.rendah;
    $$('[data-ai="judul"]').forEach(e => { e.textContent = d.judul; });
    $$('[data-ai="ringkasan"]').forEach(e => { e.textContent = d.ringkasan; });
    $$('[data-ai="alasan"]').forEach(e => { e.textContent = d.alasan; });
    $$('[data-ai="sumber"]').forEach(e => { e.textContent = SUMBER[d.sumber] || ''; });
    $$('[data-ai="prioritas"]').forEach(e => { e.className = 'badge ' + cls; e.textContent = label; });
    $$('[data-apply]').forEach(b => { b.hidden = d.aksi === 'none'; b.disabled = false; b.style.opacity = ''; b.textContent = 'Terapkan Saran'; });
  }

  async function fetchInsight() {
    if (inflight) return;
    inflight = true; setLoading(true);
    const payload = { suhu: +state.suhu.toFixed(1), kelembapan: Math.round(state.lembap), cahaya: Math.round(state.cahaya),
      orang: state.orang, lampu: state.lampu, kipas: state.kipas, jam: new Date().getHours() };
    let data;
    try {
      const res = await fetch(`${API_BASE}/api/insight`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(res.status);
      data = await res.json();
      if (!data.judul) throw new Error('format');
    } catch {
      data = { ...aturanLokal(payload), sumber: 'lokal' };
    }
    inflight = false; setLoading(false); showInsight(data);
  }
  const refreshSoon = () => { clearTimeout(debounce); debounce = setTimeout(fetchInsight, 800); };

  function applyAction(aksi) {
    const map = { kipas_on: ['kipas', true], kipas_off: ['kipas', false], lampu_on: ['lampu', true], lampu_off: ['lampu', false] };
    if (map[aksi]) setDevice(...map[aksi]);
  }

  /* ================= Interaksi ================= */
  document.addEventListener('click', e => {
    const sw = e.target.closest('.switch');
    if (sw) {
      const on = sw.getAttribute('aria-checked') !== 'true';
      if (sw.dataset.device) { setDevice(sw.dataset.device, on); }
      else sw.setAttribute('aria-checked', on);
    }
    const vote = e.target.closest('[data-vote]');
    if (vote) vote.parentElement.querySelectorAll('[data-vote]').forEach(v => v.setAttribute('aria-pressed', v === vote && vote.getAttribute('aria-pressed') !== 'true'));

    const apply = e.target.closest('[data-apply]');
    if (apply && current) {
      applyAction(current.aksi);
      $$('[data-apply]').forEach(b => { b.textContent = '✓ Saran diterapkan'; b.disabled = true; b.style.opacity = .85; });
      refreshSoon();
    }
    if (e.target.closest('[data-refresh]')) fetchInsight();

    const sim = e.target.closest('[data-sim]')?.dataset.sim;
    if (sim === 'panas') { state.suhu = clamp(state.suhu + 3, 24, 36); render(); refreshSoon(); }
    if (sim === 'orang') { state.orang = state.orang > 0 ? 0 : 1; render(); refreshSoon(); }
    if (sim === 'reset') { Object.assign(state, DEFAULT); setDevice('lampu', DEFAULT.lampu); setDevice('kipas', DEFAULT.kipas); refreshSoon(); }
  });

  const btn = document.getElementById('menuBtn'), nav = document.getElementById('navLinks');
  btn.addEventListener('click', () => { const o = nav.classList.toggle('open'); btn.setAttribute('aria-expanded', o); });
  nav.addEventListener('click', e => { if (e.target.tagName === 'A') { nav.classList.remove('open'); btn.setAttribute('aria-expanded', false); } });

  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: .12 }) : null;
  $$('.reveal').forEach(el => io ? io.observe(el) : el.classList.add('in'));

  /* ================= Mulai ================= */
  render();
  setInterval(tick, 2500);
  fetchInsight();
})();

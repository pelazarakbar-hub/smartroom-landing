(() => {
  const SCREENS = [
    { id: 'home',    label: 'Beranda',  icon: 'i-home',   tpl: 'tpl-home',    desc: 'Status ruangan, grid sensor 2×2, dan kontrol cepat.' },
    { id: 'room',    label: 'Ruangan',  icon: 'i-room',   tpl: 'tpl-room',    desc: 'Grafik tren harian dan rincian status lingkungan.' },
    { id: 'device',  label: 'Perangkat',icon: 'i-device', tpl: 'tpl-device',  desc: 'Daftar perangkat IoT, status online/offline, dan toggle.' },
    { id: 'ai',      label: 'AI Insight',icon: 'i-spark', tpl: 'tpl-ai',      desc: 'Rekomendasi AI, alasan, dan umpan balik jempol.' },
    { id: 'profile', label: 'Profil',   icon: 'i-user',   tpl: 'tpl-profile', desc: 'Akun, notifikasi, dan izin privasi sensor.' },
  ];
  const icon = id => `<svg class="icon" aria-hidden="true"><use href="#${id}"/></svg>`;

  // ---- Bangun ponsel (hero = 1 layar interaktif, showcase = 5 layar) ----
  const phones = [...document.querySelectorAll('[data-phone]')];
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
    SCREENS.forEach(s => phone.querySelector(`[data-screen="${s.id}"]`)
      .append(document.getElementById(s.tpl).content.cloneNode(true)));
    phone.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
      select(phone, t.dataset.tab); if (phone.hasAttribute('data-showcase')) syncList(t.dataset.tab);
    }));
    select(phone, 'home');
  });

  // ---- Daftar layar di section showcase ----
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

  // ---- Interaksi: toggle, jempol, terapkan saran ----
  document.addEventListener('click', e => {
    const sw = e.target.closest('.switch');
    if (sw) {
      const on = sw.getAttribute('aria-checked') !== 'true';
      sw.setAttribute('aria-checked', on);
      const st = sw.closest('.row')?.querySelector('[data-state]');
      if (st) st.textContent = st.textContent.replace(/Menyala|Mati/, on ? 'Menyala' : 'Mati');
    }
    const vote = e.target.closest('[data-vote]');
    if (vote) { vote.parentElement.querySelectorAll('[data-vote]').forEach(v => v.setAttribute('aria-pressed', v === vote && vote.getAttribute('aria-pressed') !== 'true')); }
    const apply = e.target.closest('[data-apply]');
    if (apply) { apply.textContent = '✓ Aturan otomatis dibuat'; apply.disabled = true; apply.style.opacity = .85; }
  });

  // ---- Menu mobile ----
  const btn = document.getElementById('menuBtn'), nav = document.getElementById('navLinks');
  btn.addEventListener('click', () => { const o = nav.classList.toggle('open'); btn.setAttribute('aria-expanded', o); });
  nav.addEventListener('click', e => { if (e.target.tagName === 'A') { nav.classList.remove('open'); btn.setAttribute('aria-expanded', false); } });

  // ---- Reveal on scroll ----
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: .12 }) : null;
  document.querySelectorAll('.reveal').forEach(el => io ? io.observe(el) : el.classList.add('in'));
})();

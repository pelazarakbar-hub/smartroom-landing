# SmartRoom – Landing Page + AI Insight (Claude API)

Tugas Desain UI/UX – Kelompok 4, Informatika 5C (FTI).

## Struktur
```
index.html        # halaman + template layar aplikasi
css/style.css     # design tokens (warna, tipografi)
js/main.js        # mockup ponsel, sensor simulasi, pemanggil API
server.js         # backend Express: menyimpan API key & memanggil Claude
.env.example      # contoh konfigurasi (salin jadi .env)
```

## Menjalankan (lokal)
```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env
# isi ANTHROPIC_API_KEY di file .env
npm start
```
Buka http://localhost:3000

- Tanpa API key, server tetap jalan memakai aturan cadangan (tanpa Claude).
- Jika halaman dibuka lewat Live Server (port 5500), jalankan juga `npm start`, lalu di `index.html` ubah
  `window.SMARTROOM_API_BASE = "http://localhost:3000";`

## Cara kerja AI Insight
```
Browser (data sensor simulasi) -> POST /api/insight -> server.js -> Claude API
                                                         |
                                  JSON {judul, ringkasan, alasan, prioritas, aksi}
```
- API key hanya ada di server (`.env`), tidak pernah dikirim ke browser.
- Input divalidasi & dibatasi rentangnya sebelum masuk ke prompt.
- Perlindungan biaya: rate limit 12 permintaan/menit/IP, batas `MAX_DAILY_CALLS` per hari, cache 60 detik.
- Jika Claude gagal/limit tercapai, server memakai aturan cadangan sehingga halaman tidak rusak.

## Deploy
GitHub Pages **tidak bisa** menjalankan `server.js`. Deploy ke Render / Railway / Vercel (Node), lalu isi
environment variable `ANTHROPIC_API_KEY` di dashboard layanan tersebut. Jangan pernah commit file `.env`.

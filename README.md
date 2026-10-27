# SmartRoom – Landing Page

Landing page untuk **SmartRoom**, sistem monitoring dan otomatisasi ruangan berbasis IoT dan AI.
Tugas Desain UI/UX – Kelompok 4, Informatika 5C (FTI).

## Struktur
```
index.html      # markup + template layar aplikasi
css/style.css   # design tokens (warna, tipografi) dari Tugas Week 6
js/main.js      # mockup ponsel interaktif, toggle, menu mobile
```

## Menjalankan
Tanpa build. Buka `index.html` langsung, atau di VS Code pasang ekstensi **Live Server** lalu klik *Go Live*.

## Design system
- Warna: primary `#0F766E`, secondary `#1E3A8A`, accent `#FBBF24` (teks gelap `#111827`), netral slate, semantik hijau/amber/merah/biru.
- Font: Poppins 600 (judul), Inter 400/500 (isi).
- Kontras mengikuti WCAG 2.1 AA; status selalu berpasangan dengan label teks; mode gelap otomatis (`prefers-color-scheme`).

## Deploy (GitHub Pages)
Repo → Settings → Pages → Source: `main` / `(root)`.

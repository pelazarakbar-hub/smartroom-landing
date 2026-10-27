import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5-5';
const MAX_DAILY_CALLS = Number(process.env.MAX_DAILY_CALLS || 300); // batas biaya
const AI_ENABLED = Boolean(process.env.ANTHROPIC_API_KEY);
const client = AI_ENABLED ? new Anthropic({ timeout: 15000, maxRetries: 1 }) : null; // baca ANTHROPIC_API_KEY dari .env

const app = express();
app.use(express.json({ limit: '10kb' }));
app.use(cors({ origin: process.env.ALLOWED_ORIGIN ? process.env.ALLOWED_ORIGIN.split(',') : true }));

// ---------- Static: hanya file frontend (server.js & .env TIDAK ikut terbuka) ----------
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));

// ---------- Util ----------
const num = (v, min, max, def) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};
function sanitize(b = {}) {
  return {
    suhu: num(b.suhu, -10, 60, 28),
    kelembapan: num(b.kelembapan, 0, 100, 60),
    cahaya: num(b.cahaya, 0, 100000, 300),
    orang: Math.round(num(b.orang, 0, 50, 0)),
    lampu: Boolean(b.lampu),
    kipas: Boolean(b.kipas),
    jam: Math.round(num(b.jam, 0, 23, new Date().getHours())),
  };
}

// Rate limit sederhana per IP + batas panggilan harian
const hits = new Map();
let daily = { day: new Date().toDateString(), count: 0 };
function allowed(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  if (arr.length >= 12) return false;
  arr.push(now);
  hits.set(ip, arr);
  return true;
}
function underDailyCap() {
  const today = new Date().toDateString();
  if (daily.day !== today) daily = { day: today, count: 0 };
  return daily.count < MAX_DAILY_CALLS;
}

// Cache 60 detik untuk kondisi sensor yang (hampir) sama -> hemat biaya
const cache = new Map();
const cacheKey = (d) =>
  [Math.round(d.suhu), Math.round(d.kelembapan / 5), Math.round(d.cahaya / 50), d.orang, d.lampu, d.kipas].join('|');

// ---------- Fallback aturan (dipakai jika API key kosong / AI error) ----------
function aturan(d) {
  if (d.suhu > 30 && !d.kipas && d.orang > 0)
    return { judul: 'Nyalakan kipas sekarang', ringkasan: 'Suhu ruangan di atas batas nyaman saat ada orang di dalamnya.',
      alasan: `Suhu ${d.suhu.toFixed(0)}°C (batas aman 20–30°C) dan ruangan sedang terisi.`, prioritas: 'tinggi', aksi: 'kipas_on' };
  if (d.orang === 0 && d.lampu)
    return { judul: 'Matikan lampu utama', ringkasan: 'Lampu menyala padahal tidak ada orang di ruangan.',
      alasan: 'Sensor keberadaan tidak mendeteksi siapa pun, jadi lampu hanya menghabiskan listrik.', prioritas: 'sedang', aksi: 'lampu_off' };
  if (d.orang === 0 && d.kipas)
    return { judul: 'Matikan kipas', ringkasan: 'Kipas menyala di ruangan kosong.',
      alasan: 'Tidak ada orang yang merasakan hembusan kipas.', prioritas: 'sedang', aksi: 'kipas_off' };
  if (d.cahaya < 300 && d.orang > 0 && !d.lampu)
    return { judul: 'Nyalakan lampu utama', ringkasan: 'Ruangan terlalu redup untuk beraktivitas.',
      alasan: `Intensitas cahaya ${Math.round(d.cahaya)} lx di bawah ideal 300–500 lx.`, prioritas: 'sedang', aksi: 'lampu_on' };
  if (d.kelembapan > 70)
    return { judul: 'Perbaiki sirkulasi udara', ringkasan: 'Kelembapan cukup tinggi.',
      alasan: `Kelembapan ${Math.round(d.kelembapan)}% melewati batas aman 40–70%.`, prioritas: 'rendah', aksi: 'none' };
  return { judul: 'Kondisi ruangan nyaman', ringkasan: 'Semua parameter berada di rentang aman.',
    alasan: 'Suhu, kelembapan, dan cahaya masih dalam batas yang direkomendasikan.', prioritas: 'rendah', aksi: 'none' };
}

// ---------- Claude ----------
const SYSTEM = `Kamu adalah AI Insight pada aplikasi SmartRoom, asisten monitoring ruangan kos berbasis IoT.
Berdasarkan data sensor, beri SATU rekomendasi paling berguna.
Rentang aman: suhu 20-30°C, kelembapan 40-70%, cahaya ideal 300-500 lx.
Balas HANYA satu objek JSON valid tanpa teks lain dan tanpa markdown, dengan kunci:
{"judul": string (maks 6 kata, kalimat perintah),
 "ringkasan": string (1 kalimat, kondisi yang terjadi),
 "alasan": string (1 kalimat, menyebut angka sensor yang jadi dasar),
 "prioritas": "tinggi" | "sedang" | "rendah",
 "aksi": "kipas_on" | "kipas_off" | "lampu_on" | "lampu_off" | "none"}
Pakai bahasa Indonesia yang singkat dan ramah. Pilih "aksi" hanya yang benar-benar bisa mengubah kondisi
(jangan "kipas_on" jika kipas sudah menyala, dst). Jika semuanya normal, prioritas "rendah" dan aksi "none".`;

const PRIORITAS = ['tinggi', 'sedang', 'rendah'];
const AKSI = ['kipas_on', 'kipas_off', 'lampu_on', 'lampu_off', 'none'];

async function tanyaClaude(d) {
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    system: SYSTEM,
    messages: [{
      role: 'user',
      content: `Data sensor saat ini (jam ${d.jam}:00):
- Suhu: ${d.suhu.toFixed(1)} °C
- Kelembapan: ${Math.round(d.kelembapan)} %
- Intensitas cahaya: ${Math.round(d.cahaya)} lx
- Jumlah orang: ${d.orang}
- Lampu utama: ${d.lampu ? 'menyala' : 'mati'}
- Kipas: ${d.kipas ? 'menyala' : 'mati'}`,
    }],
  });
  const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  const raw = JSON.parse(text.match(/\{[\s\S]*\}/)[0]); // toleran jika model menambah teks/markdown
  const out = {
    judul: String(raw.judul || '').slice(0, 80),
    ringkasan: String(raw.ringkasan || '').slice(0, 200),
    alasan: String(raw.alasan || '').slice(0, 240),
    prioritas: PRIORITAS.includes(raw.prioritas) ? raw.prioritas : 'rendah',
    aksi: AKSI.includes(raw.aksi) ? raw.aksi : 'none',
  };
  if (!out.judul || !out.alasan) throw new Error('Format respons AI tidak valid');
  return out;
}

// ---------- API ----------
app.get('/api/health', (_req, res) => res.json({ ok: true, aiEnabled: AI_ENABLED, model: MODEL }));

app.post('/api/insight', async (req, res) => {
  if (!allowed(req.ip)) return res.status(429).json({ error: 'Terlalu banyak permintaan, coba lagi sebentar.' });
  const d = sanitize(req.body);

  const key = cacheKey(d);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < 60_000) return res.json({ ...hit.v, cached: true });

  let result;
  if (client && underDailyCap()) {
    try {
      daily.count++;
      result = { ...(await tanyaClaude(d)), sumber: 'claude' };
    } catch (err) {
      console.error('[Claude error]', err.status || '', err.message);
    }
  }
  if (!result) result = { ...aturan(d), sumber: 'aturan' };

  cache.set(key, { t: Date.now(), v: result });
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`SmartRoom berjalan di http://localhost:${PORT}`);
  console.log(AI_ENABLED ? `Claude AI aktif (model: ${MODEL})` : 'ANTHROPIC_API_KEY belum diisi -> memakai aturan lokal');
});

// Génère les sonneries dans modules/alarm-scheduler/android/src/main/res/raw/*.wav (synthétisées ici : aucun droit d'auteur).
// Chaque fichier est un motif court que l'appli joue en boucle.
// Usage : node scripts/generate-alarm-sounds.mjs
import { Buffer } from "node:buffer";
import { mkdirSync, writeFileSync } from "node:fs";

const SAMPLE_RATE = 44100;
const TAU = 2 * Math.PI;

/** Fréquence d'une note (notation anglo-saxonne, ex. "C5", "F#4"). */
function note(name) {
  const m = /^([A-G])(#?)(\d)$/.exec(name);
  const semis = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 }[m[1]] + (m[2] ? 1 : 0);
  return 440 * 2 ** ((semis + (Number(m[3]) - 4) * 12) / 12);
}

/** Enveloppe : attaque linéaire puis décroissance exponentielle, coupée à `length`. */
function env(local, length, attack = 0.005, decay = 4) {
  if (local < 0 || local >= length) return 0;
  const a = Math.min(1, local / attack);
  const release = Math.min(1, (length - local) / 0.01); // évite les clics en fin de note
  return a * Math.exp(-decay * local) * release;
}

/** Somme de notes { at, length, render(localTime) } sur `duration` secondes, normalisée. */
function render(duration, notes) {
  const n = Math.round(SAMPLE_RATE * duration);
  const out = new Float64Array(n);
  for (const nt of notes) {
    const start = Math.round(nt.at * SAMPLE_RATE);
    const len = Math.round(nt.length * SAMPLE_RATE);
    for (let i = 0; i < len && start + i < n; i++) out[start + i] += nt.render(i / SAMPLE_RATE);
  }
  const peak = out.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1;
  return Int16Array.from(out, (v) => Math.round((v / peak) * 0.9 * 32767));
}

// --- Les sonneries --------------------------------------------------------

/** Bips : trois bips aigus. */
function beeps() {
  const f = note("C6");
  const beep = (at) => ({
    at,
    length: 0.15,
    render: (t) =>
      Math.min(1, t / 0.01, (0.15 - t) / 0.01) *
      (Math.sin(TAU * f * t) * 0.7 + Math.sin(TAU * f * 1.5 * t) * 0.2 + Math.sin(TAU * f * 2 * t) * 0.1),
  });
  return render(1.6, [0, 0.22, 0.44].map(beep));
}

/** Carillon : quatre cloches descendantes (partiels inharmoniques de cloche). */
function chime() {
  const bell = (at, name) => {
    const f = note(name);
    return {
      at,
      length: 1.6,
      render: (t) =>
        env(t, 1.6, 0.003, 2.2) *
        (Math.sin(TAU * f * t) +
          0.5 * Math.sin(TAU * f * 2.76 * t) * Math.exp(-3 * t) +
          0.25 * Math.sin(TAU * f * 5.4 * t) * Math.exp(-6 * t)),
    };
  };
  return render(2.6, [bell(0, "E6"), bell(0.3, "C6"), bell(0.6, "D6"), bell(0.9, "G5")]);
}

/** Marimba : arpège doux et rond. */
function marimba() {
  const hit = (at, name) => {
    const f = note(name);
    return {
      at,
      length: 0.6,
      render: (t) =>
        env(t, 0.6, 0.002, 7) * (Math.sin(TAU * f * t) + 0.3 * Math.sin(TAU * f * 4 * t) * Math.exp(-20 * t)),
    };
  };
  const seq = ["C5", "E5", "G5", "C6", "G5", "E5"];
  return render(1.9, seq.map((n, i) => hit(i * 0.2, n)));
}

/** Digital : double bip électronique façon réveil à affichage LED. */
function digital() {
  const f = 2048;
  const bip = (at) => ({
    at,
    length: 0.08,
    // Onde carrée adoucie (somme des 3 premières harmoniques impaires).
    render: (t) =>
      Math.min(1, t / 0.003, (0.08 - t) / 0.003) *
      (Math.sin(TAU * f * t) + Math.sin(TAU * 3 * f * t) / 3 + Math.sin(TAU * 5 * f * t) / 5),
  });
  return render(1.0, [0, 0.13, 0.4, 0.53].map(bip));
}

/** Montée : notes de plus en plus aiguës, qui réveillent progressivement. */
function rise() {
  const tone = (at, name) => {
    const f = note(name);
    return {
      at,
      length: 0.28,
      render: (t) => env(t, 0.28, 0.01, 3) * (Math.sin(TAU * f * t) + 0.25 * Math.sin(TAU * 2 * f * t)),
    };
  };
  const seq = ["G4", "C5", "E5", "G5", "C6"];
  return render(2.0, seq.map((n, i) => tone(i * 0.16, n)));
}

// --- Écriture des fichiers WAV (PCM 16 bits mono) -------------------------

function toWav(samples) {
  const dataSize = samples.length * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  Buffer.from(samples.buffer).copy(buf, 44);
  return buf;
}

const OUT = "modules/alarm-scheduler/android/src/main/res/raw";
mkdirSync(OUT, { recursive: true });
for (const [id, make] of Object.entries({ beeps, chime, marimba, digital, rise })) {
  const wav = toWav(make());
  writeFileSync(`${OUT}/${id}.wav`, wav);
  console.log(`${OUT}/${id}.wav (${(wav.length / 1024).toFixed(0)} Ko)`);
}

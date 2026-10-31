/* ============================================================
   No Rush Kitchen
   A tiny, timer-free cooking simulator for touch screens.
   Vanilla JS, inline SVG art, Web Audio, optional tilt.
   ============================================================ */
(() => {
  "use strict";

  /* ---------- tiny helpers ---------- */

  const $ = (id) => document.getElementById(id);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (min, max) => min + Math.random() * (max - min);
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = matchMedia("(pointer: coarse)").matches;

  function hexToRgb(hex) {
    const clean = hex.replace("#", "");
    const value = parseInt(clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean, 16);
    return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
  }

  function mixHex(a, b, t) {
    const ca = hexToRgb(a);
    const cb = hexToRgb(b);
    const ratio = clamp(t, 0, 1);
    const r = Math.round(lerp(ca.r, cb.r, ratio));
    const g = Math.round(lerp(ca.g, cb.g, ratio));
    const bl = Math.round(lerp(ca.b, cb.b, ratio));
    return `rgb(${r}, ${g}, ${bl})`;
  }

  function shade(hex, amount = 0.16) {
    const c = hexToRgb(hex);
    const f = 1 - amount;
    return `rgb(${Math.round(c.r * f)}, ${Math.round(c.g * f)}, ${Math.round(c.b * f)})`;
  }

  function vibrate(ms) {
    try { navigator.vibrate?.(ms); } catch { /* not supported */ }
  }

  /* ---------- ingredients and recipes ---------- */

  const ING = {
    patty: { name: "Patty", chop: false, station: "grill", bits: ["#b96b43", "#7f3f28", "#e0a07b"] },
    lettuce: { name: "Lettuce", chop: true, station: "board", bits: ["#7fb45e", "#a8d47b", "#5c9448"] },
    tomato: { name: "Tomato", chop: true, station: "board", bits: ["#e2574c", "#f08a72", "#b9342b"] },
    cheese: { name: "Cheese", chop: false, station: "plate", bits: ["#f2c14e", "#ffe07c", "#d89b20"] },
    onion: { name: "Onion", chop: true, station: "board", bits: ["#c99bd4", "#e8cdee", "#a978b9"] },
    pickle: { name: "Pickle", chop: false, station: "plate", bits: ["#8bb548", "#b9dc72", "#6b982f"] },
  };

  const RECIPES = {
    classic: { name: "Classic Burger", items: ["patty", "lettuce", "tomato"] },
    cheeseburger: { name: "Cheeseburger", items: ["patty", "cheese", "pickle"] },
    deluxe: { name: "Deluxe Stack", items: ["patty", "cheese", "lettuce", "tomato", "onion"] },
    garden: { name: "Garden Crunch", items: ["cheese", "lettuce", "tomato", "onion", "pickle"] },
    smoky: { name: "Smoky Stack", items: ["patty", "cheese", "onion", "pickle"] },
    sunrise: { name: "Sunrise Burger", items: ["patty", "lettuce", "tomato", "cheese"] },
  };

  const CUSTOMERS = [
    { name: "Maya", recipe: "classic", line: "A classic burger, please. I’m in no hurry.", skin: "#c98a63", hair: "#44291f", shirt: "#e2574c", bg: "#f8d1b0", style: "bun", earrings: true },
    { name: "Theo", recipe: "cheeseburger", line: "Cheeseburger for me — extra pickle if you feel like it.", skin: "#f0c6a4", hair: "#c26a3b", shirt: "#4d9b9b", bg: "#cfe6dd", style: "curly", glasses: true },
    { name: "June", recipe: "deluxe", line: "The works, please. I’ve got nowhere to be.", skin: "#8d5a3e", hair: "#241b1a", shirt: "#f2c14e", bg: "#f5b9c2", style: "afro", earrings: true },
    { name: "Sam", recipe: "garden", line: "Something crunchy and green. Surprise me!", skin: "#d6a07a", hair: "#6a5b53", shirt: "#8d77b8", bg: "#d9c9f0", style: "short", glasses: true },
    { name: "Rosa", recipe: "smoky", line: "I love a smoky burger. Take your sweet time.", skin: "#b97652", hair: "#a53d2b", shirt: "#5d8d63", bg: "#f4c6a1", style: "wavy", earrings: true },
    { name: "Ben", recipe: "sunrise", line: "A sunny burger sounds perfect right about now.", skin: "#f3cba9", hair: "#d9a84c", shirt: "#5c86b8", bg: "#c9ddf3", style: "cap", cap: "#e2574c" },
  ];

  const TRAY_ORDER = ["patty", "lettuce", "tomato", "cheese", "onion", "pickle"];
  const SAVE_KEY = "no-rush-kitchen-v1";
  const START_HEAT = 45;

  /* ---------- state ---------- */

  const state = {
    coins: 0,
    stars: 0,
    served: 0,
    sound: true,
    orderIndex: 0,
    order: CUSTOMERS[0],
    plate: [],
    pattyQuality: null,
    board: { item: null, chop: 0 },
    grill: { patty: false, doneness: 0, flipped: false, burnt: false, heat: START_HEAT, perfectNotified: false },
    paused: false,
    tilt: {
      enabled: false,
      hasData: false,
      beta: 0,
      gamma: 0,
      baseBeta: null,
      baseGamma: null,
      lastEvent: 0,
      timer: null,
      permission: "unknown",
    },
  };

  /* ---------- dom ---------- */

  const el = {
    fx: $("fx"),
    kitchen: document.querySelector(".kitchen"),
    coinCount: $("coinCount"),
    starCount: $("starCount"),
    soundBtn: $("soundBtn"),
    tiltBtn: $("tiltBtn"),
    helpBtn: $("helpBtn"),
    avatarWrap: $("avatarWrap"),
    customerName: $("customerName"),
    customerLine: $("customerLine"),
    orderTitle: $("orderTitle"),
    orderProgress: $("orderProgress"),
    orderList: $("orderList"),
    orderResult: $("orderResult"),
    resultStars: $("resultStars"),
    resultTitle: $("resultTitle"),
    resultCopy: $("resultCopy"),
    resultCoins: $("resultCoins"),
    nextCustomer: $("nextCustomer"),
    boardStation: $("boardStation"),
    boardHint: $("boardHint"),
    boardBadge: $("boardBadge"),
    boardScene: $("boardScene"),
    boardDynamic: $("boardDynamic"),
    boardEmpty: $("boardEmpty"),
    knife: $("knife"),
    chopFlash: $("chopFlash"),
    chopPct: $("chopPct"),
    chopFill: $("chopFill"),
    boardToPlate: $("boardToPlate"),
    boardToss: $("boardToss"),
    grillStation: $("grillStation"),
    grillHint: $("grillHint"),
    grillBadge: $("grillBadge"),
    grillScene: $("grillScene"),
    grillDynamic: $("grillDynamic"),
    grillEmpty: $("grillEmpty"),
    grillStatus: $("grillStatus"),
    heat: $("heat"),
    heatLabel: $("heatLabel"),
    tiltReadout: $("tiltReadout"),
    tiltText: $("tiltText"),
    calibrateBtn: $("calibrateBtn"),
    donenessFill: $("donenessFill"),
    donenessMarker: $("donenessMarker"),
    donenessLabel: $("donenessLabel"),
    flipBtn: $("flipBtn"),
    takeOffBtn: $("takeOffBtn"),
    grillToss: $("grillToss"),
    plateStation: $("plateStation"),
    plateBadge: $("plateBadge"),
    plateScene: $("plateScene"),
    burgerStack: $("burgerStack"),
    plateEmpty: $("plateEmpty"),
    plateGlow: $("plateGlow"),
    plateStatus: $("plateStatus"),
    plateSummary: $("plateSummary"),
    serveBtn: $("serveBtn"),
    serveLabel: $("serveLabel"),
    clearPlate: $("clearPlate"),
    tray: $("tray"),
    toast: $("toast"),
    toastIcon: $("toastIcon"),
    toastText: $("toastText"),
    dragGhost: $("dragGhost"),
    helpDialog: $("helpDialog"),
    tiltHelpBtn: $("tiltHelpBtn"),
    soundHelpBtn: $("soundHelpBtn"),
    progressCopy: $("progressCopy"),
    resetBtn: $("resetBtn"),
  };

  /* ---------- avatar art ---------- */

  function avatarSVG(c) {
    let back = "";
    let front = "";
    const hair = c.hair;

    if (c.style === "bun") {
      back = `<circle cx="44" cy="18" r="11" fill="${hair}"/>`;
      front = `<path d="M23 40c0-15 9-23 21-23s21 8 21 23c-6-8-12-11-21-11s-15 3-21 11Z" fill="${hair}"/>`;
    } else if (c.style === "curly") {
      back = `<g fill="${hair}"><circle cx="26" cy="33" r="11"/><circle cx="37" cy="23" r="12"/><circle cx="51" cy="23" r="12"/><circle cx="62" cy="33" r="11"/></g>`;
      front = `<g fill="${hair}"><circle cx="28" cy="35" r="8"/><circle cx="39" cy="28" r="9"/><circle cx="50" cy="28" r="9"/><circle cx="60" cy="35" r="8"/></g>`;
    } else if (c.style === "afro") {
      back = `<circle cx="44" cy="32" r="30" fill="${hair}"/>`;
      front = `<path d="M23 38c1-13 9-21 21-21s20 8 21 21c-5-6-12-9-21-9s-16 3-21 9Z" fill="${hair}"/>`;
    } else if (c.style === "short") {
      front = `<path d="M23 38c0-14 8-22 21-22 10 0 18 6 20 15-7-2-12-6-17-9-3 7-11 11-24 12Z" fill="${hair}"/>`;
    } else if (c.style === "wavy") {
      back = `<path d="M18 49c-3-20 8-34 26-34s29 14 26 34c-4-6-7-12-8-19-4 9-11 14-18 14s-14-5-18-14c-1 7-4 13-8 19Z" fill="${hair}"/>`;
      front = `<path d="M22 40c0-15 9-24 22-24s22 9 22 24c-4-6-7-11-8-17-4 7-10 10-18 10s-13-3-17-9c-1 6-3 11-7 16Z" fill="${hair}"/><path d="M22 41c-4 9-4 18-1 25M66 41c4 9 4 18 1 25" stroke="${hair}" stroke-width="6" stroke-linecap="round" fill="none"/>`;
    } else if (c.style === "cap") {
      const cap = c.cap || c.shirt;
      front = `<path d="M22 37c1-14 10-21 22-21s21 7 22 21c-6-3-13-5-22-5s-16 2-22 5Z" fill="${cap}"/><path d="M20 34c9-2 39-2 48 0 3 1 3 4 0 5-14 2-34 2-48 0-3-1-3-4 0-5Z" fill="${shade(cap, 0.14)}"/><circle cx="44" cy="16" r="2.5" fill="${shade(cap, 0.2)}"/>`;
    }

    const glasses = c.glasses
      ? `<g fill="none" stroke="#3b2a25" stroke-width="1.7">
           <circle cx="36.5" cy="44" r="7.4"/><circle cx="51.5" cy="44" r="7.4"/>
           <path d="M43.9 44h.2M29.1 43l-4.5.7M58.9 43l4.5.7" stroke-linecap="round"/>
         </g>`
      : "";
    const earrings = c.earrings
      ? `<circle cx="23" cy="52" r="2.4" fill="#f2c14e" stroke="#d39a24" stroke-width=".7"/><circle cx="65" cy="52" r="2.4" fill="#f2c14e" stroke="#d39a24" stroke-width=".7"/>`
      : "";

    return `<svg viewBox="0 0 88 88" role="img" aria-label="Portrait of ${c.name}">
      <circle cx="44" cy="44" r="44" fill="${c.bg}"/>
      <circle cx="44" cy="44" r="44" fill="url(#avatarShade)"/>
      ${back}
      <path d="M5 88c3-15 17-23 39-23s36 8 39 23Z" fill="${c.shirt}"/>
      <path d="M35 66c2 4 5 6 9 6s7-2 9-6" fill="none" stroke="rgba(0,0,0,.13)" stroke-width="2"/>
      <rect x="38" y="57" width="12" height="13" rx="5" fill="${c.skin}"/>
      <path d="M38 64c4 3 8 3 12 0" stroke="rgba(0,0,0,.12)" stroke-width="1.6" fill="none"/>
      <ellipse cx="44" cy="44" rx="20" ry="22" fill="${c.skin}"/>
      <circle cx="24" cy="46" r="5" fill="${c.skin}"/><circle cx="64" cy="46" r="5" fill="${c.skin}"/>
      ${front}
      <path d="M32 38.5c2-1.4 5-1.4 7 0M49 38.5c2-1.4 5-1.4 7 0" stroke="${shade(hair, 0.1)}" stroke-width="1.7" stroke-linecap="round" fill="none"/>
      <g fill="#3b2a25"><ellipse cx="36.5" cy="44" rx="2.15" ry="2.55"/><ellipse cx="51.5" cy="44" rx="2.15" ry="2.55"/></g>
      <g fill="#fff" opacity=".9"><circle cx="37.2" cy="43.2" r=".75"/><circle cx="52.2" cy="43.2" r=".75"/></g>
      <path d="M44 47c-1 2-1 3 1 3.4" stroke="rgba(80,40,30,.35)" stroke-width="1.5" stroke-linecap="round" fill="none"/>
      <path d="M38 53.6c3 3.1 9 3.1 12 0" stroke="#6a3b34" stroke-width="2.2" stroke-linecap="round" fill="none"/>
      <ellipse cx="30" cy="51" rx="4.5" ry="2.5" fill="#e0796a" opacity=".26"/>
      <ellipse cx="58" cy="51" rx="4.5" ry="2.5" fill="#e0796a" opacity=".26"/>
      ${glasses}${earrings}
      <path d="M31 28c5-7 15-10 25-6" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".16" fill="none"/>
    </svg>`;
  }

  /* ---------- audio ---------- */

  class KitchenAudio {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.noiseBuffer = null;
      this.sizzleSrc = null;
      this.sizzleGain = null;
      this.sizzleFilter = null;
      this.muted = false;
      this.musicStarted = false;
      this.musicTimer = null;
      this.chordIndex = 0;
    }

    unlock() {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return;
      if (!this.ctx) {
        this.ctx = new AudioCtor();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.55;
        this.master.connect(this.ctx.destination);
        this.noiseBuffer = this.makeNoise();
        this.startSizzle();
        this.startMusic();
      }
      if (this.ctx.state === "suspended") this.ctx.resume();
    }

    makeNoise() {
      const length = Math.floor(this.ctx.sampleRate * 2);
      const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
      return buffer;
    }

    setMuted(muted) {
      this.muted = muted;
      if (!this.master || !this.ctx) return;
      this.master.gain.setTargetAtTime(muted ? 0 : 0.55, this.ctx.currentTime, 0.04);
    }

    tone(freq, duration, { type = "sine", gain = 0.04, delay = 0, slide = null } = {}) {
      if (!this.ctx || this.muted) return;
      const start = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const amp = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slide), start + duration);
      amp.gain.setValueAtTime(0.0001, start);
      amp.gain.linearRampToValueAtTime(gain, start + 0.012);
      amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(amp);
      amp.connect(this.master);
      osc.start(start);
      osc.stop(start + duration + 0.04);
    }

    noise(duration, frequency, q = 1, gain = 0.04, delay = 0) {
      if (!this.ctx || this.muted) return;
      const start = this.ctx.currentTime + delay;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = frequency;
      filter.Q.value = q;
      const amp = this.ctx.createGain();
      amp.gain.setValueAtTime(0.0001, start);
      amp.gain.linearRampToValueAtTime(gain, start + 0.012);
      amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      src.connect(filter);
      filter.connect(amp);
      amp.connect(this.master);
      src.start(start);
      src.stop(start + duration + 0.03);
    }

    click() { this.tone(560, 0.045, { type: "sine", gain: 0.018 }); }
    chop() { this.noise(0.075, 1900, 1.3, 0.05); this.tone(150, 0.07, { type: "triangle", gain: 0.035, slide: 78 }); }
    plop() { this.tone(280, 0.09, { type: "sine", gain: 0.045, slide: 185 }); this.noise(0.05, 760, 1, 0.022); }
    flip() { this.noise(0.2, 900, 0.9, 0.045); this.tone(190, 0.18, { type: "sine", gain: 0.025, slide: 340 }); }
    serve() {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => this.tone(freq, 0.55, { type: "triangle", gain: 0.035, delay: i * 0.085 }));
      this.tone(261.63, 0.9, { type: "sine", gain: 0.022, delay: 0.05 });
    }
    coin() { this.tone(880, 0.075, { type: "square", gain: 0.018 }); this.tone(1174.66, 0.12, { type: "square", gain: 0.018, delay: 0.07 }); }
    customer() { [392, 523.25].forEach((freq, i) => this.tone(freq, 0.5, { type: "sine", gain: 0.026, delay: i * 0.12 })); }
    burn() { this.noise(0.42, 520, 0.8, 0.04); this.tone(90, 0.4, { type: "sawtooth", gain: 0.018, slide: 60 }); }

    startSizzle() {
      if (!this.ctx || this.sizzleSrc) return;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      src.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 2600;
      filter.Q.value = 0.75;
      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      src.start();
      this.sizzleSrc = src;
      this.sizzleGain = gain;
      this.sizzleFilter = filter;
    }

    setSizzle(level) {
      if (!this.sizzleGain || !this.ctx || this.muted) return;
      this.sizzleGain.gain.setTargetAtTime(clamp(level, 0, 1) * 0.055, this.ctx.currentTime, 0.12);
      this.sizzleFilter.frequency.setTargetAtTime(1700 + clamp(level, 0, 1) * 2500, this.ctx.currentTime, 0.2);
    }

    startMusic() {
      if (this.musicStarted || !this.ctx) return;
      this.musicStarted = true;
      this.scheduleChord();
    }

    scheduleChord() {
      if (!this.ctx) return;
      const chords = [
        [261.63, 329.63, 392.0, 493.88],
        [220.0, 261.63, 329.63, 392.0],
        [174.61, 220.0, 261.63, 329.63],
        [196.0, 246.94, 293.66, 349.23],
      ];
      const notes = chords[this.chordIndex % chords.length];
      this.chordIndex += 1;
      notes.forEach((freq, i) => this.pad(freq, 7.2, 0.0075, i * 0.18));
      this.musicTimer = setTimeout(() => this.scheduleChord(), 6800);
    }

    pad(freq, duration, gain, delay) {
      if (!this.ctx || this.muted) return;
      const start = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const amp = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      filter.type = "lowpass";
      filter.frequency.value = 780;
      amp.gain.setValueAtTime(0.0001, start);
      amp.gain.linearRampToValueAtTime(gain, start + 1.4);
      amp.gain.linearRampToValueAtTime(gain * 0.75, start + duration * 0.6);
      amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(filter);
      filter.connect(amp);
      amp.connect(this.master);
      osc.start(start);
      osc.stop(start + duration + 0.1);
    }
  }

  const audio = new KitchenAudio();

  /* ---------- particles ---------- */

  class FX {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.particles = [];
      this.width = 0;
      this.height = 0;
      this.dpr = 1;
      this.resize();
    }

    resize() {
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.canvas.width = Math.round(this.width * this.dpr);
      this.canvas.height = Math.round(this.height * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    add(particle) {
      if (this.particles.length > 240) this.particles.shift();
      this.particles.push(particle);
    }

    burst(x, y, options = {}) {
      if (reducedMotion) return;
      const {
        count = 10,
        colors = ["#f2c14e", "#e2574c", "#6fa87f"],
        speed = 160,
        spread = Math.PI * 2,
        angle = -Math.PI / 2,
        gravity = 520,
        size = 4,
        sizeVariance = 2,
        life = 0.7,
        shape = "circle",
      } = options;
      for (let i = 0; i < count; i += 1) {
        const dir = angle + rand(-spread / 2, spread / 2);
        const velocity = rand(speed * 0.35, speed);
        const particleLife = rand(life * 0.65, life * 1.25);
        this.add({
          x, y,
          vx: Math.cos(dir) * velocity,
          vy: Math.sin(dir) * velocity,
          g: gravity,
          size: rand(size * 0.5, size + sizeVariance),
          color: pick(colors),
          life: particleLife,
          maxLife: particleLife,
          rot: rand(0, Math.PI * 2),
          vr: rand(-8, 8),
          shape,
          alpha: 1,
        });
      }
    }

    chop(x, y, colors) {
      this.burst(x, y, { count: 9, colors, speed: 190, gravity: 700, size: 3.5, sizeVariance: 2.4, life: 0.55, shape: "square" });
    }

    steam(x, y, strength = 1) {
      if (reducedMotion) return;
      const count = strength > 0.7 ? 2 : 1;
      for (let i = 0; i < count; i += 1) {
        const particleLife = rand(0.75, 1.35);
        this.add({
          x: x + rand(-12, 12),
          y: y + rand(-4, 4),
          vx: rand(-8, 8),
          vy: rand(-34, -20),
          g: -8,
          size: rand(5, 11) * (0.7 + strength * 0.5),
          color: "#fffaf0",
          life: particleLife,
          maxLife: particleLife,
          rot: 0,
          vr: 0,
          shape: "circle",
          alpha: 0.2,
        });
      }
      if (strength > 0.72 && Math.random() < 0.22) {
        this.add({
          x: x + rand(-18, 18),
          y: y + rand(-8, 10),
          vx: rand(-14, 14),
          vy: rand(-58, -24),
          g: 20,
          size: rand(1.2, 2.6),
          color: pick(["#ffbc57", "#ff7b3d", "#ffe39b"]),
          life: rand(0.35, 0.8),
          maxLife: 0.8,
          rot: 0,
          vr: 0,
          shape: "circle",
          alpha: 0.9,
        });
      }
    }

    confetti(x, y) {
      if (reducedMotion) return;
      this.burst(x, y, {
        count: 56,
        colors: ["#e2574c", "#f2c14e", "#6fa87f", "#79b8b3", "#fff1c7", "#8d77b8", "#f08a72"],
        speed: 440,
        spread: Math.PI * 1.5,
        angle: -Math.PI / 2,
        gravity: 780,
        size: 5,
        sizeVariance: 4,
        life: 1.25,
        shape: "rect",
      });
    }

    stars(x, y) {
      if (reducedMotion) return;
      this.burst(x, y, {
        count: 22,
        colors: ["#f2c14e", "#ffe6a3", "#fff6de"],
        speed: 280,
        spread: Math.PI * 2,
        angle: -Math.PI / 2,
        gravity: 360,
        size: 3.5,
        sizeVariance: 3,
        life: 0.9,
      });
    }

    update(dt) {
      const { ctx } = this;
      ctx.clearRect(0, 0, this.width, this.height);
      for (let i = this.particles.length - 1; i >= 0; i -= 1) {
        const p = this.particles[i];
        p.life -= dt;
        if (p.life <= 0) {
          this.particles.splice(i, 1);
          continue;
        }
        p.vy += p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        const fade = clamp(p.life / p.maxLife, 0, 1);
        ctx.save();
        ctx.globalAlpha = fade * (p.alpha ?? 1);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size * 0.8, p.size, p.size * 1.6);
        } else if (p.shape === "square") {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }
  }

  const fx = new FX(el.fx);

  /* ---------- render: hud / order / tray ---------- */

  let toastTimer = null;
  let toastHideTimer = null;

  function toast(message, icon = "leaf", duration = 2500) {
    clearTimeout(toastTimer);
    clearTimeout(toastHideTimer);
    el.toastText.textContent = message;
    el.toastIcon.innerHTML = `<svg class="ico"><use href="#icon-${icon}"/></svg>`;
    el.toast.classList.add("is-visible");
    toastTimer = setTimeout(() => {
      el.toast.classList.remove("is-visible");
    }, duration);
  }

  function currentRecipe() {
    return RECIPES[state.order.recipe];
  }

  function countPlate() {
    const counts = {};
    for (const id of state.plate) counts[id] = (counts[id] || 0) + 1;
    return counts;
  }

  function canServe() {
    const counts = countPlate();
    return currentRecipe().items.every((id) => (counts[id] || 0) > 0);
  }

  function updateHud(animate = false) {
    el.coinCount.textContent = String(state.coins);
    el.starCount.textContent = String(state.stars);
    if (animate) {
      const pill = el.coinCount.closest(".stat-pill");
      pill.classList.remove("is-popping");
      void pill.offsetWidth;
      pill.classList.add("is-popping");
    }
    updateSoundUI();
  }

  function updateSoundUI() {
    const use = el.soundBtn.querySelector("use");
    if (use) use.setAttribute("href", state.sound ? "#icon-sound" : "#icon-muted");
    el.soundBtn.setAttribute("aria-pressed", String(state.sound));
    el.soundBtn.setAttribute("aria-label", state.sound ? "Sound on" : "Sound off");
    if (el.soundHelpBtn) {
      el.soundHelpBtn.textContent = state.sound ? "Sound on" : "Sound off";
      el.soundHelpBtn.setAttribute("aria-pressed", String(state.sound));
    }
  }

  function renderOrder() {
    const recipe = currentRecipe();
    const counts = countPlate();
    const doneCount = recipe.items.filter((id) => (counts[id] || 0) > 0).length;

    el.orderTitle.textContent = recipe.name;
    el.orderProgress.textContent = `${doneCount}/${recipe.items.length}`;

    el.orderList.innerHTML = recipe.items.map((id) => {
      const done = (counts[id] || 0) > 0;
      const hint = ING[id].chop ? "chop" : id === "patty" ? "grill" : "add";
      const status = done
        ? `<svg class="ico"><use href="#icon-check"/></svg>ready`
        : hint;
      return `<li class="order-item${done ? " is-done" : ""}">
        <svg class="ing-icon" viewBox="0 0 64 64" aria-hidden="true"><use href="#i-${id}"/></svg>
        <span class="order-item__name">${ING[id].name}</span>
        <span class="order-item__status">${status}</span>
      </li>`;
    }).join("");

    // Gently point at what is still needed in the pantry.
    for (const chip of el.tray.querySelectorAll(".ingredient-chip")) {
      const id = chip.dataset.ingredient;
      const required = recipe.items.includes(id);
      const done = (counts[id] || 0) > 0;
      chip.classList.toggle("is-wanted", required && !done);
      chip.classList.toggle("is-added", required && done);
    }
  }

  function renderTray() {
    el.tray.innerHTML = TRAY_ORDER.map((id) => {
      const ing = ING[id];
      const kind = id === "patty" ? "grill" : ing.chop ? "chop" : "ready";
      return `<button class="ingredient-chip" type="button" data-ingredient="${id}" data-kind="${kind}" aria-label="Pick up ${ing.name}">
        <svg class="ing-icon" viewBox="0 0 64 64" aria-hidden="true"><use href="#i-${id}"/></svg>
        <span class="ingredient-chip__name">${ing.name}</span>
      </button>`;
    }).join("");
  }

  /* ---------- render: board ---------- */

  function chopPieces(id) {
    const offsets = [
      { x: -36, y: -6, r: -12, s: 1 },
      { x: -8, y: -18, r: 8, s: 1.08 },
      { x: 24, y: -7, r: -4, s: 0.92 },
      { x: 42, y: 10, r: 17, s: 0.82 },
      { x: -2, y: 13, r: -18, s: 0.85 },
    ];
    return offsets.map((o) => `<span class="chop-piece" style="left:calc(50% + ${o.x}px);top:calc(var(--board-y) + ${o.y}px);transform:translate(-50%,-50%) rotate(${o.r}deg) scale(${o.s})"><svg viewBox="0 0 64 64" aria-hidden="true"><use href="#i-${id}"/></svg></span>`).join("");
  }

  function renderBoard() {
    const { item, chop } = state.board;
    el.boardEmpty.hidden = Boolean(item);

    if (!item) {
      el.boardDynamic.innerHTML = "";
      el.boardHint.textContent = "Tap or swipe to chop";
      el.boardBadge.textContent = "empty";
      el.boardBadge.className = "station-badge";
    } else if (chop >= 100) {
      el.boardDynamic.innerHTML = chopPieces(item);
      el.boardHint.textContent = "Add it to the plate — or toss it";
      el.boardBadge.textContent = "chopped";
      el.boardBadge.className = "station-badge is-good";
    } else {
      el.boardDynamic.innerHTML = `<div class="ing-large board-whole" style="top:var(--board-y);width:var(--board-size)"><svg viewBox="0 0 64 64" aria-hidden="true"><use href="#i-${item}"/></svg></div>`;
      el.boardHint.textContent = "Tap or swipe the board to chop";
      el.boardBadge.textContent = chop > 0 ? "chopping" : "ready";
      el.boardBadge.className = "station-badge";
    }

    el.chopPct.textContent = `${Math.round(chop)}%`;
    el.chopFill.style.width = `${chop}%`;
    el.boardToPlate.disabled = !(item && chop >= 100) || state.paused;
    el.boardToss.disabled = !item || state.paused;
  }

  /* ---------- render: grill ---------- */

  function heatName(heat) {
    if (heat <= 4) return "Off";
    if (heat <= 24) return "Ember";
    if (heat <= 44) return "Low";
    if (heat <= 64) return "Medium";
    if (heat <= 84) return "Hot";
    return "Blazing";
  }

  function donenessName(value) {
    if (value >= 100) return "Burnt";
    if (value >= 87) return "Overdone";
    if (value >= 62) return "Perfect";
    if (value >= 50) return "Almost";
    if (value >= 25) return "Searing";
    return "Raw";
  }

  function pattyColors(doneness) {
    let top;
    let side;
    if (doneness <= 62) {
      const t = doneness / 62;
      top = mixHex("#df9a7e", "#a85d3a", t);
      side = mixHex("#b56b52", "#7a3b25", t);
    } else {
      const t = clamp((doneness - 62) / 38, 0, 1);
      top = mixHex("#a85d3a", "#2f1b13", t);
      side = mixHex("#7a3b25", "#1d110c", t);
    }
    return { top, side };
  }

  function updateHeatUI() {
    const heat = state.grill.heat;
    el.heat.value = String(heat);
    el.heatLabel.textContent = heatName(heat);
    el.grillStation.style.setProperty("--heat", String(heat / 100));
    if (state.tilt.enabled) {
      el.tiltText.textContent = `live · ${heatName(heat).toLowerCase()}`;
    }
  }

  function updateGrillFrame() {
    const g = state.grill;
    const pattyEl = el.grillDynamic.querySelector(".patty-wrap");
    const markerVisible = g.patty;
    el.donenessMarker.hidden = !markerVisible;
    el.donenessMarker.style.left = `${g.doneness}%`;
    el.donenessLabel.textContent = g.patty ? donenessName(g.doneness) : "—";
    el.grillBadge.textContent = !g.patty ? "empty" : g.burnt ? "burnt" : g.doneness >= 62 && g.doneness <= 86 ? "perfect" : "cooking";
    el.grillBadge.className = `station-badge${g.patty && g.doneness >= 62 && g.doneness <= 86 ? " is-good" : g.burnt ? " is-hot" : ""}`;

    if (g.patty) {
      const name = g.burnt ? "burnt" : donenessName(g.doneness).toLowerCase();
      el.grillStatus.hidden = false;
      el.grillStatus.textContent = name;
      el.grillStatus.className = `status-pill status-pill--grill${g.burnt ? " is-burnt" : name === "perfect" ? " is-perfect" : ""}`;
    } else {
      el.grillStatus.hidden = true;
    }

    if (pattyEl) {
      const { top, side } = pattyColors(g.doneness);
      pattyEl.style.setProperty("--patty-top", top);
      pattyEl.style.setProperty("--patty-side", side);
      pattyEl.classList.toggle("is-burnt", g.burnt);
    }

    el.heat.disabled = state.tilt.enabled;
    el.flipBtn.disabled = !g.patty || g.flipped || g.burnt || state.paused;
    el.takeOffBtn.disabled = !g.patty || g.doneness < 24 || g.burnt || state.paused;
    el.grillToss.disabled = !g.patty || state.paused;
  }

  function renderGrill() {
    const g = state.grill;
    el.grillEmpty.hidden = g.patty;

    if (g.patty) {
      if (!el.grillDynamic.querySelector(".patty-wrap")) {
        el.grillDynamic.innerHTML = `<div class="patty-wrap" style="top:var(--grill-y);width:var(--patty-size)"><svg viewBox="0 0 64 64" aria-hidden="true"><use href="#i-patty"/></svg></div>`;
      }
      el.grillHint.textContent = g.flipped ? "Seared both sides — take it off" : "Sear, then flip once";
    } else {
      el.grillDynamic.innerHTML = "";
      el.grillHint.textContent = "Mind the heat — flip once";
    }

    updateGrillFrame();
  }

  /* ---------- render: plate ---------- */

  function renderPlate(animate = false) {
    const complete = canServe();
    const recipe = currentRecipe();
    const layers = [];
    updateStackWidth();
    const stackWidth = parseFloat(getComputedStyle(el.plateScene).getPropertyValue("--stack-w")) || 160;
    const baseOffset = Math.max(8, stackWidth * 0.1);
    const layerStep = Math.max(7, stackWidth * 0.088);

    layers.push({ symbol: "l-bun-bottom", kind: "bun", bottom: 0 });
    state.plate.forEach((id, index) => {
      layers.push({ symbol: `l-${id}`, kind: "filling", bottom: baseOffset + index * layerStep });
    });
    if (complete) {
      layers.push({ symbol: "l-bun-top", kind: "top", bottom: baseOffset + state.plate.length * layerStep + stackWidth * 0.012 });
    }

    el.burgerStack.innerHTML = layers.map((layer, index) => {
      const newest = animate && index === layers.length - 1 ? " is-new" : "";
      return `<div class="stack-layer stack-layer--${layer.kind}${newest}" style="bottom:${layer.bottom}px;z-index:${index + 1}"><svg viewBox="0 0 ${layer.symbol === "l-bun-bottom" ? "100 30" : layer.symbol === "l-bun-top" ? "100 40" : "100 28"}" aria-hidden="true"><use href="#${layer.symbol}"/></svg></div>`;
    }).join("");

    el.plateEmpty.hidden = state.plate.length > 0 || complete;
    el.plateBadge.textContent = complete ? "ready" : `${state.plate.length} layer${state.plate.length === 1 ? "" : "s"}`;
    el.plateBadge.className = `station-badge${complete ? " is-good" : ""}`;
    el.plateGlow.classList.toggle("is-on", complete);
    el.plateStatus.hidden = !complete;
    el.plateStatus.className = `status-pill status-pill--plate${complete ? " is-ready" : ""}`;
    el.plateStatus.textContent = "ready to serve";

    el.serveBtn.disabled = !complete || state.paused;
    el.serveLabel.textContent = complete ? `Serve to ${state.order.name}` : "Serve";
    el.clearPlate.disabled = state.plate.length === 0 || state.paused;

    if (complete) {
      el.plateSummary.innerHTML = `<span class="plate-summary__bun"></span>Ready for ${state.order.name} · ${state.plate.length} filling${state.plate.length === 1 ? "" : "s"}`;
      el.plateSummary.classList.add("is-ready");
    } else {
      el.plateSummary.innerHTML = `<span class="plate-summary__bun"></span>bottom bun ready${state.plate.length ? ` · ${state.plate.length} filling${state.plate.length === 1 ? "" : "s"}` : ""}`;
      el.plateSummary.classList.remove("is-ready");
    }

    renderOrder();
  }

  function renderAll() {
    renderBoard();
    renderGrill();
    renderPlate();
    updateHeatUI();
    updateHud();
  }

  /* ---------- scene geometry ---------- */

  function revealStation(station) {
    if (!el.kitchen || el.kitchen.scrollHeight <= el.kitchen.clientHeight + 4) return;
    station.scrollIntoView({ block: "nearest", behavior: reducedMotion ? "auto" : "smooth" });
  }

  function updateStackWidth() {
    const scene = el.plateScene;
    const base = parseFloat(scene.style.getPropertyValue("--stack-w-max")) || 160;
    const room = parseFloat(scene.style.getPropertyValue("--stack-room")) || 140;
    const count = state.plate.length;
    // Bottom bun + fillings + (when ready) the top bun. Extras make the
    // stack taller, so shrink the whole stack a little to keep it on screen.
    const needed = 0.52 + count * 0.09;
    const fitted = Math.min(base, room / Math.max(0.6, needed));
    scene.style.setProperty("--stack-w", `${Math.max(64, fitted)}px`);
  }

  function layoutScenes() {
    // On roomy screens the illustrated scene fills the card width and the
    // extra vertical space is cropped, so the stations feel like close-ups
    // instead of tiny drawings floating in a large card.
    const fillWidth = window.matchMedia("(min-width: 721px) and (min-height: 621px)").matches;
    const scenes = [el.boardScene, el.grillScene, el.plateScene];

    for (const scene of scenes) {
      const rect = scene.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      const scale = fillWidth ? rect.width / 320 : Math.min(rect.width / 320, rect.height / 180);
      const artW = 320 * scale;
      const artH = 180 * scale;
      const offsetY = (rect.height - artH) / 2;
      const plateSurfaceY = offsetY + artH * 0.665;
      const stackBottom = Math.max(9, rect.height - plateSurfaceY);
      const roomAbovePlate = Math.max(40, rect.height - stackBottom);
      const stackW = clamp(artW * 0.46, 82, 180);

      scene.style.setProperty("--art-h", `${artH}px`);
      scene.style.setProperty("--art-w", `${artW}px`);
      scene.style.setProperty("--board-y", `${offsetY + artH * 0.56}px`);
      scene.style.setProperty("--grill-y", `${offsetY + artH * 0.53}px`);
      scene.style.setProperty("--board-size", `${clamp(artH * 0.47, 46, 126)}px`);
      scene.style.setProperty("--patty-size", `${clamp(artW * 0.34, 52, 130)}px`);
      scene.style.setProperty("--stack-w-max", `${stackW}px`);
      scene.style.setProperty("--stack-room", `${roomAbovePlate}px`);
      scene.style.setProperty("--stack-bottom", `${stackBottom}px`);
    }
    updateStackWidth();
  }

  /* ---------- order lifecycle ---------- */

  function resetKitchen() {
    state.plate = [];
    state.pattyQuality = null;
    state.board = { item: null, chop: 0 };
    state.grill = {
      patty: false,
      doneness: 0,
      flipped: false,
      burnt: false,
      heat: state.grill.heat,
      perfectNotified: false,
    };
    audio.setSizzle(0);
  }

  function startOrder(index, options = {}) {
    const { reset = true, quiet = false } = options;
    state.orderIndex = ((index % CUSTOMERS.length) + CUSTOMERS.length) % CUSTOMERS.length;
    state.order = CUSTOMERS[state.orderIndex];
    state.paused = false;
    state.orderResultOpen = false;
    if (reset) resetKitchen();

    el.customerName.textContent = state.order.name;
    el.customerLine.textContent = `“${state.order.line}”`;
    el.avatarWrap.innerHTML = avatarSVG(state.order);
    el.orderResult.hidden = true;

    renderAll();
    requestAnimationFrame(layoutScenes);

    if (!quiet) audio.customer();
  }

  function showResult(stars, coins, quality) {
    const order = state.order;
    const recipe = currentRecipe();
    const extras = state.plate.filter((id) => !recipe.items.includes(id));

    el.resultStars.innerHTML = [1, 2, 3].map((n) => `<svg class="ico${n <= stars ? "" : " is-empty"}" aria-hidden="true"><use href="#icon-star"/></svg>`).join("");
    el.resultTitle.textContent = stars === 3 ? `${order.name} loved it!` : stars === 2 ? `${order.name} enjoyed it!` : `${order.name} says thank you!`;

    let copy;
    if (quality === 3) copy = "That patty was seared just right. The kitchen smells amazing.";
    else if (quality === 1) copy = "A little uneven, but a burger is still a burger. No rush, remember?";
    else if (extras.length >= 2) copy = "Extra toppings! You know the way to a cook’s heart.";
    else if (!recipe.items.includes("patty")) copy = "Crunchy, fresh, and made exactly how they like it.";
    else copy = "A proper little burger. Same time tomorrow?";

    el.resultCopy.textContent = copy;
    el.resultCoins.textContent = `+${coins}`;
    el.orderResult.hidden = false;
    el.orderResultOpen = true;
    el.orderResult.style.animation = "none";
    void el.orderResult.offsetWidth;
    el.orderResult.style.animation = "";

    updateHud(true);
    audio.serve();
    setTimeout(() => audio.coin(), 380);
    setTimeout(() => el.nextCustomer.focus({ preventScroll: true }), 350);

    const pr = el.plateScene.getBoundingClientRect();
    fx.confetti(pr.left + pr.width / 2, pr.top + pr.height * 0.35);
  }

  function serve() {
    if (state.paused) return;
    if (!canServe()) {
      const missing = currentRecipe().items.filter((id) => !(countPlate()[id] > 0));
      toast(`Still missing ${missing.map((id) => ING[id].name.toLowerCase()).join(", ")}. No rush.`, "leaf");
      return;
    }

    const recipe = currentRecipe();
    const extras = state.plate.filter((id) => !recipe.items.includes(id));
    const quality = recipe.items.includes("patty") ? pattyScore() : 3;
    let stars = recipe.items.includes("patty") ? (quality === 3 ? 3 : quality === 2 ? 2 : 1) : 3;
    if (extras.length >= 2 && stars === 2) stars = 3;
    const coins = 6 + recipe.items.length * 2 + (quality === 3 ? 4 : 0) + extras.length * 2;

    state.paused = true;
    state.coins += coins;
    state.served += 1;
    if (stars === 3) state.stars += 1;
    state.lastServe = { stars, coins, quality };
    saveProgress();
    showResult(stars, coins, quality);
    renderPlate(false);
    renderBoard();
    renderGrill();
    vibrate(30);
  }

  function pattyScore() {
    if (!state.pattyQuality) return 1;
    const { doneness, flipped } = state.pattyQuality;
    if (doneness >= 62 && doneness <= 86 && flipped) return 3;
    if (doneness >= 54 && doneness <= 92) return 2;
    return 1;
  }

  function nextOrder() {
    audio.click();
    startOrder(state.orderIndex + 1, { reset: true });
    if (state.served > 0 && state.served % CUSTOMERS.length === 0) {
      toast("Another happy regular. The kitchen is yours.", "sparkle", 2800);
    } else {
      toast(`A new friend is at the counter.`, "sparkle", 2200);
    }
  }

  /* ---------- actions: tray routing & stations ---------- */

  let activePulseTimers = new WeakMap();

  function pulseStation(station) {
    clearTimeout(activePulseTimers.get(station));
    station.classList.add("is-active");
    const timer = setTimeout(() => station.classList.remove("is-active"), 480);
    activePulseTimers.set(station, timer);
  }

  function rejectDrop(station, message) {
    station.classList.remove("is-drop-reject");
    void station.offsetWidth;
    station.classList.add("is-drop-reject");
    setTimeout(() => station.classList.remove("is-drop-reject"), 320);
    toast(message, "help");
    audio.tone(180, 0.1, { type: "triangle", gain: 0.02, slide: 140 });
  }

  function addToBoard(id) {
    if (state.paused) return;
    if (!ING[id].chop) return;
    if (state.board.item) {
      rejectDrop(el.boardStation, `Finish the ${ING[state.board.item].name.toLowerCase()} first.`);
      return;
    }
    state.board.item = id;
    state.board.chop = 0;
    renderBoard();
    pulseStation(el.boardStation);
    layoutScenes();
    revealStation(el.boardStation);
    toast(`${ING[id].name} is on the board — tap or swipe to chop.`, "knife", 2300);
    audio.plop();
    vibrate(6);
  }

  function addPatty() {
    if (state.paused) return;
    if (state.grill.patty) {
      rejectDrop(el.grillStation, "The skillet is busy — finish that patty first.");
      return;
    }
    state.grill.patty = true;
    state.grill.doneness = 5;
    state.grill.flipped = false;
    state.grill.burnt = false;
    state.grill.perfectNotified = false;
    state.grill.heat = Math.max(20, state.grill.heat);
    renderGrill();
    updateHeatUI();
    pulseStation(el.grillStation);
    layoutScenes();
    revealStation(el.grillStation);
    audio.plop();
    audio.startSizzle();
    vibrate(8);
    toast("Patty’s on. Set the heat, then flip it once.", "flame", 2600);
  }

  function addToPlate(id, source = "tray", sourceElement = null) {
    if (state.paused) return;
    if (ING[id].chop && source !== "board") {
      toast(`${ING[id].name} needs a little chopping first.`, "knife");
      return;
    }
    if (id === "patty" && source !== "grill") {
      toast("Sear that patty in the skillet first.", "flame");
      return;
    }
    if (source === "grill") state.pattyQuality = state.lastPattyQuality || null;

    const wasComplete = canServe();
    state.plate.push(id);
    renderPlate(true);
    pulseStation(el.plateStation);
    layoutScenes();
    revealStation(el.plateStation);

    const to = el.plateScene.getBoundingClientRect();
    const from = sourceElement ? sourceElement.getBoundingClientRect() : source === "board" ? el.boardScene.getBoundingClientRect() : el.grillScene.getBoundingClientRect();
    if (!reducedMotion) flyIngredient(id, from, to);
    audio.plop();
    vibrate(7);

    const nowComplete = canServe();
    if (nowComplete && !wasComplete) {
      setTimeout(() => {
        if (canServe() && !state.paused) {
          toast("Order complete — serve whenever you’re ready.", "sparkle", 2800);
          audio.customer();
        }
      }, 360);
    }
  }

  function flyIngredient(id, from, to) {
    const node = document.createElement("div");
    node.className = "fly-icon";
    node.innerHTML = `<svg viewBox="0 0 64 64" aria-hidden="true"><use href="#i-${id}"/></svg>`;
    document.body.appendChild(node);
    const startX = from.left + from.width / 2;
    const startY = from.top + from.height / 2;
    const endX = to.left + to.width / 2;
    const endY = to.top + to.height / 2;
    node.style.left = `${startX}px`;
    node.style.top = `${startY}px`;
    const dx = endX - startX;
    const dy = endY - startY;
    const animation = node.animate([
      { transform: "translate(-50%, -50%) scale(1) rotate(0deg)", opacity: 1 },
      { transform: `translate(-50%, -50%) translate(${dx * 0.55}px, ${dy * 0.55 - 40}px) scale(.9) rotate(-9deg)`, opacity: 1, offset: 0.55 },
      { transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(.28) rotate(10deg)`, opacity: 0 },
    ], { duration: 520, easing: "cubic-bezier(.25, .8, .3, 1)" });
    animation.onfinish = () => node.remove();
  }

  function routeIngredient(id, sourceElement = null) {
    if (state.paused) return;
    const ing = ING[id];
    if (id === "patty") {
      if (state.grill.patty) {
        toast("The skillet is busy — finish that patty first.", "flame");
        pulseStation(el.grillStation);
        return;
      }
      addPatty();
      return;
    }
    if (ing.chop) {
      if (state.board.item) {
        if (state.board.item === id) {
          toast(`The ${ing.name.toLowerCase()} is already on the board. Tap it to chop.`, "knife");
          pulseStation(el.boardStation);
          return;
        }
        toast(`Finish the ${ING[state.board.item].name.toLowerCase()} first — or toss it.`, "knife");
        pulseStation(el.boardStation);
        return;
      }
      addToBoard(id);
      return;
    }
    addToPlate(id, "tray", sourceElement);
  }

  function placeOnStation(id, stationName, sourceElement = null) {
    if (state.paused) return;
    if (stationName === "board") {
      if (!ING[id].chop) {
        rejectDrop(el.boardStation, `${ING[id].name} is already ready for the plate.`);
        return;
      }
      if (state.board.item) {
        rejectDrop(el.boardStation, `The board is busy with ${ING[state.board.item].name.toLowerCase()}.`);
        return;
      }
      addToBoard(id);
      return;
    }
    if (stationName === "grill") {
      if (id !== "patty") {
        rejectDrop(el.grillStation, `${ING[id].name} doesn’t belong in the skillet.`);
        return;
      }
      if (state.grill.patty) {
        rejectDrop(el.grillStation, "The skillet is already busy.");
        return;
      }
      addPatty();
      return;
    }
    if (stationName === "plate") {
      if (id === "patty") {
        rejectDrop(el.plateStation, "Sear the patty before plating it.");
        return;
      }
      if (ING[id].chop) {
        rejectDrop(el.plateStation, "Chop that first — then it can join the stack.");
        return;
      }
      addToPlate(id, "tray", sourceElement);
    }
  }

  function chopOnce(clientX, clientY) {
    if (state.paused) return;
    if (!state.board.item) {
      toast("Add a veggie from the pantry first.", "knife");
      pulseStation(el.boardStation);
      return;
    }
    if (state.board.chop >= 100) return;

    const id = state.board.item;
    state.board.chop = Math.min(100, state.board.chop + 16);
    renderBoard();

    if (!reducedMotion) {
      el.knife.classList.remove("is-chopping");
      void el.knife.offsetWidth;
      el.knife.classList.add("is-chopping");
      el.chopFlash.classList.remove("is-on");
      void el.chopFlash.offsetWidth;
      el.chopFlash.classList.add("is-on");
    }
    audio.chop();
    vibrate(5);

    const rect = el.boardScene.getBoundingClientRect();
    const x = clientX || rect.left + rect.width * 0.5;
    const y = clientY || rect.top + rect.height * 0.56;
    fx.chop(x, y, ING[id].bits);

    if (state.board.chop >= 100) {
      setTimeout(() => {
        if (state.board.chop >= 100) toast("Bite-sized. Add it to the plate whenever you like.", "check", 2500);
      }, 180);
      audio.tone(660, 0.1, { type: "triangle", gain: 0.025, delay: 0.08 });
    }
  }

  function sendBoardToPlate() {
    if (state.paused || !state.board.item || state.board.chop < 100) return;
    const id = state.board.item;
    const from = el.boardDynamic.querySelector(".chop-piece")?.getBoundingClientRect() || el.boardScene.getBoundingClientRect();
    const to = el.plateScene.getBoundingClientRect();
    state.plate.push(id);
    state.board.item = null;
    state.board.chop = 0;
    renderBoard();
    renderPlate(true);
    renderOrder();
    pulseStation(el.plateStation);
    layoutScenes();
    revealStation(el.plateStation);
    flyIngredient(id, from, to);
    audio.plop();
    vibrate(7);

    if (canServe()) {
      setTimeout(() => {
        if (canServe() && !state.paused) toast("Order complete — serve whenever you’re ready.", "sparkle", 2800);
      }, 360);
    }
  }

  function tossBoard() {
    if (!state.board.item) return;
    state.board.item = null;
    state.board.chop = 0;
    renderBoard();
    audio.tone(180, 0.12, { type: "sine", gain: 0.02, slide: 120 });
    toast("Tossed. Fresh start, no fuss.", "leaf", 1800);
  }

  function flipPatty() {
    const g = state.grill;
    if (!g.patty || g.burnt) return;
    if (g.flipped) {
      toast("One flip is plenty for this little patty.", "flame", 1800);
      return;
    }
    g.flipped = true;
    const wrap = el.grillDynamic.querySelector(".patty-wrap");
    if (wrap && !reducedMotion) {
      wrap.classList.remove("is-flipping");
      void wrap.offsetWidth;
      wrap.classList.add("is-flipping");
    }
    audio.flip();
    vibrate(12);
    renderGrill();
    if (g.doneness < 28) toast("A little early, but it’ll even out.", "flame", 1800);
    else toast("Lovely flip. Let the other side catch up.", "flame", 1900);
  }

  function takeOffPatty() {
    const g = state.grill;
    if (!g.patty || g.burnt) return;
    if (g.doneness < 24) {
      toast("That patty is still raw — give it another moment.", "flame");
      return;
    }
    state.lastPattyQuality = { doneness: g.doneness, flipped: g.flipped };
    const from = el.grillScene.getBoundingClientRect();
    state.pattyQuality = state.lastPattyQuality;
    state.plate.push("patty");
    state.grill = {
      patty: false,
      doneness: 0,
      flipped: false,
      burnt: false,
      heat: g.heat,
      perfectNotified: false,
    };
    audio.setSizzle(0);
    renderGrill();
    renderPlate(true);
    renderOrder();
    updateHeatUI();
    pulseStation(el.plateStation);
    layoutScenes();
    revealStation(el.plateStation);
    flyIngredient("patty", from, el.plateScene.getBoundingClientRect());
    audio.plop();
    vibrate(8);

    if (canServe()) {
      setTimeout(() => {
        if (canServe() && !state.paused) toast("Order complete — serve whenever you’re ready.", "sparkle", 2800);
      }, 360);
    }
  }

  function tossPatty() {
    if (!state.grill.patty) return;
    state.grill = {
      patty: false,
      doneness: 0,
      flipped: false,
      burnt: false,
      heat: state.grill.heat,
      perfectNotified: false,
    };
    audio.setSizzle(0);
    renderGrill();
    updateHeatUI();
    audio.tone(180, 0.12, { type: "sine", gain: 0.02, slide: 110 });
    toast("Tossed. A fresh patty is waiting whenever you are.", "leaf", 2000);
  }

  function clearPlate() {
    if (state.paused || state.plate.length === 0) return;
    state.plate = [];
    state.pattyQuality = null;
    state.lastPattyQuality = null;
    renderPlate(false);
    renderOrder();
    updateHeatUI();
    layoutScenes();
    audio.tone(200, 0.1, { type: "sine", gain: 0.018, slide: 150 });
    toast("Plate cleared. Build it your way.", "leaf", 1800);
  }

  /* ---------- cooking loop ---------- */

  let steamTimer = 0;
  let crackleTimer = 0;

  function updateCooking(dt) {
    const g = state.grill;
    if (g.patty && !g.burnt) {
      const heat = g.heat / 100;
      if (heat > 0.03) {
        // Leisurely by design: roughly 40 seconds from raw to burnt at the
        // default medium heat, so chopping and plating never feels rushed.
        const rate = (0.55 + heat * 4.0) * dt;
        g.doneness = Math.min(100, g.doneness + rate);

        if (!g.perfectNotified && g.doneness >= 62 && g.doneness <= 86) {
          g.perfectNotified = true;
          if (g.flipped) toast("Perfect sear — take it off whenever you’re ready.", "check", 2600);
          else toast("Nice color. Flip it once for an even cook.", "flame", 2600);
          audio.tone(740, 0.12, { type: "sine", gain: 0.02 });
        }

        if (g.doneness >= 100) {
          g.doneness = 100;
          g.burnt = true;
          renderGrill();
          audio.burn();
          toast("Smoke! Toss that one and start fresh — no rush at all.", "flame", 3200);
          vibrate([20, 40, 20]);
        }
        updateGrillFrame();
      }
    }

    // steam and tiny embers from the pan
    if (g.patty && g.heat > 8) {
      const strength = g.heat / 100;
      steamTimer -= dt;
      if (steamTimer <= 0) {
        steamTimer = reducedMotion ? 1 : lerp(0.4, 0.12, strength);
        const rect = el.grillScene.getBoundingClientRect();
        fx.steam(rect.left + rect.width * 0.5, rect.top + rect.height * 0.45, strength);
      }
      crackleTimer -= dt;
      if (crackleTimer <= 0 && strength > 0.42) {
        crackleTimer = rand(0.5, 1.6);
        audio.noise(rand(0.03, 0.07), rand(1000, 2800), 2.4, 0.006);
      }
    }

    audio.setSizzle(g.patty && g.heat > 4 ? clamp(g.heat / 100, 0, 1) : 0);
  }

  let lastFrame = performance.now();

  function loop(now) {
    const dt = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;
    if (!state.paused) updateCooking(dt);
    else audio.setSizzle(0);
    fx.update(dt);
    requestAnimationFrame(loop);
  }

  /* ---------- pointer: tray drag ---------- */

  let drag = null;

  function clearDropHighlights() {
    for (const station of [el.boardStation, el.grillStation, el.plateStation]) {
      station.classList.remove("is-drop-target");
    }
  }

  function stationUnderPoint(x, y) {
    const node = document.elementFromPoint(x, y);
    return node ? node.closest("[data-station]") : null;
  }

  function onTrayPointerDown(event, chip) {
    if (event.button !== undefined && event.button !== 0) return;
    if (!(chip instanceof HTMLElement)) return;
    event.preventDefault();
    const id = chip.dataset.ingredient;
    if (!id) return;

    drag = {
      id,
      chip,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      moved: false,
      hover: null,
    };
    el.dragGhost.innerHTML = `<svg viewBox="0 0 64 64" aria-hidden="true"><use href="#i-${id}"/></svg>`;
    el.dragGhost.classList.remove("is-visible");
    chip.setPointerCapture?.(event.pointerId);
    audio.unlock();
  }

  function onPointerMove(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag.x = event.clientX;
    drag.y = event.clientY;
    const distance = Math.hypot(drag.x - drag.startX, drag.y - drag.startY);
    if (!drag.moved && distance < 8) return;
    if (!drag.moved) {
      drag.moved = true;
      el.dragGhost.classList.add("is-visible");
      el.dragGhost.style.left = `${drag.x}px`;
      el.dragGhost.style.top = `${drag.y}px`;
    }
    if (event.cancelable) event.preventDefault();
    el.dragGhost.style.left = `${drag.x}px`;
    el.dragGhost.style.top = `${drag.y}px`;

    const station = stationUnderPoint(drag.x, drag.y);
    if (station !== drag.hover) {
      clearDropHighlights();
      drag.hover = station;
      if (station) station.classList.add("is-drop-target");
    }
  }

  function onPointerUp(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const { id, moved } = drag;
    const station = moved ? stationUnderPoint(event.clientX, event.clientY) : null;
    el.dragGhost.classList.remove("is-visible");
    clearDropHighlights();
    drag = null;

    if (!moved) {
      routeIngredient(id, event.target?.closest?.(".ingredient-chip") || null);
    } else if (station) {
      placeOnStation(id, station.dataset.station, null);
    } else {
      toast("Drop it on the board, the skillet, or the plate.", "help", 1900);
    }
  }

  function cancelDrag() {
    drag = null;
    el.dragGhost.classList.remove("is-visible");
    clearDropHighlights();
  }

  /* ---------- pointer: board chopping ---------- */

  let boardSwipe = null;

  function onBoardPointerDown(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    boardSwipe = { x: event.clientX, y: event.clientY, distance: 0 };
    el.boardScene.setPointerCapture?.(event.pointerId);
    chopOnce(event.clientX, event.clientY);
  }

  function onBoardPointerMove(event) {
    if (!boardSwipe) return;
    if (event.cancelable) event.preventDefault();
    const dx = event.clientX - boardSwipe.x;
    const dy = event.clientY - boardSwipe.y;
    boardSwipe.distance += Math.hypot(dx, dy);
    boardSwipe.x = event.clientX;
    boardSwipe.y = event.clientY;
    if (boardSwipe.distance > 26) {
      boardSwipe.distance = 0;
      chopOnce(event.clientX, event.clientY);
    }
  }

  function onBoardPointerUp() {
    boardSwipe = null;
  }

  /* ---------- tilt controls ---------- */

  function updateTiltUI() {
    const on = state.tilt.enabled;
    el.tiltBtn.classList.toggle("is-on", on);
    el.tiltBtn.setAttribute("aria-pressed", String(on));
    el.tiltBtn.setAttribute("aria-label", on ? "Disable tilt controls" : "Enable tilt controls");
    el.tiltBtn.title = on ? "Tilt controls on" : "Tilt controls";
    el.tiltHelpBtn.textContent = on ? "Tilt on" : "Enable tilt";
    el.tiltReadout.hidden = !on;
    el.heat.disabled = on;
    if (on) {
      el.tiltText.textContent = state.tilt.hasData ? `live · ${heatName(state.grill.heat).toLowerCase()}` : "waiting for motion…";
    }
  }

  function orientHandler(event) {
    if (event.beta == null && event.gamma == null) return;
    const beta = event.beta ?? 0;
    const gamma = event.gamma ?? 0;

    state.tilt.beta = state.tilt.beta === 0 ? beta : state.tilt.beta * 0.76 + beta * 0.24;
    state.tilt.gamma = state.tilt.gamma === 0 ? gamma : state.tilt.gamma * 0.76 + gamma * 0.24;
    state.tilt.lastEvent = performance.now();

    if (!state.tilt.hasData) {
      state.tilt.hasData = true;
      state.tilt.baseBeta = state.tilt.beta;
      state.tilt.baseGamma = state.tilt.gamma;
      clearTimeout(state.tilt.timer);
      toast("Tilt is live. Level the phone for medium heat.", "motion", 2800);
    }
    if (!state.tilt.enabled || !state.tilt.hasData) return;

    const deltaB = Math.abs(state.tilt.beta - state.tilt.baseBeta);
    const deltaG = Math.abs(state.tilt.gamma - state.tilt.baseGamma);
    const lift = clamp(deltaB * 1.9 + deltaG * 1.05, 0, 56);
    state.grill.heat = Math.round(clamp(45 + lift, 0, 100));
    updateHeatUI();

    const panTilt = clamp((state.tilt.gamma - state.tilt.baseGamma) * 0.28, -7, 7);
    el.grillStation.style.setProperty("--pan-tilt", `${panTilt.toFixed(2)}deg`);
  }

  async function toggleTilt() {
    if (state.tilt.enabled) {
      disableTilt("Tilt controls off. The heat slider is yours again.", false);
      return;
    }
    if (typeof window.DeviceOrientationEvent === "undefined") {
      toast("No motion sensor here — the heat slider works beautifully.", "help", 2800);
      return;
    }
    audio.unlock();

    try {
      if (typeof window.DeviceOrientationEvent.requestPermission === "function") {
        const response = await window.DeviceOrientationEvent.requestPermission();
        state.tilt.permission = response;
        if (response !== "granted") {
          toast("Motion access was declined. You can still use the heat slider.", "help", 3200);
          return;
        }
      }
    } catch (error) {
      toast("Safari needs this permission from a direct tap. Try the tilt button again.", "help", 3400);
      return;
    }

    state.tilt.enabled = true;
    state.tilt.hasData = false;
    state.tilt.beta = 0;
    state.tilt.gamma = 0;
    state.tilt.baseBeta = null;
    state.tilt.baseGamma = null;
    window.addEventListener("deviceorientation", orientHandler, true);
    updateTiltUI();
    toast("Tilt is on. Hold your phone naturally, then lean to stoke the heat.", "motion", 3600);
    clearTimeout(state.tilt.timer);
    state.tilt.timer = setTimeout(() => {
      if (state.tilt.enabled && !state.tilt.hasData) {
        disableTilt("No motion data arrived — use the heat slider instead.", true);
      }
    }, 2400);
  }

  function disableTilt(message, quiet) {
    state.tilt.enabled = false;
    state.tilt.hasData = false;
    clearTimeout(state.tilt.timer);
    window.removeEventListener("deviceorientation", orientHandler, true);
    el.grillStation.style.setProperty("--pan-tilt", "0deg");
    updateTiltUI();
    if (!quiet && message) toast(message, "motion", 2400);
  }

  function calibrateTilt() {
    if (!state.tilt.enabled) return;
    if (!state.tilt.hasData) {
      toast("Waiting for a motion reading. Give it a gentle wiggle.", "motion", 2200);
      return;
    }
    state.tilt.baseBeta = state.tilt.beta;
    state.tilt.baseGamma = state.tilt.gamma;
    toast("Calibrated. Level is medium heat.", "check", 2000);
    audio.click();
  }

  /* ---------- save / help / sound ---------- */

  function saveProgress() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        coins: state.coins,
        stars: state.stars,
        served: state.served,
        sound: state.sound,
      }));
    } catch { /* private mode */ }
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      state.coins = Number.isFinite(saved.coins) ? saved.coins : 0;
      state.stars = Number.isFinite(saved.stars) ? saved.stars : 0;
      state.served = Number.isFinite(saved.served) ? saved.served : 0;
      state.sound = saved.sound !== false;
    } catch { /* ignore */ }
  }

  function openHelp() {
    el.progressCopy.textContent = state.served === 0
      ? "No dishes served yet. The kitchen is yours."
      : `${state.served} dish${state.served === 1 ? "" : "es"} served · ${state.stars} perfect · ${state.coins} coins.`;
    updateSoundUI();
    updateTiltUI();
    if (typeof el.helpDialog.showModal === "function") el.helpDialog.showModal();
    audio.unlock();
    audio.click();
  }

  function closeHelp() {
    if (el.helpDialog.open) el.helpDialog.close();
  }

  function toggleSound() {
    state.sound = !state.sound;
    audio.setMuted(!state.sound);
    if (state.sound) {
      audio.unlock();
      audio.click();
    }
    updateSoundUI();
    saveProgress();
    toast(state.sound ? "Sound on. A little kitchen music." : "Sound off. Just the quiet.", state.sound ? "sound" : "muted", 2000);
  }

  let resetArmed = false;
  let resetTimer = null;

  function resetProgress() {
    if (!resetArmed) {
      resetArmed = true;
      el.resetBtn.textContent = "Tap again to reset";
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        resetArmed = false;
        el.resetBtn.textContent = "Reset progress";
      }, 2600);
      return;
    }
    clearTimeout(resetTimer);
    resetArmed = false;
    el.resetBtn.textContent = "Reset progress";
    state.coins = 0;
    state.stars = 0;
    state.served = 0;
    state.orderIndex = 0;
    try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
    startOrder(0, { reset: true, quiet: true });
    updateHud();
    el.progressCopy.textContent = "No dishes served yet. The kitchen is yours.";
    closeHelp();
    toast("A fresh kitchen. Take all the time you need.", "sparkle", 2800);
  }

  /* ---------- events ---------- */

  function bindEvents() {
    el.tray.addEventListener("pointerdown", (event) => {
      const chip = event.target.closest(".ingredient-chip");
      if (chip) onTrayPointerDown(event, chip);
    });

    // Keyboard and assistive-tech activation for chips.
    el.tray.addEventListener("click", (event) => {
      const chip = event.target.closest(".ingredient-chip");
      if (!chip) return;
      if (event.detail === 0) routeIngredient(chip.dataset.ingredient, chip);
    });

    document.addEventListener("pointermove", onPointerMove, { passive: false });
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", cancelDrag);

    el.boardScene.addEventListener("pointerdown", onBoardPointerDown);
    el.boardScene.addEventListener("pointermove", onBoardPointerMove, { passive: false });
    el.boardScene.addEventListener("pointerup", onBoardPointerUp);
    el.boardScene.addEventListener("pointercancel", onBoardPointerUp);
    el.boardScene.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        chopOnce();
      }
    });

    el.boardToPlate.addEventListener("click", sendBoardToPlate);
    el.boardToss.addEventListener("click", tossBoard);
    el.flipBtn.addEventListener("click", flipPatty);
    el.takeOffBtn.addEventListener("click", takeOffPatty);
    el.grillToss.addEventListener("click", tossPatty);
    el.serveBtn.addEventListener("click", serve);
    el.clearPlate.addEventListener("click", clearPlate);
    el.nextCustomer.addEventListener("click", nextOrder);

    el.heat.addEventListener("input", (event) => {
      if (state.tilt.enabled) return;
      state.grill.heat = Number(event.target.value);
      updateHeatUI();
      updateGrillFrame();
    });
    el.heat.addEventListener("change", () => audio.click());

    el.tiltBtn.addEventListener("click", toggleTilt);
    el.tiltHelpBtn.addEventListener("click", toggleTilt);
    el.calibrateBtn.addEventListener("click", calibrateTilt);
    el.soundBtn.addEventListener("click", toggleSound);
    el.soundHelpBtn.addEventListener("click", toggleSound);
    el.helpBtn.addEventListener("click", openHelp);
    el.resetBtn.addEventListener("click", resetProgress);

    el.helpDialog.addEventListener("click", (event) => {
      if (event.target === el.helpDialog) closeHelp();
    });
    for (const button of document.querySelectorAll("[data-close-dialog]")) {
      button.addEventListener("click", closeHelp);
    }

    document.addEventListener("pointerdown", () => {
      audio.muted = !state.sound;
      audio.unlock();
      audio.setMuted(!state.sound);
    }, { passive: true });

    document.addEventListener("visibilitychange", () => {
      if (!audio.ctx) return;
      if (document.hidden) audio.ctx.suspend();
      else if (state.sound) audio.ctx.resume();
    });

    window.addEventListener("resize", () => {
      fx.resize();
      layoutScenes();
    });
    window.addEventListener("orientationchange", () => {
      setTimeout(() => {
        fx.resize();
        layoutScenes();
      }, 220);
    });

    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(() => layoutScenes());
      observer.observe(el.boardScene);
      observer.observe(el.grillScene);
      observer.observe(el.plateScene);
    }

    // Stop the browser from scrolling the page under a drag.
    document.addEventListener("touchmove", (event) => {
      if (drag) event.preventDefault();
    }, { passive: false });
  }

  /* ---------- startup ---------- */

  function init() {
    loadProgress();
    audio.muted = !state.sound;
    state.orderIndex = state.served % CUSTOMERS.length;

    renderTray();
    startOrder(state.orderIndex, { reset: true, quiet: true });
    updateHud();
    updateSoundUI();
    updateTiltUI();
    audio.setMuted(!state.sound);

    bindEvents();
    requestAnimationFrame(() => {
      layoutScenes();
      requestAnimationFrame(layoutScenes);
    });

    if (isTouch) {
      document.body.classList.add("is-touch");
    }

    requestAnimationFrame(loop);
  }

  init();
})();

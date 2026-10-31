/* Sizzle — a cozy cooking simulator.
   Hand-drawn canvas kitchen, touch-first, no timers. */
(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const $ = (id) => document.getElementById(id);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* -------------------------------------------------------------------------- */
  /*                                  data                                      */
  /* -------------------------------------------------------------------------- */

  const INGREDIENTS = {
    butter: { name: 'Butter', color: '#f3cf7a', cooked: '#e7a84d', pieces: 1, kind: 'butter' },
    egg: { name: 'Egg', color: '#f6a62d', cooked: '#e89022', pieces: 1, kind: 'egg' },
    cheese: { name: 'Cheese', color: '#f5d37c', cooked: '#e9b44c', pieces: 7, kind: 'cheese' },
    chive: { name: 'Chive', color: '#5f8a48', cooked: '#486b37', pieces: 12, kind: 'chive' },
    oil: { name: 'Olive oil', color: '#d9a83e', cooked: '#c58c2e', pieces: 0, kind: 'oil' },
    garlic: { name: 'Garlic', color: '#f1e2c2', cooked: '#dfb96f', pieces: 8, kind: 'garlic' },
    tomato: { name: 'Tomato', color: '#d94b38', cooked: '#b53a2c', pieces: 6, kind: 'tomato' },
    pasta: { name: 'Pasta', color: '#e8c56a', cooked: '#d4a94b', pieces: 10, kind: 'pasta' },
    basil: { name: 'Basil', color: '#4f7d3f', cooked: '#3d6330', pieces: 5, kind: 'basil' },
    onion: { name: 'Onion', color: '#c98fa6', cooked: '#d4a25b', pieces: 10, kind: 'onion' },
    pepper: { name: 'Pepper', color: '#5e8b4b', cooked: '#7b7a3d', pieces: 8, kind: 'pepper' },
    mushroom: { name: 'Mushroom', color: '#c9a57a', cooked: '#9a6e45', pieces: 5, kind: 'mushroom' },
    soy: { name: 'Soy sauce', color: '#4a2c1c', cooked: '#332014', pieces: 0, kind: 'soy' }
  };

  const RECIPES = [
    {
      id: 'omelette',
      name: 'Sunny Omelette',
      desc: 'Buttery eggs, melty cheese, and a scatter of fresh chives.',
      price: 14,
      accent: '#d99a3f',
      ingredients: ['butter', 'egg', 'cheese', 'chive'],
      tip: 'Low and slow keeps the eggs soft. Pull the pan off the heat before they look fully set.',
      steps: [
        { label: 'Warm the pan', done: (s) => s.temp > 26 },
        { label: 'Melt the butter', done: (s) => has(s, 'butter') },
        { label: 'Add the eggs', done: (s) => has(s, 'egg') },
        { label: 'Stir until softly set', done: (s) => donenessOf(s, 'egg') > 0.55 },
        { label: 'Add cheese + chive', done: (s) => has(s, 'cheese') && has(s, 'chive') },
        { label: 'Serve it sunny', done: (s) => allRequired(s) }
      ],
      verdict: 'Soft, buttery, and just right.'
    },
    {
      id: 'pasta',
      name: 'Tomato Basil Pasta',
      desc: 'Glossy pasta tossed with blistered tomato, garlic, and torn basil.',
      price: 16,
      accent: '#b9563f',
      ingredients: ['oil', 'garlic', 'tomato', 'pasta', 'basil'],
      tip: 'Let the garlic perfume the oil but never brown. Toss the pasta through the sauce at the end.',
      steps: [
        { label: 'Warm the oil', done: (s) => has(s, 'oil') && s.temp > 24 },
        { label: 'Bloom the garlic', done: (s) => donenessOf(s, 'garlic') > 0.18 },
        { label: 'Add the tomatoes', done: (s) => has(s, 'tomato') },
        { label: 'Add the pasta', done: (s) => has(s, 'pasta') },
        { label: 'Toss with basil', done: (s) => has(s, 'basil') && s.stirQuality > 0.45 },
        { label: 'Serve it glossy', done: (s) => allRequired(s) }
      ],
      verdict: 'Glossy, fragrant, and very hard to share.'
    },
    {
      id: 'stirfry',
      name: 'Garden Stir-fry',
      desc: 'Sweet onion, snappy pepper, and mushrooms with a splash of soy.',
      price: 15,
      accent: '#6f8a4c',
      ingredients: ['oil', 'onion', 'pepper', 'mushroom', 'soy'],
      tip: 'A hot pan and a quick toss keep the vegetables bright. Add soy at the very end.',
      steps: [
        { label: 'Get the pan hot', done: (s) => s.temp > 54 },
        { label: 'Add the oil', done: (s) => has(s, 'oil') },
        { label: 'Sear onion + pepper', done: (s) => has(s, 'onion') && has(s, 'pepper') && (donenessOf(s, 'onion') > 0.28 || donenessOf(s, 'pepper') > 0.28) },
        { label: 'Add the mushrooms', done: (s) => has(s, 'mushroom') },
        { label: 'Splash in soy', done: (s) => has(s, 'soy') },
        { label: 'Serve it snappy', done: (s) => allRequired(s) }
      ],
      verdict: 'Bright, snappy, and full of garden crunch.'
    }
  ];

  function has(s, type) {
    return s.items.some((item) => item.type === type);
  }

  function itemOf(s, type) {
    return s.items.find((item) => item.type === type);
  }

  function donenessOf(s, type) {
    const item = itemOf(s, type);
    return item ? item.doneness : 0;
  }

  function allRequired(s) {
    return s.recipe.ingredients.every((type) => has(s, type));
  }

  function averageDoneness(s) {
    const req = s.recipe.ingredients;
    if (!req.length) return 0;
    return req.reduce((sum, type) => sum + donenessOf(s, type), 0) / req.length;
  }

  function donenessScore(d) {
    if (d < 0.65) return 0.1 + 0.9 * Math.pow(clamp(d / 0.65, 0, 1), 1.6);
    if (d <= 1.02) return 1;
    if (d <= 1.28) return 1 - ((d - 1.02) / 0.26) * 0.62;
    return Math.max(0.08, 0.38 - (d - 1.28) * 0.7);
  }

  /* -------------------------------------------------------------------------- */
  /*                                  icons                                     */
  /* -------------------------------------------------------------------------- */

  const ICONS = {
    butter: '<svg viewBox="0 0 48 48"><path d="M9 19l7-7h29l-7 7z" fill="#ffe3a2"/><path d="M38 19l7-7v18l-7 7z" fill="#dca94e"/><rect x="9" y="19" width="29" height="18" rx="3" fill="#f4cd70"/><path d="M13 24h19M13 29h12" stroke="#ffe9b1" stroke-width="2" stroke-linecap="round" opacity=".8"/></svg>',
    egg: '<svg viewBox="0 0 48 48"><ellipse cx="24" cy="26" rx="15" ry="17" fill="#fdf6e7" stroke="#e6d6ba" stroke-width="1.2"/><circle cx="25" cy="25" r="7.6" fill="#f3a52e"/><circle cx="22.8" cy="22.8" r="2.5" fill="#ffca5e" opacity=".9"/></svg>',
    cheese: '<svg viewBox="0 0 48 48"><path d="M8 35L23 10l17 8-9 18z" fill="#f4c85a"/><path d="M8 35l17-6 6 7z" fill="#dfab3d"/><path d="M31 18l9-8" stroke="#ffe59a" stroke-width="2" opacity=".7"/><circle cx="23" cy="25" r="2.1" fill="#d8a33a"/><circle cx="30" cy="31" r="1.5" fill="#d8a33a"/><circle cx="18" cy="30" r="1.2" fill="#d8a33a"/></svg>',
    chive: '<svg viewBox="0 0 48 48"><path d="M17 40c0-13 2-21 5-31M24 40c0-11 1-20 4-29M31 40c-1-12 0-19 3-27" stroke="#5f8a48" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M12 24l8 2M28 29l8-2M20 34l7 1" stroke="#79a65d" stroke-width="2.2" stroke-linecap="round"/></svg>',
    oil: '<svg viewBox="0 0 48 48"><path d="M24 7c5.5 8.6 10 14.7 10 20.5A10 10 0 0 1 14 27.5C14 21.7 18.5 15.6 24 7z" fill="#e8b34a"/><path d="M20 27c0 4.4 2 7 5 8" stroke="#ffe6a2" stroke-width="2.4" stroke-linecap="round" fill="none"/><circle cx="28" cy="22" r="1.6" fill="#fff1bd" opacity=".8"/></svg>',
    garlic: '<svg viewBox="0 0 48 48"><path d="M24 12c4 0 6 3 6 7 5 2 8 6 8 11 0 7-6 11-14 11S10 37 10 30c0-5 3-9 8-11 0-4 2-7 6-7z" fill="#f1e2c2"/><path d="M24 15v22M18 20c-1 6-1 11 0 15M30 20c1 6 1 11 0 15" stroke="#d6c197" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M24 12c0-4 2-6 5-7" stroke="#7c9a5e" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>',
    tomato: '<svg viewBox="0 0 48 48"><circle cx="24" cy="28" r="14" fill="#d94b38"/><circle cx="19" cy="23" r="4.4" fill="#ec6a54" opacity=".7"/><path d="M24 14l2.2 5 5.8-3.2-3 5.7 5.5 1.7-6 1.4-1.4 4-1.9-3.8-4.9 1.9 2.4-4.6-4.4-2.6 5.3-.3z" fill="#5f8a48"/></svg>',
    pasta: '<svg viewBox="0 0 48 48"><path d="M12 27c4-8 9-8 12-2s8 7 12-1M10 34c5-7 10-7 14-1s9 5 13-2M14 20c4-6 8-6 11-1s7 4 10-2" stroke="#e5bf62" stroke-width="3.2" stroke-linecap="round" fill="none"/><path d="M15 24c3-4 6-4 8 0" stroke="#f8dda0" stroke-width="1.6" stroke-linecap="round" fill="none"/></svg>',
    basil: '<svg viewBox="0 0 48 48"><path d="M24 39c0-11 0-19 0-27" stroke="#4f7d3f" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M24 27c-8 1-12-4-13-12 8-1 13 3 13 12z" fill="#5f8a48"/><path d="M24 21c8 1 12-4 13-12-8-1-13 3-13 12z" fill="#4b743c"/><path d="M24 29c-4 4-8 5-12 4" stroke="#4f7d3f" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>',
    onion: '<svg viewBox="0 0 48 48"><circle cx="24" cy="28" r="14" fill="#c78ca3"/><path d="M24 14c-2-4 0-7 3-8M20 14c-5 5-7 13-5 21M28 14c5 5 7 13 5 21M17 28c2-5 5-7 7-7M31 28c-2-5-5-7-7-7" stroke="#a96f88" stroke-width="1.7" fill="none" stroke-linecap="round"/><path d="M20 20c-2 6-2 12 0 17" stroke="#e6b7c9" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8"/></svg>',
    pepper: '<svg viewBox="0 0 48 48"><path d="M16 17c0-3 3-5 8-5s8 2 8 5c3 6 3 16-2 21-2 2-4 2-6 0-2 2-4 2-6 0-5-5-5-15-2-21z" fill="#5f8b4b"/><path d="M24 12c0-3 2-5 4-5" stroke="#4b713c" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M20 18c-2 6-2 13 0 18" stroke="#7fa66a" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M28 18c2 5 2 11 0 15" stroke="#477238" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".7"/></svg>',
    mushroom: '<svg viewBox="0 0 48 48"><path d="M10 25c0-8 6-14 14-14s14 6 14 14c0 2-2 3-4 3H14c-2 0-4-1-4-3z" fill="#c9a57a"/><path d="M19 28h10l-1 9c0 2-2 3-4 3s-4-1-4-3z" fill="#e8d6b7"/><circle cx="19" cy="22" r="2" fill="#b18a5e"/><circle cx="28" cy="20" r="1.5" fill="#b18a5e"/><path d="M15 27c5 1 13 1 18 0" stroke="#b18a5e" stroke-width="1.4" fill="none"/></svg>',
    soy: '<svg viewBox="0 0 48 48"><path d="M19 8h10v6l3 5v18a4 4 0 0 1-4 4h-8a4 4 0 0 1-4-4V19l3-5z" fill="#4a2c1c"/><rect x="19" y="24" width="10" height="9" rx="1.4" fill="#e8d6b7"/><path d="M21 10h6M17 20h14" stroke="#2e1a10" stroke-width="2" stroke-linecap="round"/><path d="M22 28h4" stroke="#8a6a4b" stroke-width="1.4" stroke-linecap="round"/></svg>'
  };

  function iconSVG(type) {
    return ICONS[type] || '';
  }

  /* -------------------------------------------------------------------------- */
  /*                                  dom                                       */
  /* -------------------------------------------------------------------------- */

  const els = {
    app: $('app'),
    stage: $('stage'),
    scene: $('scene'),
    recipePill: $('recipePill'),
    recipePillName: $('recipePillName'),
    recipePillCount: $('recipePillCount'),
    recipePillDot: $('recipePillDot'),
    coinValue: $('coinValue'),
    soundBtn: $('soundBtn'),
    helpBtn: $('helpBtn'),
    recipeCard: $('recipeCard'),
    recipeSheet: $('recipeSheet'),
    sheetContent: $('sheetContent'),
    sheetBackdrop: $('sheetBackdrop'),
    sheetGrab: $('sheetGrab'),
    hintPill: $('hintPill'),
    hintText: $('hintText'),
    heatControl: $('heatControl'),
    heatTrack: $('heatTrack'),
    heatFill: $('heatFill'),
    heatKnob: $('heatKnob'),
    heatValue: $('heatValue'),
    tiltBtn: $('tiltBtn'),
    tiltReadout: $('tiltReadout'),
    tiltBubble: $('tiltBubble'),
    clearBtn: $('clearBtn'),
    stirBtn: $('stirBtn'),
    serveBtn: $('serveBtn'),
    pantryList: $('pantryList'),
    pantryHint: $('pantryHint'),
    toast: $('toast'),
    panCallout: $('panCallout'),
    panCalloutText: $('panCalloutText'),
    welcome: $('welcome'),
    welcomeStart: $('welcomeStart'),
    welcomeKicker: $('welcomeKicker'),
    welcomeFoot: $('welcomeFoot'),
    serveModal: $('serveModal'),
    serveTitle: $('serveTitle'),
    dishCanvas: $('dishCanvas'),
    starRow: $('starRow'),
    serveVerdict: $('serveVerdict'),
    scoreBars: $('scoreBars'),
    serveTip: $('serveTip'),
    serveCoins: $('serveCoins'),
    serveNext: $('serveNext'),
    serveReplay: $('serveReplay')
  };

  const canvas = els.scene;
  const ctx = canvas.getContext('2d');
  const size = { w: 1, h: 1, dpr: 1 };
  const pan = { cx: 0, cy: 0, rx: 1, ry: 1 };
  let bgCanvas = document.createElement('canvas');
  let bgCtx = bgCanvas.getContext('2d');

  /* -------------------------------------------------------------------------- */
  /*                                  state                                     */
  /* -------------------------------------------------------------------------- */

  const STORAGE_KEY = 'sizzle.profile.v1';

  function loadProfile() {
    const fallback = { coins: 0, served: 0, sound: true, recipeIndex: 0 };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return fallback;
      const data = JSON.parse(raw);
      return {
        coins: Number.isFinite(data.coins) ? data.coins : 0,
        served: Number.isFinite(data.served) ? data.served : 0,
        sound: data.sound !== false,
        recipeIndex: Number.isFinite(data.recipeIndex) ? data.recipeIndex : 0
      };
    } catch (err) {
      return fallback;
    }
  }

  let profile = loadProfile();

  const state = {
    recipe: RECIPES[0],
    recipeIndex: 0,
    items: [],
    selected: null,
    heat: 55,
    temp: 20,
    stirQuality: 0.16,
    stirring: false,
    stirImpulse: 0,
    tiltOn: false,
    tilt: { x: 0, y: 0, gotReading: false, calibration: null },
    serving: false,
    serveStarted: 0,
    paused: true,
    lastScore: null,
    pointerStir: null,
    lastHint: '',
    lastGuide: 0,
    steamAcc: 0,
    sparkAcc: 0,
    rippleAcc: 0,
    audioTick: 0
  };

  const particles = [];
  const motes = [];

  /* -------------------------------------------------------------------------- */
  /*                                  sound                                     */
  /* -------------------------------------------------------------------------- */

  const Sound = {
    ctx: null,
    master: null,
    sizzleGain: null,
    muted: !profile.sound,
    init() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        return;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        const ac = new AC();
        const master = ac.createGain();
        master.gain.value = this.muted ? 0 : 0.55;
        master.connect(ac.destination);

        const buffer = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
        const data = buffer.getChannelData(0);
        let last = 0;
        for (let i = 0; i < data.length; i++) {
          const white = Math.random() * 2 - 1;
          last = (last + 0.025 * white) / 1.025;
          data[i] = last * 3.2;
        }
        const source = ac.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        const filter = ac.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 2400;
        filter.Q.value = 0.55;
        const sizzleGain = ac.createGain();
        sizzleGain.gain.value = 0;
        source.connect(filter);
        filter.connect(sizzleGain);
        sizzleGain.connect(master);
        source.start();

        this.ctx = ac;
        this.master = master;
        this.sizzleGain = sizzleGain;
      } catch (err) {
        this.ctx = null;
      }
    },
    setMuted(muted) {
      this.muted = muted;
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(muted ? 0 : 0.55, now, 0.03);
    },
    updateSizzle(level) {
      if (!this.ctx || !this.sizzleGain) return;
      const now = this.ctx.currentTime;
      this.sizzleGain.gain.setTargetAtTime(this.muted ? 0 : level * 0.065, now, 0.08);
    },
    tone(freq, dur, type, gain, slide) {
      if (!this.ctx || this.muted) return;
      const ac = this.ctx;
      const now = ac.currentTime;
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, now);
      if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slide), now + dur);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(gain || 0.06, now + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(g);
      g.connect(this.master);
      osc.start(now);
      osc.stop(now + dur + 0.03);
    },
    plop() {
      this.tone(210, 0.15, 'sine', 0.075, 82);
      this.tone(430, 0.06, 'triangle', 0.02, 180);
    },
    tap() {
      this.tone(620, 0.05, 'triangle', 0.025, 540);
    },
    swish() {
      if (!this.ctx || this.muted) return;
      const ac = this.ctx;
      const now = ac.currentTime;
      const buffer = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.18), ac.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const src = ac.createBufferSource();
      src.buffer = buffer;
      const f = ac.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 900;
      f.Q.value = 0.8;
      const g = ac.createGain();
      g.gain.value = 0.03;
      src.connect(f);
      f.connect(g);
      g.connect(this.master);
      src.start(now);
    },
    chime() {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        setTimeout(() => this.tone(freq, 0.42, 'sine', 0.055, freq * 0.998), i * 90);
      });
    },
    nope() {
      this.tone(180, 0.16, 'triangle', 0.045, 130);
    }
  };

  function buzz(ms) {
    if (reducedMotion) return;
    if (navigator.vibrate) {
      try { navigator.vibrate(ms); } catch (err) { /* no-op */ }
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                                  helpers                                   */
  /* -------------------------------------------------------------------------- */

  function hexToRgb(hex) {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  }

  function mixHex(a, b, t) {
    const A = hexToRgb(a);
    const B = hexToRgb(b);
    return rgbToHex(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t));
  }

  function rgba(hex, alpha) {
    const c = hexToRgb(hex);
    return `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
  }

  function cookedColor(def, d) {
    const t = clamp(d / 1.05, 0, 1);
    let color = mixHex(def.color, def.cooked || def.color, t);
    const char = clamp((d - 1.03) / 0.36, 0, 1);
    color = mixHex(color, '#3a2314', char * 0.72);
    return color;
  }

  function roundRect(c, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + rr, y);
    c.arcTo(x + w, y, x + w, y + h, rr);
    c.arcTo(x + w, y + h, x, y + h, rr);
    c.arcTo(x, y + h, x, y, rr);
    c.arcTo(x, y, x + w, y, rr);
    c.closePath();
  }

  function ellipse(c, x, y, rx, ry) {
    c.beginPath();
    c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU);
  }

  function starSVG(filled) {
    return `<span class="star${filled ? ' is-filled' : ''}"><svg viewBox="0 0 32 32"><path d="M16 3.2l3.7 8.1 8.9.9-6.7 5.9 1.9 8.8L16 22.6l-7.8 4.3 1.9-8.8-6.7-5.9 8.9-.9z" fill="currentColor"/></svg></span>`;
  }

  let toastTimer = 0;
  function toast(message, duration) {
    els.toast.textContent = message;
    els.toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('is-on'), duration || 2400);
  }

  function vibrateTap() {
    buzz(8);
  }

  /* -------------------------------------------------------------------------- */
  /*                                  layout                                    */
  /* -------------------------------------------------------------------------- */

  function resize() {
    const rect = els.stage.getBoundingClientRect();
    size.w = Math.max(1, rect.width);
    size.h = Math.max(1, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    size.dpr = dpr;
    canvas.width = Math.round(size.w * dpr);
    canvas.height = Math.round(size.h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const compact = size.w < 900;
    pan.rx = clamp(Math.min(compact ? (size.w < 600 ? size.w * 0.34 : size.w * 0.35) : size.w * 0.3, size.h * 0.38, 308), 84, 308);
    pan.ry = pan.rx * 0.62;
    pan.cx = size.w / 2 + (size.w < 600 ? 28 : size.w < 900 ? -16 : 0);
    pan.cy = size.h * 0.53;

    bgCanvas.width = Math.round(size.w * dpr);
    bgCanvas.height = Math.round(size.h * dpr);
    bgCtx = bgCanvas.getContext('2d');
    bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    renderKitchen(bgCtx);

    motes.length = 0;
    const moteCount = reducedMotion ? 10 : 24;
    for (let i = 0; i < moteCount; i++) {
      motes.push({
        x: Math.random() * size.w,
        y: Math.random() * size.h * 0.8,
        r: 0.7 + Math.random() * 1.7,
        phase: Math.random() * TAU,
        speed: 0.12 + Math.random() * 0.25,
        drift: 4 + Math.random() * 10
      });
    }

    positionCallout();
  }

  /* -------------------------------------------------------------------------- */
  /*                              kitchen backdrop                              */
  /* -------------------------------------------------------------------------- */

  function counterYFor() {
    return clamp(pan.cy + pan.ry * 0.9, size.h * 0.46, size.h * 0.82);
  }

  function renderKitchen(c) {
    const w = size.w;
    const h = size.h;
    const counterY = counterYFor();

    c.clearRect(0, 0, w, h);

    let g = c.createLinearGradient(0, 0, 0, counterY);
    g.addColorStop(0, '#f8efdf');
    g.addColorStop(0.5, '#f1e2ca');
    g.addColorStop(1, '#e8d3b2');
    c.fillStyle = g;
    c.fillRect(0, 0, w, counterY);

    const glow = c.createRadialGradient(w * 0.52, -h * 0.12, 10, w * 0.52, h * 0.34, h * 0.92);
    glow.addColorStop(0, 'rgba(255, 250, 233, 0.85)');
    glow.addColorStop(0.42, 'rgba(255, 243, 214, 0.28)');
    glow.addColorStop(1, 'rgba(255, 240, 210, 0)');
    c.fillStyle = glow;
    c.fillRect(0, 0, w, counterY);

    // soft tile grid
    const tile = clamp(w / 15, 34, 62);
    c.save();
    c.strokeStyle = 'rgba(116, 83, 52, 0.075)';
    c.lineWidth = 1;
    for (let x = (w % tile) / 2; x < w; x += tile) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, counterY);
      c.stroke();
    }
    for (let y = 0; y < counterY; y += tile) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(w, y);
      c.stroke();
    }
    c.restore();

    // warm light shaft from the top left
    c.save();
    const shaft = c.createLinearGradient(w * 0.1, 0, w * 0.65, counterY);
    shaft.addColorStop(0, 'rgba(255, 249, 225, 0.35)');
    shaft.addColorStop(1, 'rgba(255, 249, 225, 0)');
    c.fillStyle = shaft;
    c.beginPath();
    c.moveTo(-w * 0.06, 0);
    c.lineTo(w * 0.42, 0);
    c.lineTo(w * 0.88, counterY);
    c.lineTo(w * 0.3, counterY);
    c.closePath();
    c.fill();
    c.restore();

    // small shelf of jars for narrow, tall screens where the window is hidden
    if (w <= 620 && h > 560) {
      const sx = Math.max(18, w * 0.075);
      const sy = Math.max(170, h * 0.27);
      const sw = Math.min(118, w * 0.3);

      c.save();

      // shelf shadow and plank
      c.fillStyle = 'rgba(92, 58, 31, 0.12)';
      roundRect(c, sx + 4, sy + 9, sw, 7, 3);
      c.fill();
      c.fillStyle = '#b77b4b';
      roundRect(c, sx, sy, sw, 8, 3);
      c.fill();
      c.fillStyle = 'rgba(255, 228, 190, 0.3)';
      roundRect(c, sx + 2, sy + 1, sw - 4, 2, 1);
      c.fill();

      // jars
      const jarColors = ['#d99a4e', '#8faa6a', '#e6c58e'];
      for (let i = 0; i < 3; i++) {
        const jw = sw * 0.18;
        const jh = 21 + (i % 2) * 9;
        const jx = sx + sw * (0.12 + i * 0.28);
        const jy = sy - jh;

        c.fillStyle = jarColors[i];
        roundRect(c, jx, jy, jw, jh, 4);
        c.fill();
        c.fillStyle = 'rgba(255, 250, 235, 0.3)';
        roundRect(c, jx + 2, jy + 3, jw * 0.28, jh * 0.58, 2);
        c.fill();
        c.fillStyle = '#7d4a2a';
        roundRect(c, jx - 1, jy - 5, jw + 2, 6, 2);
        c.fill();
      }

      // a little herb sprig in the middle jar
      c.strokeStyle = 'rgba(94, 125, 76, 0.8)';
      c.lineWidth = 1.6;
      c.lineCap = 'round';
      const sprigX = sx + sw * 0.54;
      c.beginPath();
      c.moveTo(sprigX, sy - 31);
      c.quadraticCurveTo(sprigX - 6, sy - 44, sprigX - 11, sy - 49);
      c.moveTo(sprigX + 1, sy - 31);
      c.quadraticCurveTo(sprigX + 7, sy - 42, sprigX + 12, sy - 46);
      c.stroke();

      c.restore();
    }

    // little sunlit window on the back wall
    if (w > 620) {
      const wx = w * 0.075;
      const wy = h * 0.08;
      const ww = Math.min(176, w * 0.145);
      const wh = Math.min(200, counterY * 0.45);
      c.save();

      // outer frame
      c.fillStyle = 'rgba(255, 249, 235, 0.9)';
      roundRect(c, wx - 7, wy - 7, ww + 14, wh + 14, 15);
      c.fill();

      // warm afternoon sky
      const sky = c.createLinearGradient(0, wy, 0, wy + wh);
      sky.addColorStop(0, '#fff5d8');
      sky.addColorStop(0.52, '#ffe6b2');
      sky.addColorStop(1, '#f4c987');
      c.fillStyle = sky;
      roundRect(c, wx, wy, ww, wh, 10);
      c.fill();

      // soft sun glow
      const sun = c.createRadialGradient(
        wx + ww * 0.68, wy + wh * 0.27, 2,
        wx + ww * 0.68, wy + wh * 0.27, ww * 0.62
      );
      sun.addColorStop(0, 'rgba(255, 253, 235, 0.95)');
      sun.addColorStop(0.4, 'rgba(255, 246, 209, 0.5)');
      sun.addColorStop(1, 'rgba(255, 240, 194, 0)');
      c.fillStyle = sun;
      c.fillRect(wx, wy, ww, wh);

      // distant hills
      c.fillStyle = 'rgba(188, 165, 112, 0.26)';
      c.beginPath();
      c.moveTo(wx, wy + wh * 0.73);
      c.quadraticCurveTo(wx + ww * 0.24, wy + wh * 0.56, wx + ww * 0.5, wy + wh * 0.7);
      c.quadraticCurveTo(wx + ww * 0.76, wy + wh * 0.84, wx + ww, wy + wh * 0.64);
      c.lineTo(wx + ww, wy + wh);
      c.lineTo(wx, wy + wh);
      c.closePath();
      c.fill();

      // glass shine
      c.fillStyle = 'rgba(255, 255, 245, 0.18)';
      c.beginPath();
      c.moveTo(wx + ww * 0.08, wy);
      c.lineTo(wx + ww * 0.34, wy);
      c.lineTo(wx + ww * 0.12, wy + wh);
      c.lineTo(wx, wy + wh);
      c.closePath();
      c.fill();

      // mullions
      c.strokeStyle = 'rgba(255, 251, 240, 0.96)';
      c.lineWidth = Math.max(4, ww * 0.036);
      c.lineCap = 'butt';
      c.beginPath();
      c.moveTo(wx + ww / 2, wy);
      c.lineTo(wx + ww / 2, wy + wh);
      c.moveTo(wx, wy + wh * 0.52);
      c.lineTo(wx + ww, wy + wh * 0.52);
      c.stroke();

      // inner frame line
      c.strokeStyle = 'rgba(150, 112, 72, 0.32)';
      c.lineWidth = 2.5;
      roundRect(c, wx, wy, ww, wh, 10);
      c.stroke();

      // sill
      c.fillStyle = 'rgba(255, 249, 234, 0.96)';
      roundRect(c, wx - 13, wy + wh + 2, ww + 26, 9, 4.5);
      c.fill();
      c.fillStyle = 'rgba(120, 86, 52, 0.16)';
      roundRect(c, wx - 7, wy + wh + 11, ww + 14, 3, 1.5);
      c.fill();

      // tiny potted herb on the sill
      const potX = wx + ww * 0.16;
      const potY = wy + wh + 1;
      c.fillStyle = 'rgba(146, 88, 51, 0.7)';
      roundRect(c, potX - 6, potY - 8, 12, 9, 2.5);
      c.fill();
      c.strokeStyle = 'rgba(103, 128, 82, 0.8)';
      c.lineWidth = 1.6;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(potX, potY - 8);
      c.quadraticCurveTo(potX - 5, potY - 18, potX - 8, potY - 20);
      c.moveTo(potX + 1, potY - 8);
      c.quadraticCurveTo(potX + 6, potY - 17, potX + 9, potY - 19);
      c.stroke();

      c.restore();
    }

    // counter
    g = c.createLinearGradient(0, counterY, 0, h);
    g.addColorStop(0, '#c98f5c');
    g.addColorStop(0.18, '#b77b4b');
    g.addColorStop(0.6, '#a2683e');
    g.addColorStop(1, '#875230');
    c.fillStyle = g;
    c.fillRect(0, counterY, w, h - counterY);

    // counter front edge
    c.fillStyle = '#d9a372';
    c.fillRect(0, counterY, w, Math.max(3, h * 0.008));
    c.fillStyle = 'rgba(70, 40, 20, 0.16)';
    c.fillRect(0, counterY + Math.max(3, h * 0.008), w, 5);

    // wood grain
    c.save();
    c.strokeStyle = 'rgba(84, 48, 25, 0.14)';
    c.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      const y = counterY + 14 + i * ((h - counterY) / 12);
      c.beginPath();
      c.moveTo(0, y);
      for (let x = 0; x <= w; x += 40) {
        c.lineTo(x, y + Math.sin(x * 0.013 + i * 1.7) * 2.2);
      }
      c.stroke();
    }
    c.strokeStyle = 'rgba(255, 224, 185, 0.12)';
    for (let i = 0; i < 5; i++) {
      const y = counterY + 30 + i * 47;
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(w, y + 3);
      c.stroke();
    }
    c.restore();

    drawStove(c, counterY);
    drawDecor(c, counterY);

    // vignette
    const vignette = c.createRadialGradient(w / 2, h * 0.42, h * 0.24, w / 2, h * 0.5, Math.max(w, h) * 0.78);
    vignette.addColorStop(0, 'rgba(51, 30, 14, 0)');
    vignette.addColorStop(1, 'rgba(51, 30, 14, 0.24)');
    c.fillStyle = vignette;
    c.fillRect(0, 0, w, h);
  }

  function drawStove(c, counterY) {
    const sw = Math.max(pan.rx * 2.65, Math.min(size.w * 0.72, 430));
    const sh = Math.max(pan.ry * 3.2, Math.min(size.h * 0.52, 250));
    const sx = pan.cx - sw / 2;
    const sy = pan.cy - sh * 0.34;

    c.save();
    c.shadowColor = 'rgba(48, 27, 12, 0.3)';
    c.shadowBlur = 24;
    c.shadowOffsetY = 12;

    const g = c.createLinearGradient(sx, sy, sx + sw, sy + sh);
    g.addColorStop(0, '#4b4138');
    g.addColorStop(0.35, '#332c26');
    g.addColorStop(1, '#211b17');
    c.fillStyle = g;
    roundRect(c, sx, sy, sw, sh, Math.max(18, pan.rx * 0.11));
    c.fill();
    c.restore();

    // glass rim
    c.save();
    c.strokeStyle = 'rgba(255, 235, 204, 0.16)';
    c.lineWidth = 1.5;
    roundRect(c, sx + 1, sy + 1, sw - 2, sh - 2, Math.max(18, pan.rx * 0.11));
    c.stroke();
    c.restore();

    // glass reflection
    const refl = c.createLinearGradient(sx, sy, sx + sw * 0.7, sy + sh);
    refl.addColorStop(0, 'rgba(255, 247, 226, 0.1)');
    refl.addColorStop(0.4, 'rgba(255, 247, 226, 0.015)');
    refl.addColorStop(1, 'rgba(255, 247, 226, 0)');
    c.fillStyle = refl;
    roundRect(c, sx, sy, sw, sh, Math.max(18, pan.rx * 0.11));
    c.fill();

    // subtle stovetop rings
    c.save();
    c.strokeStyle = 'rgba(255, 234, 201, 0.08)';
    c.lineWidth = 1;
    ellipse(c, pan.cx, pan.cy + pan.ry * 0.06, pan.rx * 1.24, pan.ry * 1.24);
    c.stroke();
    ellipse(c, pan.cx, pan.cy + pan.ry * 0.06, pan.rx * 1.38, pan.ry * 1.38);
    c.stroke();
    c.restore();

    // little knobs on the front edge
    const knobY = sy + sh - Math.max(12, sh * 0.075);
    for (let i = -1; i <= 1; i++) {
      const kx = pan.cx + i * Math.max(30, sw * 0.16);
      c.save();
      c.fillStyle = 'rgba(255, 242, 218, 0.15)';
      ellipse(c, kx, knobY, Math.max(7, sw * 0.018), Math.max(4, sw * 0.01));
      c.fill();
      c.fillStyle = '#b66b3f';
      ellipse(c, kx, knobY - 1, Math.max(5, sw * 0.012), Math.max(3, sw * 0.007));
      c.fill();
      c.restore();
    }

    // warm pool of light on the counter
    const pool = c.createRadialGradient(pan.cx, counterY + 24, 4, pan.cx, counterY + 24, pan.rx * 1.6);
    pool.addColorStop(0, 'rgba(255, 193, 111, 0.16)');
    pool.addColorStop(1, 'rgba(255, 193, 111, 0)');
    c.fillStyle = pool;
    c.fillRect(pan.cx - pan.rx * 1.7, counterY, pan.rx * 3.4, size.h - counterY);
  }

  function drawDecor(c, counterY) {
    // herb pot on the left of the counter
    const px = Math.max(30, Math.min(74, size.w * 0.075));
    const py = counterY + Math.max(22, size.h * 0.055);
    c.save();
    c.translate(px, py);
    c.fillStyle = 'rgba(60, 35, 18, 0.18)';
    ellipse(c, 0, 19, 27, 8);
    c.fill();
    const pot = c.createLinearGradient(-24, 0, 24, 0);
    pot.addColorStop(0, '#bd7047');
    pot.addColorStop(0.55, '#a55a36');
    pot.addColorStop(1, '#7e4025');
    c.fillStyle = pot;
    c.beginPath();
    c.moveTo(-20, -4);
    c.lineTo(20, -4);
    c.lineTo(15, 20);
    c.quadraticCurveTo(0, 26, -15, 20);
    c.closePath();
    c.fill();
    c.fillStyle = '#c67a4f';
    ellipse(c, 0, -5, 21, 6);
    c.fill();
    c.strokeStyle = '#4f7042';
    c.lineWidth = 3;
    c.lineCap = 'round';
    const sway = reducedMotion ? 0 : Math.sin(performance.now() * 0.0007) * 2;
    c.beginPath();
    c.moveTo(-8, -7);
    c.quadraticCurveTo(-18, -34, -6 + sway, -48);
    c.moveTo(2, -7);
    c.quadraticCurveTo(10, -35, 4 + sway, -54);
    c.moveTo(10, -7);
    c.quadraticCurveTo(24, -28, 18 + sway, -43);
    c.stroke();
    c.fillStyle = '#5f8a48';
    for (let i = 0; i < 6; i++) {
      const lx = -13 + i * 6;
      const ly = -28 - Math.sin(i) * 8;
      ellipse(c, lx, ly, 6, 3.4);
      c.fill();
    }
    c.restore();

    // a wooden spoon resting at the right, behind the heat panel
    if (size.w > 700) {
      c.save();
      c.translate(size.w - 110, counterY + 62);
      c.rotate(-0.35);
      c.strokeStyle = 'rgba(70, 39, 19, 0.25)';
      c.lineWidth = 8;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(80, 0);
      c.stroke();
      c.strokeStyle = '#8b5a36';
      c.lineWidth = 6;
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(80, 0);
      c.stroke();
      c.fillStyle = '#a26b42';
      ellipse(c, -8, 0, 15, 10);
      c.fill();
      c.restore();
    }
  }

  function drawAmbient(t) {
    for (const m of motes) {
      const x = m.x + Math.sin(t * m.speed + m.phase) * m.drift;
      const y = m.y + Math.cos(t * m.speed * 0.7 + m.phase) * m.drift * 0.5;
      const a = 0.08 + 0.08 * (0.5 + 0.5 * Math.sin(t * 0.7 + m.phase));
      ctx.fillStyle = `rgba(255, 246, 214, ${a})`;
      ctx.beginPath();
      ctx.arc(x, y, m.r, 0, TAU);
      ctx.fill();
    }
  }

  function drawBurner(t) {
    const heat = state.temp / 100;
    if (heat < 0.02) return;
    const flicker = 1 + Math.sin(t * 11) * 0.025 + Math.sin(t * 17.3) * 0.015;
    const r = pan.rx * 1.18 * flicker;

    const g = ctx.createRadialGradient(pan.cx, pan.cy + pan.ry * 0.08, pan.rx * 0.18, pan.cx, pan.cy + pan.ry * 0.08, r);
    g.addColorStop(0, `rgba(255, 132, 47, ${0.05 + heat * 0.17})`);
    g.addColorStop(0.55, `rgba(255, 106, 30, ${0.03 + heat * 0.1})`);
    g.addColorStop(1, 'rgba(255, 90, 20, 0)');
    ctx.fillStyle = g;
    ellipse(ctx, pan.cx, pan.cy + pan.ry * 0.08, r, r * 0.8);
    ctx.fill();

    ctx.save();
    ctx.strokeStyle = `rgba(255, 151, 69, ${0.08 + heat * 0.32})`;
    ctx.lineWidth = 2;
    ellipse(ctx, pan.cx, pan.cy + pan.ry * 0.08, pan.rx * 1.16, pan.ry * 1.14);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255, 205, 139, ${0.04 + heat * 0.13})`;
    ctx.lineWidth = 1;
    ellipse(ctx, pan.cx, pan.cy + pan.ry * 0.08, pan.rx * 1.26, pan.ry * 1.23);
    ctx.stroke();
    ctx.restore();
  }

  /* -------------------------------------------------------------------------- */
  /*                                   pan                                      */
  /* -------------------------------------------------------------------------- */

  function panTilt() {
    if (state.tiltOn) return state.tilt.x;
    return reducedMotion ? 0 : Math.sin(performance.now() * 0.0006) * 0.12;
  }

  function drawPan(t) {
    const tilt = panTilt();
    const bob = reducedMotion ? 0 : Math.sin(t * 1.25) * 0.9 + (state.stirring ? Math.sin(t * 14) * 0.35 : 0);
    const servingLift = state.serving ? clamp((performance.now() - state.serveStarted) / 420, 0, 1) : 0;

    ctx.save();
    ctx.translate(pan.cx, pan.cy + bob - servingLift * 12);
    ctx.rotate(tilt * 0.055 + (state.serving ? servingLift * 0.08 : 0));

    // shadow on the stove
    ctx.save();
    ctx.translate(pan.rx * 0.06, pan.ry * 0.58 + servingLift * 18);
    ctx.scale(1, 0.42);
    const shadow = ctx.createRadialGradient(0, 0, pan.rx * 0.1, 0, 0, pan.rx * 1.08);
    shadow.addColorStop(0, `rgba(22, 12, 6, ${0.42 - servingLift * 0.16})`);
    shadow.addColorStop(1, 'rgba(22, 12, 6, 0)');
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.arc(0, 0, pan.rx * 1.08, 0, TAU);
    ctx.fill();
    ctx.restore();

    drawHandle();

    const body = ctx.createRadialGradient(-pan.rx * 0.38, -pan.ry * 0.48, pan.rx * 0.06, 0, 0, pan.rx * 1.16);
    body.addColorStop(0, '#d69a67');
    body.addColorStop(0.42, '#b26a3d');
    body.addColorStop(0.78, '#8a4a29');
    body.addColorStop(1, '#5c2e18');
    ctx.fillStyle = body;
    ellipse(ctx, 0, 0, pan.rx, pan.ry);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 213, 167, 0.55)';
    ctx.lineWidth = Math.max(1, pan.rx * 0.006);
    ellipse(ctx, 0, 0, pan.rx - 0.8, pan.ry - 0.8);
    ctx.stroke();

    // inner well
    ctx.fillStyle = '#231b16';
    ellipse(ctx, 0, pan.ry * 0.018, pan.rx * 0.87, pan.ry * 0.84);
    ctx.fill();

    ctx.save();
    ellipse(ctx, 0, pan.ry * 0.018, pan.rx * 0.865, pan.ry * 0.835);
    ctx.clip();

    drawPanSurface(t);
    drawOilSheen(t);
    drawFood(t);
    drawSizzle(t);

    ctx.restore();

    // inner rim shadow and highlights
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.32)';
    ctx.lineWidth = Math.max(2, pan.rx * 0.02);
    ellipse(ctx, 0, pan.ry * 0.018, pan.rx * 0.88, pan.ry * 0.85);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 222, 181, 0.2)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(0, pan.ry * 0.01, pan.rx * 0.82, pan.ry * 0.78, 0, Math.PI * 1.05, Math.PI * 1.65);
    ctx.stroke();

    // rivet where the handle meets the pan
    ctx.fillStyle = '#d9a16e';
    ellipse(ctx, pan.rx * 0.8, pan.ry * 0.04, pan.rx * 0.024, pan.ry * 0.035);
    ctx.fill();
    ctx.fillStyle = 'rgba(74, 38, 18, 0.55)';
    ellipse(ctx, pan.rx * 0.8, pan.ry * 0.04, pan.rx * 0.012, pan.ry * 0.018);
    ctx.fill();
    ctx.restore();

    // serving sparkle
    if (state.serving) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const glow = ctx.createRadialGradient(0, 0, pan.rx * 0.1, 0, 0, pan.rx * 1.15);
      glow.addColorStop(0, `rgba(255, 214, 137, ${0.18 + Math.sin(t * 12) * 0.05})`);
      glow.addColorStop(1, 'rgba(255, 214, 137, 0)');
      ctx.fillStyle = glow;
      ellipse(ctx, 0, 0, pan.rx * 1.15, pan.ry * 1.15);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  function drawHandle() {
    const x1 = pan.rx * 0.78;
    const y1 = pan.ry * 0.05;
    const x2 = pan.rx * (size.w < 600 ? 1.22 : 1.36);
    const y2 = pan.ry * 0.36;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(35, 19, 9, 0.22)';
    ctx.lineWidth = pan.ry * 0.27;
    ctx.beginPath();
    ctx.moveTo(x1, y1 + pan.ry * 0.06);
    ctx.quadraticCurveTo(pan.rx * 1.08, pan.ry * 0.12, x2, y2 + pan.ry * 0.05);
    ctx.stroke();

    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    grad.addColorStop(0, '#4b2a17');
    grad.addColorStop(0.45, '#6e3d22');
    grad.addColorStop(1, '#3c2112');
    ctx.strokeStyle = grad;
    ctx.lineWidth = pan.ry * 0.24;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(pan.rx * 1.08, pan.ry * 0.12, x2, y2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 219, 173, 0.18)';
    ctx.lineWidth = pan.ry * 0.035;
    ctx.beginPath();
    ctx.moveTo(x1 + pan.rx * 0.04, y1 - pan.ry * 0.06);
    ctx.quadraticCurveTo(pan.rx * 1.08, pan.ry * 0.04, x2 - pan.rx * 0.01, y2 - pan.ry * 0.05);
    ctx.stroke();

    ctx.fillStyle = '#8e4e2c';
    ellipse(ctx, x2 + 1, y2, pan.rx * 0.035, pan.ry * 0.07);
    ctx.fill();
    ctx.restore();
  }

  function drawPanSurface(t) {
    const heat = state.temp / 100;
    const g = ctx.createRadialGradient(-pan.rx * 0.16, -pan.ry * 0.22, pan.rx * 0.05, 0, pan.ry * 0.02, pan.rx * 0.95);
    g.addColorStop(0, heat > 0.15 ? mixHex('#3c2a20', '#54301c', heat * 0.55) : '#3c2a20');
    g.addColorStop(0.55, '#2b2018');
    g.addColorStop(1, '#1b1410');
    ctx.fillStyle = g;
    ellipse(ctx, 0, pan.ry * 0.018, pan.rx * 0.87, pan.ry * 0.84);
    ctx.fill();

    // broad top-left sheen so the pan reads as a deep, glossy surface
    const topSheen = ctx.createRadialGradient(-pan.rx * 0.38, -pan.ry * 0.5, 1, -pan.rx * 0.2, -pan.ry * 0.3, pan.rx * 0.72);
    topSheen.addColorStop(0, 'rgba(255, 224, 178, 0.16)');
    topSheen.addColorStop(0.55, 'rgba(255, 214, 160, 0.045)');
    topSheen.addColorStop(1, 'rgba(255, 214, 160, 0)');
    ctx.fillStyle = topSheen;
    ellipse(ctx, 0, pan.ry * 0.018, pan.rx * 0.87, pan.ry * 0.84);
    ctx.fill();

    // nonstick speckle
    ctx.save();
    for (let i = 0; i < 46; i++) {
      const a = i * 2.399;
      const rad = Math.sqrt((i + 1) / 47) * 0.78;
      const x = Math.cos(a) * rad * pan.rx * 0.8;
      const y = Math.sin(a) * rad * pan.ry * 0.77;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(255, 220, 174, 0.07)' : 'rgba(0, 0, 0, 0.16)';
      ctx.beginPath();
      ctx.arc(x, y, 0.8 + (i % 4) * 0.55, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    // warm centre when hot
    if (heat > 0.04) {
      const warm = ctx.createRadialGradient(0, 0, 0, 0, 0, pan.rx * 0.8);
      warm.addColorStop(0, `rgba(255, 133, 45, ${heat * 0.12})`);
      warm.addColorStop(0.65, `rgba(255, 105, 30, ${heat * 0.05})`);
      warm.addColorStop(1, 'rgba(255, 100, 20, 0)');
      ctx.fillStyle = warm;
      ellipse(ctx, 0, 0, pan.rx * 0.86, pan.ry * 0.83);
      ctx.fill();
    }

    // broad surface reflection
    const refl = ctx.createLinearGradient(-pan.rx * 0.6, -pan.ry * 0.7, pan.rx * 0.45, pan.ry * 0.55);
    refl.addColorStop(0, 'rgba(255, 248, 227, 0.08)');
    refl.addColorStop(0.45, 'rgba(255, 248, 227, 0.015)');
    refl.addColorStop(1, 'rgba(255, 248, 227, 0)');
    ctx.fillStyle = refl;
    ellipse(ctx, 0, 0, pan.rx * 0.85, pan.ry * 0.82);
    ctx.fill();
  }

  function drawOilSheen(t) {
    const oil = state.items.find((item) => item.type === 'oil');
    const soy = state.items.find((item) => item.type === 'soy');
    if (!oil && !soy) return;
    ctx.save();
    const heat = state.temp / 100;
    if (oil) {
      const g = ctx.createRadialGradient(-pan.rx * 0.1, -pan.ry * 0.08, 0, 0, 0, pan.rx * 0.76);
      g.addColorStop(0, 'rgba(255, 198, 88, 0.2)');
      g.addColorStop(0.62, 'rgba(226, 159, 55, 0.11)');
      g.addColorStop(1, 'rgba(210, 139, 42, 0)');
      ctx.fillStyle = g;
      ellipse(ctx, 0, pan.ry * 0.02, pan.rx * 0.79, pan.ry * 0.74);
      ctx.fill();

      const shimmer = 0.05 + heat * 0.1;
      ctx.strokeStyle = `rgba(255, 240, 190, ${shimmer})`;
      ctx.lineWidth = 1.3;
      for (let i = 0; i < 4; i++) {
        const yy = -pan.ry * 0.32 + i * pan.ry * 0.19 + Math.sin(t * 1.2 + i) * 2;
        ctx.beginPath();
        ctx.ellipse(0, yy, pan.rx * (0.25 + i * 0.1), pan.ry * (0.08 + i * 0.02), 0.08, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
      }
    }
    if (soy) {
      const g = ctx.createRadialGradient(pan.rx * 0.08, 0, 0, 0, 0, pan.rx * 0.7);
      g.addColorStop(0, 'rgba(58, 32, 18, 0.32)');
      g.addColorStop(0.7, 'rgba(44, 23, 13, 0.16)');
      g.addColorStop(1, 'rgba(35, 18, 10, 0)');
      ctx.fillStyle = g;
      ellipse(ctx, pan.rx * 0.04, pan.ry * 0.04, pan.rx * 0.64, pan.ry * 0.58);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawFood(t) {
    if (!state.items.length) return;

    const omeletteBase = state.recipe.id === 'omelette' && has(state, 'egg') && donenessOf(state, 'egg') > 0.06;
    const pastaBase = state.recipe.id === 'pasta' && has(state, 'pasta') && donenessOf(state, 'pasta') > 0.08;
    if (omeletteBase) drawOmeletteBase(t);
    if (pastaBase) drawPastaNest(t);
    drawStirFryBase(t);

    const list = [];
    for (const item of state.items) {
      if (omeletteBase && (item.type === 'egg' || item.type === 'cheese' || item.type === 'chive')) continue;
      if (pastaBase && item.type === 'pasta') continue;
      for (const piece of item.pieces) {
        list.push({ item, piece });
      }
    }
    list.sort((a, b) => a.piece.y - b.piece.y);

    for (const entry of list) {
      const p = entry.piece;
      const x = p.x * pan.rx * 0.9;
      const y = p.y * pan.ry * 0.8 + pan.ry * 0.015 - p.z * pan.ry * 0.2;
      drawFoodPiece(entry.item, p, x, y, t);
    }
  }

  function drawOmeletteBase(t) {
    const egg = itemOf(state, 'egg');
    if (!egg) return;
    const d = clamp(egg.doneness, 0, 1.4);
    const set = clamp(d / 1.05, 0, 1);
    const w = pan.rx * (1.1 + set * 0.22);
    const h = pan.ry * (0.7 + set * 0.16);
    const sway = state.tiltOn ? state.tilt.x * pan.rx * 0.1 : Math.sin(t * 0.8) * pan.rx * 0.012;
    const wobble = reducedMotion ? 0 : Math.sin(t * 1.7) * 0.012;

    ctx.save();
    ctx.translate(pan.rx * 0.02 + sway, pan.ry * 0.03 + (state.tiltOn ? state.tilt.y * pan.ry * 0.06 : 0));
    ctx.rotate(-0.05 + wobble);
    ctx.globalAlpha = 0.82 + set * 0.18;

    // the omelette body
    ctx.beginPath();
    const points = 38;
    for (let i = 0; i <= points; i++) {
      const a = (i / points) * TAU;
      const rad = 1 + Math.sin(a * 3 + 1.3) * 0.04 + Math.cos(a * 5 - 0.6) * 0.022;
      const px = Math.cos(a) * (w / 2) * rad;
      const py = Math.sin(a) * (h / 2) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    const g = ctx.createLinearGradient(-w * 0.4, -h * 0.5, w * 0.35, h * 0.55);
    g.addColorStop(0, mixHex('#ffefb3', '#ffd36b', set * 0.8));
    g.addColorStop(0.48, mixHex('#ffdd8a', '#f2b844', set * 0.8));
    g.addColorStop(1, mixHex('#f4c46a', '#d78a26', set * 0.75));
    ctx.save();
    ctx.shadowColor = 'rgba(140, 78, 20, 0.22)';
    ctx.shadowBlur = pan.rx * 0.035;
    ctx.shadowOffsetY = pan.rx * 0.012;
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();

    // browned edge as it sets
    if (d > 0.55) {
      ctx.strokeStyle = rgba('#9c561d', clamp((d - 0.55) * 1.2, 0, 0.7));
      ctx.lineWidth = Math.max(1.6, pan.rx * 0.011);
      ctx.stroke();
    }

    // folded-over flap
    if (set > 0.35) {
      ctx.save();
      ctx.globalAlpha = 0.94;
      ctx.beginPath();
      ctx.moveTo(w * 0.02, -h * 0.46);
      ctx.bezierCurveTo(w * 0.32, -h * 0.48, w * 0.53, -h * 0.26, w * 0.52, h * 0.02);
      ctx.bezierCurveTo(w * 0.5, h * 0.26, w * 0.28, h * 0.42, w * 0.02, h * 0.38);
      ctx.bezierCurveTo(w * 0.16, h * 0.2, w * 0.18, -h * 0.22, w * 0.02, -h * 0.46);
      ctx.closePath();
      const fold = ctx.createLinearGradient(-w * 0.02, -h * 0.4, w * 0.5, h * 0.35);
      fold.addColorStop(0, mixHex('#ffe8a4', '#f2c35c', set * 0.55));
      fold.addColorStop(0.55, mixHex('#f8d47e', '#e3a83e', set * 0.6));
      fold.addColorStop(1, mixHex('#f0c36a', '#cf8a28', set * 0.7));
      ctx.fillStyle = fold;
      ctx.fill();

      // curved crease along the fold
      ctx.strokeStyle = rgba('#a96322', 0.22 + set * 0.18);
      ctx.lineWidth = Math.max(1.2, pan.rx * 0.007);
      ctx.beginPath();
      ctx.moveTo(w * 0.03, -h * 0.45);
      ctx.bezierCurveTo(w * 0.15, -h * 0.24, w * 0.16, h * 0.2, w * 0.03, h * 0.37);
      ctx.stroke();

      // soft highlight along the top of the fold
      ctx.strokeStyle = 'rgba(255, 247, 210, 0.4)';
      ctx.lineWidth = Math.max(2, pan.rx * 0.012);
      ctx.beginPath();
      ctx.moveTo(w * 0.1, -h * 0.4);
      ctx.bezierCurveTo(w * 0.32, -h * 0.42, w * 0.48, -h * 0.22, w * 0.48, -h * 0.02);
      ctx.stroke();
      ctx.restore();
    }

    // bright fold highlight
    ctx.fillStyle = `rgba(255, 249, 219, ${0.24 + set * 0.22})`;
    ctx.beginPath();
    ctx.ellipse(-w * 0.16, -h * 0.2, w * 0.24, h * 0.12, -0.25, 0, TAU);
    ctx.fill();

    // tiny set bubbles
    ctx.fillStyle = `rgba(255, 241, 176, ${0.18 + set * 0.16})`;
    for (let i = 0; i < 10; i++) {
      const a = i * 2.2 + 0.6;
      const x = Math.cos(a) * w * (0.12 + (i % 3) * 0.07);
      const y = Math.sin(a) * h * (0.1 + (i % 2) * 0.08);
      ctx.beginPath();
      ctx.ellipse(x, y, pan.rx * 0.012, pan.rx * 0.007, a, 0, TAU);
      ctx.fill();
    }

    // browned spots
    if (d > 0.74) {
      ctx.fillStyle = rgba('#8c4b1a', clamp((d - 0.74) * 0.72, 0, 0.4));
      for (let i = 0; i < 9; i++) {
        const a = i * 2.3;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * w * 0.31, Math.sin(a) * h * 0.24, pan.rx * 0.034, pan.rx * 0.022, a, 0, TAU);
        ctx.fill();
      }
    }

    // cheese ooze
    if (has(state, 'cheese')) {
      const melt = clamp(donenessOf(state, 'cheese'), 0, 1);
      const cheeseColor = mixHex('#ffe08b', '#e9ae43', melt * 0.8);
      for (let i = 0; i < 3; i++) {
        const x = w * (0.12 + i * 0.13);
        const y = h * (0.17 + (i % 2) * 0.13);
        const rw = w * (0.045 + i * 0.008);
        const rh = h * 0.055;
        const cg = ctx.createLinearGradient(x, y - rh, x, y + rh * 2.4);
        cg.addColorStop(0, mixHex(cheeseColor, '#fff2bc', 0.35));
        cg.addColorStop(1, mixHex(cheeseColor, '#c9851f', 0.3));
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.ellipse(x, y, rw, rh, 0, 0, TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x - rw * 0.55, y + rh * 0.2);
        ctx.quadraticCurveTo(x - rw * 0.2, y + rh * 2.1, x + rw * 0.1, y + rh * 1.9);
        ctx.quadraticCurveTo(x + rw * 0.55, y + rh * 1.1, x + rw * 0.6, y + rh * 0.15);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 250, 215, 0.55)';
        ctx.beginPath();
        ctx.ellipse(x - rw * 0.2, y - rh * 0.3, rw * 0.32, rh * 0.22, -0.3, 0, TAU);
        ctx.fill();
      }
      // little shreds on the fold
      ctx.fillStyle = mixHex('#ffe9a8', '#f3c35d', melt * 0.65);
      for (let i = 0; i < 4; i++) {
        const x = w * (0.05 + i * 0.08);
        const y = -h * (0.02 + (i % 2) * 0.12);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(0.4 + i);
        roundRect(ctx, -w * 0.022, -h * 0.018, w * 0.044, h * 0.036, h * 0.012);
        ctx.fill();
        ctx.restore();
      }
    }

    // yolk peeking through when it is still soft and plain
    if (d < 0.62 && !has(state, 'cheese') && !has(state, 'chive')) {
      const yolkR = pan.rx * 0.14;
      const yg = ctx.createRadialGradient(-yolkR * 0.3, -yolkR * 0.3, 1, 0, 0, yolkR);
      yg.addColorStop(0, '#ffd463');
      yg.addColorStop(1, '#e8951d');
      ctx.fillStyle = yg;
      ctx.beginPath();
      ctx.ellipse(w * 0.02, -h * 0.04, yolkR, yolkR * 0.9, 0, 0, TAU);
      ctx.fill();
    }

    // chive flecks
    if (has(state, 'chive')) {
      ctx.strokeStyle = '#5f8a48';
      ctx.lineWidth = Math.max(1.2, pan.rx * 0.008);
      ctx.lineCap = 'round';
      for (let i = 0; i < 14; i++) {
        const a = i * 2.1 + 0.4;
        const x = Math.cos(a) * w * 0.27;
        const y = Math.sin(a) * h * 0.22;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + pan.rx * 0.026, y + pan.rx * 0.014);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  function drawPastaNest(t) {
    const pasta = itemOf(state, 'pasta');
    if (!pasta) return;
    const d = clamp(pasta.doneness, 0, 1.3);
    const set = clamp(d / 1.05, 0, 1);
    const w = pan.rx * 1.2;
    const h = pan.ry * 0.78;
    const sway = state.tiltOn ? state.tilt.x * pan.rx * 0.08 : Math.sin(t * 0.75) * pan.rx * 0.01;

    ctx.save();
    ctx.translate(pan.rx * 0.01 + sway, pan.ry * 0.04);

    // sauce pool
    if (has(state, 'tomato')) {
      const sauce = ctx.createRadialGradient(0, 0, 2, 0, 0, w * 0.55);
      sauce.addColorStop(0, 'rgba(181, 58, 39, 0.7)');
      sauce.addColorStop(0.7, 'rgba(156, 46, 31, 0.38)');
      sauce.addColorStop(1, 'rgba(156, 46, 31, 0)');
      ctx.fillStyle = sauce;
      ellipse(ctx, 0, 0, w * 0.5, h * 0.46);
      ctx.fill();
    }

    // nest of strands
    const strandColor = mixHex('#f0d17d', '#d9ad50', set * 0.7);
    ctx.lineCap = 'round';
    for (let i = 0; i < 17; i++) {
      const a = i * 2.399;
      const r = pan.rx * (0.04 + (i / 17) * 0.44);
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r * 0.45;
      const len = pan.rx * (0.22 + (i % 4) * 0.05);
      ctx.strokeStyle = i % 5 === 0 ? mixHex(strandColor, '#fff1b3', 0.35) : strandColor;
      ctx.lineWidth = Math.max(1.4, pan.rx * 0.012);
      ctx.beginPath();
      ctx.moveTo(x - len * 0.5, y + Math.sin(a) * pan.ry * 0.08);
      ctx.bezierCurveTo(
        x - len * 0.12, y - pan.ry * 0.16,
        x + len * 0.12, y + pan.ry * 0.16,
        x + len * 0.5, y - Math.sin(a) * pan.ry * 0.06
      );
      ctx.stroke();
    }

    // gloss
    ctx.fillStyle = 'rgba(255, 241, 186, 0.18)';
    ctx.beginPath();
    ctx.ellipse(-w * 0.08, -h * 0.12, w * 0.2, h * 0.08, -0.2, 0, TAU);
    ctx.fill();
    ctx.restore();
  }


  function drawStirFryBase(t) {
    if (state.recipe.id !== 'stirfry') return;
    const veg = ['onion', 'pepper', 'mushroom'].filter((type) => has(state, type));
    if (!veg.length) return;

    const soy = has(state, 'soy');
    const doneness = Math.max(...veg.map((type) => donenessOf(state, type)));
    const w = pan.rx * 1.18;
    const h = pan.ry * 0.8;

    ctx.save();

    // glossy oil-and-soy glaze under the vegetables
    const glaze = ctx.createRadialGradient(-w * 0.05, -h * 0.06, 2, 0, 0, w * 0.56);
    glaze.addColorStop(0, soy ? 'rgba(96, 58, 27, 0.36)' : 'rgba(233, 172, 74, 0.24)');
    glaze.addColorStop(0.62, soy ? 'rgba(78, 45, 22, 0.18)' : 'rgba(222, 155, 60, 0.13)');
    glaze.addColorStop(1, 'rgba(70, 39, 19, 0)');
    ctx.fillStyle = glaze;
    ellipse(ctx, 0, pan.ry * 0.03, w * 0.54, h * 0.5);
    ctx.fill();

    // warm sheen lines
    ctx.strokeStyle = `rgba(255, 221, 154, ${0.12 + doneness * 0.16})`;
    ctx.lineWidth = Math.max(1, pan.rx * 0.008);
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const yy = -h * 0.18 + i * h * 0.13 + Math.sin(t * 1.1 + i) * 1.5;
      ctx.beginPath();
      ctx.ellipse(0, yy, w * (0.13 + i * 0.05), h * (0.05 + i * 0.018), 0.08, Math.PI * 0.12, Math.PI * 0.88);
      ctx.stroke();
    }

    // toasted sesame flecks
    ctx.fillStyle = 'rgba(255, 239, 198, 0.55)';
    for (let i = 0; i < 8; i++) {
      const a = i * 2.4 + 0.7;
      const rr = 0.13 + (i % 4) * 0.09;
      ctx.beginPath();
      ctx.ellipse(
        Math.cos(a) * w * rr,
        Math.sin(a) * h * rr * 0.9,
        Math.max(1, pan.rx * 0.006),
        Math.max(0.6, pan.rx * 0.0035),
        a,
        0,
        TAU
      );
      ctx.fill();
    }

    ctx.restore();
  }

  function drawFoodPiece(item, piece, x, y, t) {
    const def = INGREDIENTS[item.type];
    const s = pan.rx * 0.125 * piece.r;
    const d = item.doneness;
    const color = cookedColor(def, d);

    ctx.save();
    ctx.translate(x, y);
    const spin = state.stirring ? Math.sin(t * 6 + piece.seed) * 0.12 : 0;
    ctx.rotate((def.kind === 'mushroom' ? piece.rot * 0.18 : piece.rot) + spin);

    // soft contact shadow
    if (def.kind !== 'oil' && def.kind !== 'soy' && def.kind !== 'butter') {
      ctx.save();
      ctx.translate(s * 0.16, s * 0.34 + piece.z * pan.ry * 0.03);
      ctx.scale(1, 0.55);
      ctx.fillStyle = 'rgba(22, 12, 6, 0.26)';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.9, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    switch (def.kind) {
      case 'egg': drawEgg(item, piece, s, t); break;
      case 'butter': drawButter(item, piece, s, t); break;
      case 'cheese': drawCheese(item, s, color); break;
      case 'chive': drawChive(item, s, color); break;
      case 'garlic': drawGarlic(item, s, color); break;
      case 'tomato': drawTomato(item, s, color); break;
      case 'pasta': drawPasta(item, s, color, piece); break;
      case 'basil': drawBasil(item, s, color); break;
      case 'onion': drawOnion(item, s, color); break;
      case 'pepper': drawPepper(item, s, color); break;
      case 'mushroom': drawMushroom(item, s, color); break;
      default: {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.7, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawEgg(item, piece, s, t) {
    const d = clamp(item.doneness, 0, 1.35);
    const set = clamp(d / 1.05, 0, 1);
    const w = s * 6.0 * (1 + Math.sin(t * 1.8 + piece.seed) * 0.015);
    const h = s * 4.2;
    ctx.save();
    ctx.rotate(piece.rot * 0.08);
    ctx.globalAlpha = 0.55 + set * 0.42;

    ctx.beginPath();
    const points = 16;
    for (let i = 0; i <= points; i++) {
      const a = (i / points) * TAU;
      const wob = 1 + Math.sin(a * 3 + piece.seed) * 0.075 + Math.cos(a * 5 - piece.seed) * 0.04;
      const px = Math.cos(a) * (w / 2) * wob;
      const py = Math.sin(a) * (h / 2) * wob;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    const white = mixHex('#fff8e8', '#fff1d0', set);
    ctx.fillStyle = white;
    ctx.fill();

    if (d > 0.86) {
      ctx.strokeStyle = rgba('#a86a2e', clamp((d - 0.86) * 0.9, 0, 0.55));
      ctx.lineWidth = Math.max(1, s * 0.08);
      ctx.stroke();
    }

    // yolk
    const yolkR = s * 0.62;
    const yg = ctx.createRadialGradient(-yolkR * 0.3, -yolkR * 0.35, 1, 0, 0, yolkR);
    yg.addColorStop(0, mixHex('#ffd567', '#f2b43e', set * 0.45));
    yg.addColorStop(0.72, mixHex('#f5aa2b', '#df8c1e', set * 0.4));
    yg.addColorStop(1, mixHex('#e8951d', '#c97717', set * 0.4));
    ctx.fillStyle = yg;
    ctx.beginPath();
    ctx.ellipse(w * 0.035, -h * 0.035, yolkR, yolkR * 0.9, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 242, 193, 0.75)';
    ctx.beginPath();
    ctx.ellipse(w * 0.01, -h * 0.09, yolkR * 0.2, yolkR * 0.14, -0.5, 0, TAU);
    ctx.fill();

    // little chive flecks if chives are in the pan
    if (has(state, 'chive')) {
      ctx.fillStyle = '#5f8a48';
      for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.translate(-w * 0.2 + i * w * 0.22, -h * 0.18 + (i % 2) * h * 0.28);
        ctx.rotate(0.6 + i);
        ctx.fillRect(-s * 0.15, -s * 0.03, s * 0.3, s * 0.06);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  function drawButter(item, piece, s, t) {
    const melt = clamp(item.doneness * 1.35, 0, 1);
    ctx.save();
    if (melt > 0.04) {
      const pg = ctx.createRadialGradient(0, 0, 1, 0, 0, s * 2.3);
      pg.addColorStop(0, `rgba(255, 206, 111, ${0.22 + melt * 0.2})`);
      pg.addColorStop(0.7, `rgba(244, 183, 74, ${0.1 + melt * 0.12})`);
      pg.addColorStop(1, 'rgba(244, 183, 74, 0)');
      ctx.fillStyle = pg;
      ellipse(ctx, 0, 0, s * 2.2, s * 1.55);
      ctx.fill();
    }
    const w = s * 1.5 * (1 - melt * 0.72);
    const h = s * 0.9 * (1 - melt * 0.62);
    if (w > 1 && h > 1) {
      const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
      g.addColorStop(0, mixHex('#ffe7a9', '#f5c35e', melt));
      g.addColorStop(1, mixHex('#f3cd72', '#dca140', melt));
      ctx.fillStyle = g;
      roundRect(ctx, -w / 2, -h / 2, w, h, s * 0.22);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 250, 220, 0.55)';
      roundRect(ctx, -w * 0.34, -h * 0.34, w * 0.42, h * 0.2, s * 0.08);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawCheese(item, s, color) {
    const melt = clamp(item.doneness, 0, 1.2);
    const w = s * (1.05 + melt * 0.55);
    const h = s * (0.8 + melt * 0.38);
    ctx.fillStyle = color;
    roundRect(ctx, -w / 2, -h / 2, w, h, s * (0.18 + melt * 0.16));
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 246, 207, 0.42)';
    roundRect(ctx, -w * 0.32, -h * 0.3, w * 0.5, h * 0.2, s * 0.08);
    ctx.fill();
    ctx.fillStyle = rgba('#b47b25', 0.4);
    ctx.beginPath();
    ctx.arc(w * 0.16, h * 0.12, s * 0.1, 0, TAU);
    ctx.fill();
  }

  function drawChive(item, s, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.4, s * 0.17);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-s * 0.66, 0);
    ctx.quadraticCurveTo(0, s * 0.25, s * 0.66, -s * 0.06);
    ctx.stroke();
    ctx.strokeStyle = rgba('#b8d29a', 0.35);
    ctx.lineWidth = Math.max(0.8, s * 0.05);
    ctx.beginPath();
    ctx.moveTo(-s * 0.48, -s * 0.02);
    ctx.quadraticCurveTo(0, s * 0.18, s * 0.48, -s * 0.04);
    ctx.stroke();
  }

  function drawGarlic(item, s, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.62, s * 0.5, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 250, 228, 0.55)';
    ctx.beginPath();
    ctx.ellipse(-s * 0.18, -s * 0.16, s * 0.25, s * 0.16, -0.4, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = rgba('#a8864f', 0.35);
    ctx.lineWidth = Math.max(0.7, s * 0.04);
    ctx.beginPath();
    ctx.moveTo(-s * 0.1, -s * 0.35);
    ctx.lineTo(-s * 0.05, s * 0.35);
    ctx.stroke();
  }

  function drawTomato(item, s, color) {
    const soft = clamp(item.doneness, 0, 1.2);
    ctx.save();
    ctx.rotate(-0.1);
    ctx.beginPath();
    ctx.moveTo(-s * 0.85, s * 0.25);
    ctx.quadraticCurveTo(-s * 0.95, -s * 0.55, 0, -s * 0.9);
    ctx.quadraticCurveTo(s * 0.95, -s * 0.55, s * 0.82, s * 0.25);
    ctx.quadraticCurveTo(0, s * 0.8, -s * 0.85, s * 0.25);
    ctx.closePath();
    const g = ctx.createLinearGradient(-s, -s, s, s);
    g.addColorStop(0, mixHex(color, '#ff7a5f', 0.18));
    g.addColorStop(1, mixHex(color, '#7d2118', 0.3));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.fillStyle = rgba('#ffb49e', 0.32 + soft * 0.12);
    ctx.beginPath();
    ctx.ellipse(-s * 0.22, -s * 0.28, s * 0.32, s * 0.18, -0.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgba('#f8d59a', 0.55);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(-s * 0.15 + i * s * 0.28, s * 0.1, s * 0.05, s * 0.08, 0.3, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPasta(item, s, color, piece) {
    ctx.save();
    ctx.rotate(piece.rot * 0.2);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.4, s * 0.16);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-s * 1.05, s * 0.2);
    ctx.quadraticCurveTo(-s * 0.4, -s * 0.65, 0, s * 0.05);
    ctx.quadraticCurveTo(s * 0.45, s * 0.55, s * 1.05, -s * 0.18);
    ctx.stroke();
    ctx.strokeStyle = rgba('#fff0b5', 0.3);
    ctx.lineWidth = Math.max(0.7, s * 0.05);
    ctx.beginPath();
    ctx.moveTo(-s * 0.85, s * 0.12);
    ctx.quadraticCurveTo(-s * 0.3, -s * 0.45, 0, s * 0.02);
    ctx.stroke();
    ctx.restore();
  }

  function drawBasil(item, s, color) {
    ctx.save();
    ctx.rotate(-0.25);
    const g = ctx.createLinearGradient(-s, -s, s, s);
    g.addColorStop(0, mixHex(color, '#87ad64', 0.25));
    g.addColorStop(1, mixHex(color, '#2f4c25', 0.2));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.85);
    ctx.quadraticCurveTo(s * 0.85, -s * 0.2, 0, s * 0.8);
    ctx.quadraticCurveTo(-s * 0.85, -s * 0.2, 0, -s * 0.85);
    ctx.fill();
    ctx.strokeStyle = rgba('#c5e0a7', 0.35);
    ctx.lineWidth = Math.max(0.7, s * 0.045);
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.65);
    ctx.lineTo(0, s * 0.6);
    ctx.stroke();
    ctx.restore();
  }

  function drawOnion(item, s, color) {
    const cooked = clamp(item.doneness, 0, 1.1);
    ctx.save();
    const ribbon = mixHex('#c98fa6', '#c9863e', cooked * 0.8);
    const edge = mixHex('#f0d6df', '#e9c27e', cooked * 0.7);
    ctx.lineCap = 'round';

    for (let i = 0; i < 2; i++) {
      ctx.save();
      ctx.rotate(-0.38 + i * 0.44);
      ctx.strokeStyle = ribbon;
      ctx.lineWidth = Math.max(1.8, s * (0.18 - i * 0.025));
      ctx.beginPath();
      ctx.moveTo(-s * 0.82, s * 0.16);
      ctx.quadraticCurveTo(-s * 0.1, -s * 0.55, s * 0.84, s * 0.02);
      ctx.stroke();
      ctx.strokeStyle = rgba(edge, 0.36);
      ctx.lineWidth = Math.max(0.8, s * 0.045);
      ctx.beginPath();
      ctx.moveTo(-s * 0.7, s * 0.1);
      ctx.quadraticCurveTo(-s * 0.05, -s * 0.44, s * 0.72, -s * 0.01);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawPepper(item, s, color) {
    ctx.save();
    const cooked = clamp(item.doneness, 0, 1.1);
    const w = s * 1.5;
    const h = s * 0.55;
    const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    g.addColorStop(0, mixHex(color, '#a7c27d', 0.18));
    g.addColorStop(0.5, color);
    g.addColorStop(1, mixHex(color, '#2f4a26', 0.24));
    ctx.fillStyle = g;
    roundRect(ctx, -w / 2, -h / 2, w, h, h * 0.42);
    ctx.fill();
    if (cooked > 0.55) {
      ctx.strokeStyle = rgba('#6b4b24', (cooked - 0.55) * 0.6);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(220, 241, 194, 0.35)';
    roundRect(ctx, -w * 0.36, -h * 0.22, w * 0.5, h * 0.18, h * 0.1);
    ctx.fill();
    ctx.restore();
  }

  function drawMushroom(item, s, color) {
    ctx.save();
    const cooked = clamp(item.doneness, 0, 1.15);
    const cap = mixHex(color, '#8a5a34', cooked * 0.45);

    // stem
    ctx.fillStyle = mixHex('#e7d4b3', '#c9ab80', cooked * 0.4);
    roundRect(ctx, -s * 0.18, -s * 0.02, s * 0.36, s * 0.52, s * 0.1);
    ctx.fill();

    // rounded cap
    ctx.fillStyle = cap;
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.06, s * 0.82, s * 0.6, 0, Math.PI, TAU);
    ctx.fill();
    ctx.strokeStyle = rgba('#f0d2a0', 0.28);
    ctx.lineWidth = Math.max(0.7, s * 0.045);
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.06, s * 0.82, s * 0.6, 0, Math.PI, TAU);
    ctx.stroke();

    // soft cap highlight
    ctx.fillStyle = 'rgba(255, 240, 210, 0.22)';
    ctx.beginPath();
    ctx.ellipse(-s * 0.24, -s * 0.32, s * 0.28, s * 0.12, -0.35, 0, TAU);
    ctx.fill();

    // gills peeking under the cap
    ctx.strokeStyle = rgba('#8f6b48', 0.32);
    ctx.lineWidth = Math.max(0.6, s * 0.03);
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * s * 0.16, -s * 0.08);
      ctx.lineTo(i * s * 0.12, s * 0.05);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* -------------------------------------------------------------------------- */
  /*                                 particles                                  */
  /* -------------------------------------------------------------------------- */

  function drawSizzle(t) {
    const heat = state.temp / 100;
    if (heat < 0.06) return;
    const count = Math.round(4 + heat * 12);
    ctx.save();
    for (let i = 0; i < count; i++) {
      const a = i * 2.399 + t * 0.12;
      const rad = Math.sqrt((i + 1) / count) * 0.7;
      const x = Math.cos(a) * rad * pan.rx * 0.76;
      const y = Math.sin(a) * rad * pan.ry * 0.7;
      const pulse = 0.5 + 0.5 * Math.sin(t * 6 + i * 1.7);
      const r = (0.8 + (i % 3) * 0.7) * (0.5 + pulse * 0.6);
      ctx.fillStyle = `rgba(255, 214, 138, ${heat * 0.3 * pulse})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
      ctx.fillStyle = `rgba(255, 246, 214, ${heat * 0.2 * (1 - pulse)})`;
      ctx.beginPath();
      ctx.arc(x - r * 0.2, y - r * 0.2, r * 0.35, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function spawnSteam() {
    const spread = pan.rx * 0.62;
    const x = pan.cx + (Math.random() - 0.5) * spread * 1.4;
    const y = pan.cy - pan.ry * 0.1 + (Math.random() - 0.5) * pan.ry * 0.8;
    particles.push({
      type: 'steam',
      x, y,
      vx: (Math.random() - 0.5) * 8,
      vy: -16 - Math.random() * 24,
      life: 0,
      max: 1.4 + Math.random() * 1.3,
      size: 8 + Math.random() * 15,
      seed: Math.random() * 100
    });
  }

  function spawnSpark() {
    const a = Math.random() * TAU;
    const rad = Math.sqrt(Math.random()) * 0.6;
    const x = pan.cx + Math.cos(a) * rad * pan.rx * 0.7;
    const y = pan.cy + Math.sin(a) * rad * pan.ry * 0.65;
    particles.push({
      type: 'spark',
      x, y,
      vx: (Math.random() - 0.5) * 34,
      vy: -28 - Math.random() * 50,
      life: 0,
      max: 0.35 + Math.random() * 0.45,
      size: 0.8 + Math.random() * 1.6,
      seed: Math.random() * 100
    });
  }

  function spawnRipple(x, y) {
    particles.push({
      type: 'ripple',
      x, y,
      vx: 0, vy: 0,
      life: 0,
      max: 0.55,
      size: 8 + Math.random() * 8,
      seed: Math.random() * 100
    });
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt;
      if (p.life >= p.max) {
        particles.splice(i, 1);
        continue;
      }
      if (p.type === 'steam') {
        p.x += (p.vx + Math.sin(p.life * 2 + p.seed) * 9) * dt;
        p.y += p.vy * dt;
        p.vy *= Math.exp(-0.35 * dt);
      } else if (p.type === 'spark') {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 120 * dt;
      }
    }
    if (particles.length > 140) particles.splice(0, particles.length - 140);
  }

  function drawParticles() {
    for (const p of particles) {
      const k = p.life / p.max;
      if (p.type === 'steam') {
        const alpha = Math.sin(k * Math.PI) * 0.2;
        const r = p.size * (1 + k * 1.8);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        g.addColorStop(0, `rgba(255, 252, 242, ${alpha})`);
        g.addColorStop(0.55, `rgba(255, 249, 235, ${alpha * 0.45})`);
        g.addColorStop(1, 'rgba(255, 249, 235, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, TAU);
        ctx.fill();
      } else if (p.type === 'spark') {
        const alpha = (1 - k) * 0.8;
        ctx.fillStyle = `rgba(255, 193, 91, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, TAU);
        ctx.fill();
        ctx.fillStyle = `rgba(255, 244, 203, ${alpha * 0.8})`;
        ctx.beginPath();
        ctx.arc(p.x - p.size * 0.25, p.y - p.size * 0.25, p.size * 0.35, 0, TAU);
        ctx.fill();
      } else if (p.type === 'ripple') {
        const alpha = (1 - k) * 0.24;
        ctx.strokeStyle = `rgba(255, 239, 198, ${alpha})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size + k * 28, 0, TAU);
        ctx.stroke();
      }
    }
  }

  function drawScene(t) {
    ctx.clearRect(0, 0, size.w, size.h);
    ctx.drawImage(bgCanvas, 0, 0, size.w, size.h);
    drawAmbient(t);
    drawBurner(t);
    drawPan(t);
    drawParticles();
  }

  /* -------------------------------------------------------------------------- */
  /*                                game state                                  */
  /* -------------------------------------------------------------------------- */

  function makePieces(def, target) {
    const count = def.pieces || 0;
    if (count < 1) return [];
    const pieces = [];
    const tx = target ? clamp(target.x, -0.55, 0.55) : 0;
    const ty = target ? clamp(target.y, -0.45, 0.45) : 0;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU;
      const rad = Math.sqrt(Math.random()) * (def.pieces > 4 ? 0.5 : 0.16);
      pieces.push({
        x: clamp(tx + Math.cos(a) * rad, -0.72, 0.72),
        y: clamp(ty + Math.sin(a) * rad * 0.8, -0.58, 0.58),
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        z: 0.35 + Math.random() * 0.65,
        vz: 1.2 + Math.random() * 1.8,
        rot: Math.random() * TAU,
        vr: (Math.random() - 0.5) * 1.4,
        r: 0.78 + Math.random() * 0.42,
        seed: Math.random() * 100
      });
    }
    return pieces;
  }

  function addIngredient(type, target) {
    if (state.serving || state.paused) return;
    const def = INGREDIENTS[type];
    if (!def) return;
    if (has(state, type)) {
      toast(`${def.name} is already in the pan.`);
      Sound.nope();
      return;
    }
    state.items.push({
      type,
      doneness: 0,
      pieces: makePieces(def, target)
    });
    state.selected = null;
    Sound.plop();
    vibrateTap();
    for (let i = 0; i < 6; i++) spawnSpark();
    spawnRipple(pan.cx + (target ? target.x * pan.rx * 0.6 : 0), pan.cy + (target ? target.y * pan.ry * 0.6 : 0));
    if (!state.recipe.ingredients.includes(type)) {
      toast(`${def.name} isn't in this recipe — it's yours now.`);
    }
    updatePantry();
    updateRecipeProgress();
    updateGuide(true);
    updateServeButton();
  }

  function clearPan(silent) {
    if (!state.items.length) {
      if (!silent) {
        toast('The pan is already clean.');
        Sound.nope();
      }
      return;
    }
    state.items = [];
    state.selected = null;
    state.stirQuality = 0.16;
    state.stirring = false;
    for (let i = 0; i < 18; i++) spawnSpark();
    Sound.swish();
    if (!silent) toast('Pan cleared. Start fresh.');
    updatePantry();
    updateRecipeProgress();
    updateGuide(true);
    updateServeButton();
  }

  function setHeat(value, silent) {
    const next = clamp(Math.round(value), 0, 100);
    if (next === state.heat) return;
    state.heat = next;
    updateHeatUI();
    if (!silent) updateGuide(true);
  }

  function updateHeatUI() {
    const pct = state.heat;
    els.heatFill.style.height = `${pct}%`;
    els.heatKnob.style.bottom = `${pct}%`;
    els.heatValue.textContent = String(pct);
    els.heatControl.setAttribute('aria-valuenow', String(pct));
  }

  function updateCoins() {
    els.coinValue.textContent = profile.coins.toLocaleString('en-US');
  }

  function updatePantry() {
    const wanted = new Set(state.recipe.ingredients);
    els.pantryList.querySelectorAll('.ing-chip').forEach((chip) => {
      const type = chip.dataset.ing;
      const added = has(state, type);
      const selected = state.selected === type;
      chip.classList.toggle('is-added', added);
      chip.classList.toggle('is-selected', selected);
      chip.classList.toggle('is-wanted', wanted.has(type) && !added);
      chip.setAttribute('aria-pressed', selected ? 'true' : 'false');
      chip.setAttribute('aria-disabled', added ? 'true' : 'false');
    });
    const total = state.recipe.ingredients.length;
    const done = state.recipe.ingredients.filter((type) => has(state, type)).length;
    els.recipePillCount.textContent = `${done}/${total}`;
    if (done >= total) {
      els.pantryHint.textContent = 'all in — stir, taste, and serve';
    } else if (state.selected) {
      els.pantryHint.textContent = `tap the pan to add ${INGREDIENTS[state.selected].name.toLowerCase()}`;
    } else {
      els.pantryHint.textContent = 'tap an ingredient, then the pan';
    }
  }

  function renderPantry() {
    els.pantryList.innerHTML = Object.keys(INGREDIENTS).map((type) => {
      const def = INGREDIENTS[type];
      return `<button class="ing-chip" type="button" data-ing="${type}" aria-pressed="false" aria-label="Pick ${def.name}">
        <span class="ing-icon">${iconSVG(type)}</span>
        <span class="ing-name">${def.name}</span>
      </button>`;
    }).join('');
  }

  function buildRecipeHTML() {
    const recipe = state.recipe;
    const order = String(profile.served + 1).padStart(2, '0');
    const ingHTML = recipe.ingredients.map((type) => `
      <div class="recipe-ing" data-ing="${type}">
        <span class="mini-icon">${iconSVG(type)}</span>
        <span>${INGREDIENTS[type].name}</span>
      </div>`).join('');
    const stepsHTML = recipe.steps.map((step, i) => `<li data-step="${i}">${step.label}</li>`).join('');
    return `
      <div class="recipe-card-top">
        <span class="kicker">Order ${order}</span>
        <span class="no-rush"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M8 4.7V8l2.2 1.4" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg> no timer</span>
      </div>
      <h1>${recipe.name}</h1>
      <p class="recipe-desc">${recipe.desc}</p>
      <div class="recipe-divider"><span></span></div>
      <div class="ingredient-list">${ingHTML}</div>
      <ol class="step-list">${stepsHTML}</ol>
      <p class="recipe-tip">${recipe.tip}</p>`;
  }

  function renderRecipe() {
    const recipe = state.recipe;
    els.recipeCard.innerHTML = buildRecipeHTML();
    els.sheetContent.innerHTML = `<div class="recipe-card">${buildRecipeHTML()}</div>`;
    els.recipePillName.textContent = recipe.name;
    els.recipePillDot.style.background = recipe.accent;
    els.recipePillDot.style.boxShadow = `0 0 0 4px ${rgba(recipe.accent, 0.14)}`;
    updateRecipeProgress();
    updatePantry();
  }

  function updateRecipeProgress() {
    if (!state.recipe) return;
    const doneSteps = state.recipe.steps.map((step) => {
      try { return !!step.done(state); } catch (err) { return false; }
    });
    const current = doneSteps.indexOf(false);
    document.querySelectorAll('.recipe-card').forEach((card) => {
      card.querySelectorAll('.recipe-ing').forEach((node) => {
        node.classList.toggle('is-done', has(state, node.dataset.ing));
      });
      card.querySelectorAll('.step-list li').forEach((li, i) => {
        li.classList.toggle('is-done', doneSteps[i]);
        li.classList.toggle('is-current', i === current);
      });
    });
  }

  function updateGuide(force) {
    const now = performance.now();
    if (!force && now - state.lastGuide < 220) return;
    state.lastGuide = now;

    const recipe = state.recipe;
    const missing = recipe.ingredients.filter((type) => !has(state, type));
    const extras = state.items.filter((item) => !recipe.ingredients.includes(item.type));
    const avg = averageDoneness(state);
    const burned = state.items.some((item) => item.doneness > 1.12 && recipe.ingredients.includes(item.type));
    let hint = '';

    if (state.serving) {
      hint = 'Plating it up…';
    } else if (state.selected) {
      hint = `Tap the pan to add the ${INGREDIENTS[state.selected].name.toLowerCase()}.`;
    } else if (!state.items.length && state.temp < 26) {
      hint = 'Give the pan a little heat, then pick an ingredient.';
    } else if (missing.length) {
      const next = missing[0];
      hint = `Next up: ${INGREDIENTS[next].name.toLowerCase()}.`;
    } else if (extras.length) {
      hint = `${INGREDIENTS[extras[0].type].name} wasn't asked for — clear the pan or cook on.`;
    } else if (avg < 0.42) {
      hint = 'Let it sizzle. No rush — colour is your timer.';
    } else if (burned) {
      hint = 'A little crispy — ease off the heat and serve when you like.';
    } else if (state.stirQuality < 0.46) {
      hint = 'Give it a good stir so everything cooks evenly.';
    } else if (avg < 0.72) {
      hint = 'Nearly there. Keep it moving for another moment.';
    } else {
      hint = 'Looks lovely. Tap Serve when you are ready.';
    }

    if (hint !== state.lastHint) {
      state.lastHint = hint;
      els.hintText.textContent = hint;
      els.hintPill.classList.toggle('is-warm', !state.serving && (missing.length > 0 || avg < 0.42 || state.stirQuality < 0.46));
    }

    els.panCalloutText.textContent = state.selected ? `tap the pan to add ${INGREDIENTS[state.selected].name.toLowerCase()}` : '';
    els.panCallout.classList.toggle('is-on', !!state.selected && !state.serving);
    positionCallout();

    updateRecipeProgress();
    updateServeButton();
  }

  function updateServeButton() {
    const ready = state.recipe && allRequired(state) && !state.serving;
    els.serveBtn.disabled = !ready;
    els.serveBtn.classList.toggle('is-ready', !!ready);
  }

  function positionCallout() {
    if (!pan.rx) return;
    els.panCallout.style.left = `${pan.cx + pan.rx * 0.1}px`;
    els.panCallout.style.top = `${pan.cy + pan.ry * 1.02 + 14}px`;
  }

  function selectIngredient(type) {
    if (state.serving || state.paused) return;
    if (has(state, type)) {
      toast(`${INGREDIENTS[type].name} is already in the pan.`);
      Sound.nope();
      return;
    }
    state.selected = state.selected === type ? null : type;
    Sound.tap();
    updatePantry();
    updateGuide(true);
  }

  function serveDish() {
    if (state.serving || !allRequired(state)) {
      toast('Add every ingredient before serving.');
      Sound.nope();
      return;
    }
    state.serving = true;
    state.serveShown = false;
    state.serveStarted = performance.now();
    state.stirring = false;
    state.selected = null;
    els.stirBtn.classList.remove('is-stirring');
    Sound.chime();
    buzz([12, 40, 20]);
    for (let i = 0; i < 30; i++) spawnSpark();
    updateGuide(true);
    updatePantry();
    updateServeButton();
  }

  /* -------------------------------------------------------------------------- */
  /*                                  update                                    */
  /* -------------------------------------------------------------------------- */

  function saveProfile() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); } catch (err) { /* no-op */ }
  }

  function update(dt) {
    const now = performance.now();
    state.temp = lerp(state.temp, state.heat, 1 - Math.exp(-1.7 * dt));

    const tiltX = state.tiltOn ? state.tilt.x : (reducedMotion ? 0 : Math.sin(now * 0.00055) * 0.1);
    const tiltY = state.tiltOn ? state.tilt.y : (reducedMotion ? 0 : Math.cos(now * 0.00042) * 0.07);
    const stirring = state.stirring || state.stirImpulse > 0.035;

    if (stirring) {
      state.stirQuality = Math.min(1, state.stirQuality + 0.44 * dt);
      state.rippleAcc += dt;
      if (state.rippleAcc > 0.11) {
        state.rippleAcc = 0;
        spawnRipple(pan.cx + (Math.random() - 0.5) * pan.rx * 0.8, pan.cy + (Math.random() - 0.5) * pan.ry * 0.7);
      }
    } else if (state.temp > 74) {
      state.stirQuality = Math.max(0.05, state.stirQuality - 0.022 * dt);
    }
    state.stirImpulse *= Math.exp(-5 * dt);

    const cooking = state.temp > 8;
    const rate = 0.006 + 0.082 * Math.pow(clamp(state.temp / 100, 0, 1), 1.25);

    for (const item of state.items) {
      if (cooking) item.doneness = Math.min(1.65, item.doneness + rate * dt);
      for (const p of item.pieces) {
        const swirl = stirring ? 4.3 : 0;
        p.vx += (-p.x * 1.3 - tiltX * 1.55 - p.y * swirl) * dt;
        p.vy += (-p.y * 1.45 - tiltY * 1.15 + p.x * swirl) * dt;
        const damp = Math.exp(-2.35 * dt);
        p.vx *= damp;
        p.vy *= damp;
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        const nx = p.x / 0.76;
        const ny = p.y / 0.62;
        const dist = Math.sqrt(nx * nx + ny * ny);
        if (dist > 1) {
          p.x = (nx / dist) * 0.76;
          p.y = (ny / dist) * 0.62;
          p.vx *= -0.34;
          p.vy *= -0.34;
        }

        p.vz -= 13 * dt;
        p.z += p.vz * dt;
        if (p.z <= 0) {
          p.z = 0;
          p.vz *= -0.38;
          if (Math.abs(p.vz) < 0.35) p.vz = 0;
        }
        p.rot += p.vr * dt;
      }
    }

    // steam and sizzle
    if (state.items.length) {
      state.steamAcc += dt * (0.4 + (state.temp / 100) * 6.5) * Math.min(1, state.items.length / 2.5);
      while (state.steamAcc > 1) {
        state.steamAcc -= 1;
        spawnSteam();
      }
      state.sparkAcc += dt * (state.temp / 100) * 16;
      while (state.sparkAcc > 1) {
        state.sparkAcc -= 1;
        spawnSpark();
      }
    }

    updateParticles(dt);

    if (state.serving && !state.serveShown && now - state.serveStarted > 860) {
      state.serveShown = true;
      showServeModal();
    }

    if (now - state.audioTick > 140) {
      state.audioTick = now;
      const level = state.items.length ? clamp((state.temp / 100) * (0.35 + 0.65 * Math.min(1, state.items.length / 4)), 0, 1) : 0;
      Sound.updateSizzle(level);
    }

    if (now - state.lastGuide > 220) updateGuide(false);
    updateTiltBubble();
  }

  function updateTiltBubble() {
    if (!state.tiltOn) return;
    els.tiltBubble.style.transform = `translate(${state.tilt.x * 5}px, ${state.tilt.y * 5}px)`;
  }

  /* -------------------------------------------------------------------------- */
  /*                                  serving                                   */
  /* -------------------------------------------------------------------------- */

  function scoreDish() {
    const recipe = state.recipe;
    const req = recipe.ingredients;
    const extras = state.items.filter((item) => !req.includes(item.type));
    const donenesses = req.map((type) => donenessScore(donenessOf(state, type)));
    const donenessAvg = donenesses.reduce((a, b) => a + b, 0) / Math.max(1, donenesses.length);
    const completeness = req.filter((type) => has(state, type)).length / Math.max(1, req.length);
    const technique = 0.2 + state.stirQuality * 0.8;
    let overall = 0.46 * completeness + 0.36 * donenessAvg + 0.18 * technique - extras.length * 0.12;
    overall = clamp(overall, 0, 1);
    const stars = overall >= 0.9 ? 3 : overall >= 0.72 ? 2 : overall >= 0.48 ? 1 : 0;
    const coins = Math.round(recipe.price * (0.5 + 0.8 * overall));
    const burned = state.items.some((item) => req.includes(item.type) && item.doneness > 1.12);

    let verdict = recipe.verdict;
    if (stars === 2) verdict = 'A really good plate. A little more care and it sings.';
    else if (stars === 1) verdict = 'Cozy, edible, and yours. Keep playing with the heat.';
    else if (stars === 0) verdict = 'A brave first attempt. The pan is still warm.';

    let tip = 'Beautifully even. Try the next recipe when you are ready.';
    if (extras.length) tip = `You slipped in ${INGREDIENTS[extras[0].type].name.toLowerCase()}. It still counts as yours — clear the pan before the next order for a cleaner score.`;
    else if (burned) tip = 'A touch crispy. Try a lower heat and stir a little sooner next time.';
    else if (donenessAvg < 0.64) tip = 'A little longer in the pan would help everything come together.';
    else if (state.stirQuality < 0.45) tip = 'Give it a few more stirs for a more even cook.';
    else if (state.stirQuality < 0.8) tip = 'Lovely work. A longer, slower stir would make it even silkier.';

    return {
      stars,
      coins,
      verdict,
      tip,
      overall,
      bars: [
        { label: 'Ingredients', value: Math.round(completeness * 100) },
        { label: 'Doneness', value: Math.round(donenessAvg * 100) },
        { label: 'Technique', value: Math.round(technique * 100) }
      ]
    };
  }

  function showServeModal() {
    state.paused = true;
    const score = scoreDish();
    state.lastScore = score;
    profile.coins += score.coins;
    profile.served += 1;
    saveProfile();
    updateCoins();

    els.serveTitle.textContent = state.recipe.name;
    els.serveVerdict.textContent = score.verdict;
    els.starRow.innerHTML = [0, 1, 2].map((i) => starSVG(i < score.stars)).join('');
    els.serveTip.textContent = score.tip;
    els.serveCoins.textContent = `+${score.coins}`;
    els.scoreBars.innerHTML = score.bars.map((bar) => `
      <div class="score-bar">
        <span>${bar.label}</span>
        <span class="score-bar-track"><span class="score-bar-fill" data-value="${bar.value}"></span></span>
        <b>${bar.value}%</b>
      </div>`).join('');

    drawDishPreview();

    els.serveModal.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => {
      els.scoreBars.querySelectorAll('.score-bar-fill').forEach((node) => {
        node.style.width = `${node.dataset.value}%`;
      });
    });
    setTimeout(() => {
      try { els.serveNext.focus({ preventScroll: true }); } catch (err) { /* no-op */ }
    }, 220);
  }

  function beginRecipe(index) {
    state.recipeIndex = ((index % RECIPES.length) + RECIPES.length) % RECIPES.length;
    state.recipe = RECIPES[state.recipeIndex];
    profile.recipeIndex = state.recipeIndex;
    saveProfile();
    state.items = [];
    state.selected = null;
    state.stirQuality = 0.16;
    state.stirImpulse = 0;
    state.stirring = false;
    state.heat = 55;
    state.temp = 20;
    state.serving = false;
    state.serveShown = false;
    state.lastHint = '';
    particles.length = 0;
    els.stirBtn.classList.remove('is-stirring');
    renderRecipe();
    updateHeatUI();
    updateGuide(true);
    updateServeButton();
    updateCoins();
    state.paused = false;
  }

  function hideServeModal() {
    els.serveModal.setAttribute('aria-hidden', 'true');
  }

  function drawDishPreview() {
    const c = els.dishCanvas;
    const dpr = 2;
    c.width = 420 * dpr;
    c.height = 280 * dpr;
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, 420, 280);

    const cx = 210;
    const cy = 168;

    // plate shadow
    g.save();
    g.translate(6, 12);
    g.scale(1, 0.44);
    const sh = g.createRadialGradient(cx, cy, 20, cx, cy, 150);
    sh.addColorStop(0, 'rgba(47, 28, 14, 0.28)');
    sh.addColorStop(1, 'rgba(47, 28, 14, 0)');
    g.fillStyle = sh;
    g.beginPath();
    g.arc(cx, cy, 150, 0, TAU);
    g.fill();
    g.restore();

    // plate
    const plate = g.createRadialGradient(cx - 40, cy - 34, 10, cx, cy, 150);
    plate.addColorStop(0, '#fffdf7');
    plate.addColorStop(0.7, '#f6eddc');
    plate.addColorStop(1, '#dfcfb6');
    g.fillStyle = plate;
    g.beginPath();
    g.ellipse(cx, cy, 144, 68, 0, 0, TAU);
    g.fill();
    g.strokeStyle = 'rgba(150, 119, 82, 0.24)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.ellipse(cx, cy, 144, 68, 0, 0, TAU);
    g.stroke();
    g.strokeStyle = 'rgba(176, 146, 108, 0.3)';
    g.beginPath();
    g.ellipse(cx, cy, 110, 51, 0, 0, TAU);
    g.stroke();

    if (state.recipe.id === 'omelette') drawPreviewOmelette(g, cx, cy);
    else if (state.recipe.id === 'pasta') drawPreviewPasta(g, cx, cy);
    else drawPreviewStirfry(g, cx, cy);

    // steam
    g.save();
    g.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    g.lineWidth = 3;
    g.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const x = cx - 34 + i * 34;
      g.beginPath();
      g.moveTo(x, cy - 28);
      g.bezierCurveTo(x - 10, cy - 48, x + 12, cy - 60, x + 2, cy - 82);
      g.stroke();
    }
    g.restore();
  }

  function drawPreviewOmelette(g, cx, cy) {
    g.save();
    g.translate(cx, cy - 2);
    const grad = g.createLinearGradient(-90, -30, 90, 35);
    grad.addColorStop(0, '#ffd978');
    grad.addColorStop(0.55, '#f3b94d');
    grad.addColorStop(1, '#d98f2e');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(-92, 8);
    g.quadraticCurveTo(-84, -52, -6, -50);
    g.quadraticCurveTo(76, -50, 92, 4);
    g.quadraticCurveTo(52, 42, -30, 40);
    g.quadraticCurveTo(-76, 38, -92, 8);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(160, 98, 25, 0.35)';
    g.lineWidth = 2;
    g.stroke();
    g.fillStyle = 'rgba(255, 243, 197, 0.55)';
    g.beginPath();
    g.ellipse(-34, -22, 31, 11, -0.2, 0, TAU);
    g.fill();
    // cheese ooze
    g.fillStyle = '#f7d572';
    g.beginPath();
    g.moveTo(28, 28);
    g.quadraticCurveTo(42, 38, 50, 29);
    g.quadraticCurveTo(58, 42, 68, 28);
    g.quadraticCurveTo(52, 23, 28, 28);
    g.fill();
    // chive flecks
    g.strokeStyle = '#5f8a48';
    g.lineWidth = 2.5;
    g.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const x = -52 + i * 18;
      const y = -20 + Math.sin(i * 2.1) * 18;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + 9, y + 5);
      g.stroke();
    }
    g.restore();
  }

  function drawPreviewPasta(g, cx, cy) {
    g.save();
    g.translate(cx, cy - 2);
    const sauce = g.createRadialGradient(0, 0, 6, 0, 0, 82);
    sauce.addColorStop(0, 'rgba(185, 64, 44, 0.9)');
    sauce.addColorStop(1, 'rgba(150, 48, 33, 0.5)');
    g.fillStyle = sauce;
    g.beginPath();
    g.ellipse(0, 4, 78, 38, 0, 0, TAU);
    g.fill();
    g.strokeStyle = '#e8c56a';
    g.lineWidth = 4.5;
    g.lineCap = 'round';
    for (let i = 0; i < 13; i++) {
      const a = i * 2.399;
      const r = 6 + (i / 13) * 50;
      g.beginPath();
      g.moveTo(Math.cos(a) * r - 18, Math.sin(a) * r * 0.44 - 6);
      g.bezierCurveTo(
        Math.cos(a) * r + 2, Math.sin(a) * r * 0.44 - 22,
        Math.cos(a) * r + 26, Math.sin(a) * r * 0.44 + 10,
        Math.cos(a) * r + 46, Math.sin(a) * r * 0.44 - 2
      );
      g.stroke();
    }
    g.fillStyle = '#d94b38';
    for (let i = 0; i < 5; i++) {
      const a = i * 1.9 + 0.4;
      g.save();
      g.translate(Math.cos(a) * 42, Math.sin(a) * 20);
      g.rotate(a);
      g.beginPath();
      g.ellipse(0, 0, 10, 5.5, 0, 0, TAU);
      g.fill();
      g.restore();
    }
    g.fillStyle = '#4f7d3f';
    for (let i = 0; i < 4; i++) {
      const a = i * 2.4 + 0.9;
      g.save();
      g.translate(Math.cos(a) * 48, Math.sin(a) * 22 - 6);
      g.rotate(a);
      g.beginPath();
      g.moveTo(0, -10);
      g.quadraticCurveTo(9, 0, 0, 10);
      g.quadraticCurveTo(-9, 0, 0, -10);
      g.fill();
      g.restore();
    }
    g.restore();
  }

  function drawPreviewStirfry(g, cx, cy) {
    g.save();
    g.translate(cx, cy - 2);
    g.fillStyle = 'rgba(77, 44, 24, 0.2)';
    g.beginPath();
    g.ellipse(0, 20, 72, 24, 0, 0, TAU);
    g.fill();
    const colors = ['#6b9a4f', '#c98fa6', '#c9a57a', '#5e8b4b', '#b98a5c', '#7ba55b'];
    for (let i = 0; i < 22; i++) {
      const a = i * 2.399;
      const r = Math.sqrt((i + 1) / 22) * 58;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r * 0.44 - 2;
      g.save();
      g.translate(x, y);
      g.rotate(a);
      g.fillStyle = colors[i % colors.length];
      if (i % 3 === 0) {
        g.beginPath();
        g.ellipse(0, 0, 13, 5, 0, 0, TAU);
        g.fill();
      } else if (i % 3 === 1) {
        g.strokeStyle = colors[i % colors.length];
        g.lineWidth = 3.2;
        g.beginPath();
        g.arc(0, 0, 8, 0, Math.PI * 1.7);
        g.stroke();
      } else {
        g.beginPath();
        g.ellipse(0, 0, 9, 6, 0, Math.PI, TAU);
        g.fill();
      }
      g.restore();
    }
    g.fillStyle = 'rgba(62, 37, 19, 0.32)';
    g.beginPath();
    g.ellipse(10, 8, 50, 20, 0.2, 0, TAU);
    g.fill();
    g.fillStyle = '#f2e3c2';
    for (let i = 0; i < 8; i++) {
      g.beginPath();
      g.arc(-40 + i * 12, -18 + Math.sin(i) * 12, 1.4, 0, TAU);
      g.fill();
    }
    g.restore();
  }

  /* -------------------------------------------------------------------------- */
  /*                                 interactions                               */
  /* -------------------------------------------------------------------------- */

  function pointInPan(clientX, clientY, pad) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const dx = (x - pan.cx) / pan.rx;
    const dy = (y - pan.cy) / pan.ry;
    return dx * dx + dy * dy <= (pad || 1.15) * (pad || 1.15);
  }

  function panTarget(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: clamp(((clientX - rect.left) - pan.cx) / pan.rx * 0.58, -0.6, 0.6),
      y: clamp(((clientY - rect.top) - pan.cy) / pan.ry * 0.52, -0.5, 0.5)
    };
  }

  function refreshPause() {
    const welcomeOpen = els.welcome.getAttribute('aria-hidden') !== 'true';
    const serveOpen = els.serveModal.getAttribute('aria-hidden') !== 'true';
    const sheetOpen = els.recipeSheet.classList.contains('is-on');
    state.paused = welcomeOpen || serveOpen || sheetOpen;
  }

  function openSheet() {
    els.recipeSheet.classList.add('is-on');
    els.sheetBackdrop.classList.add('is-on');
    els.recipeSheet.setAttribute('aria-hidden', 'false');
    refreshPause();
  }

  function closeSheet() {
    els.recipeSheet.classList.remove('is-on');
    els.sheetBackdrop.classList.remove('is-on');
    els.recipeSheet.setAttribute('aria-hidden', 'true');
    refreshPause();
  }

  function showWelcome(help) {
    els.welcomeKicker.textContent = help ? 'How to play' : 'A cozy cooking simulator';
    els.welcomeStart.querySelector('span').textContent = help ? 'Back to the kitchen' : 'Open the kitchen';
    els.welcomeFoot.textContent = help ? 'No timers. Your pan waits.' : 'Touch-first · phone & tablet · sound on for sizzle';
    els.welcome.setAttribute('aria-hidden', 'false');
    refreshPause();
  }

  function hideWelcome() {
    els.welcome.setAttribute('aria-hidden', 'true');
    refreshPause();
    Sound.init();
    Sound.tap();
  }

  function toggleSound() {
    profile.sound = !profile.sound;
    Sound.init();
    Sound.setMuted(!profile.sound);
    els.soundBtn.setAttribute('aria-pressed', profile.sound ? 'true' : 'false');
    saveProfile();
    if (profile.sound) Sound.tap();
    toast(profile.sound ? 'Sound on. Listen for the sizzle.' : 'Sound off. The sizzle is in your head.');
  }

  /* --------------------------------- heat ---------------------------------- */

  let heatDrag = false;

  function heatFromEvent(e) {
    const rect = els.heatTrack.getBoundingClientRect();
    const pct = 1 - clamp((e.clientY - rect.top) / rect.height, 0, 1);
    setHeat(pct * 100);
  }

  els.heatControl.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    heatDrag = true;
    Sound.init();
    try { els.heatControl.setPointerCapture(e.pointerId); } catch (err) { /* no-op */ }
    heatFromEvent(e);
    e.preventDefault();
  });

  els.heatControl.addEventListener('pointermove', (e) => {
    if (!heatDrag) return;
    heatFromEvent(e);
    e.preventDefault();
  });

  function endHeatDrag() { heatDrag = false; }
  els.heatControl.addEventListener('pointerup', endHeatDrag);
  els.heatControl.addEventListener('pointercancel', endHeatDrag);
  els.heatControl.addEventListener('lostpointercapture', endHeatDrag);

  /* -------------------------------- pantry --------------------------------- */

  let chipDrag = null;
  let suppressChipClick = false;

  function removeGhost() {
    if (chipDrag && chipDrag.ghost) chipDrag.ghost.remove();
    if (chipDrag && chipDrag.chip) chipDrag.chip.classList.remove('is-dragging');
  }

  function startGhost(e) {
    if (!chipDrag) return;
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.innerHTML = `${iconSVG(chipDrag.type)}<span>${INGREDIENTS[chipDrag.type].name}</span>`;
    document.body.appendChild(ghost);
    chipDrag.ghost = ghost;
    chipDrag.dragging = true;
    chipDrag.chip.classList.add('is-dragging');
    Sound.tap();
    moveGhost(e.clientX, e.clientY);
  }

  function moveGhost(x, y) {
    if (!chipDrag || !chipDrag.ghost) return;
    chipDrag.ghost.style.left = `${x}px`;
    chipDrag.ghost.style.top = `${y}px`;
    const over = pointInPan(x, y, 1.16);
    chipDrag.ghost.classList.toggle('is-over', over);
  }

  els.pantryList.addEventListener('pointerdown', (e) => {
    const chip = e.target.closest('.ing-chip');
    if (!chip) return;
    if (e.button !== undefined && e.button !== 0) return;
    if (state.serving) return;
    chipDrag = {
      chip,
      type: chip.dataset.ing,
      startX: e.clientX,
      startY: e.clientY,
      pointerId: e.pointerId,
      dragging: false,
      ghost: null
    };
    Sound.init();
  });

  window.addEventListener('pointermove', (e) => {
    if (!chipDrag || e.pointerId !== chipDrag.pointerId) return;
    const dx = e.clientX - chipDrag.startX;
    const dy = e.clientY - chipDrag.startY;
    if (!chipDrag.dragging) {
      if (Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy) * 1.15) {
        // let the pantry scroll sideways
        removeGhost();
        chipDrag = null;
        return;
      }
      if ((dy < -10 && Math.abs(dy) > Math.abs(dx) * 0.55) || Math.hypot(dx, dy) > 30) {
        startGhost(e);
      }
    }
    if (chipDrag && chipDrag.dragging) {
      moveGhost(e.clientX, e.clientY);
      if (e.cancelable) e.preventDefault();
    }
  }, { passive: false });

  window.addEventListener('pointerup', (e) => {
    if (!chipDrag || e.pointerId !== chipDrag.pointerId) return;
    const drag = chipDrag;
    if (drag.dragging) {
      const over = pointInPan(e.clientX, e.clientY, 1.18);
      removeGhost();
      chipDrag = null;
      suppressChipClick = true;
      setTimeout(() => { suppressChipClick = false; }, 350);
      if (over) {
        addIngredient(drag.type, panTarget(e.clientX, e.clientY));
      } else {
        toast('Drop it in the pan to cook.');
      }
    } else {
      chipDrag = null;
    }
  });

  window.addEventListener('pointercancel', () => {
    if (chipDrag) {
      removeGhost();
      chipDrag = null;
    }
  });

  els.pantryList.addEventListener('click', (e) => {
    const chip = e.target.closest('.ing-chip');
    if (!chip) return;
    if (suppressChipClick) {
      suppressChipClick = false;
      return;
    }
    selectIngredient(chip.dataset.ing);
  });

  /* -------------------------------- canvas --------------------------------- */

  canvas.addEventListener('pointerdown', (e) => {
    if (state.paused || state.serving) return;
    if (!pointInPan(e.clientX, e.clientY, 1.18)) return;
    Sound.init();
    if (e.cancelable) e.preventDefault();
    if (state.selected) {
      addIngredient(state.selected, panTarget(e.clientX, e.clientY));
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    state.pointerStir = {
      id: e.pointerId,
      last: Math.atan2(y - pan.cy, x - pan.cx),
      moved: 0,
      startX: x,
      startY: y
    };
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* no-op */ }
  });

  canvas.addEventListener('pointermove', (e) => {
    const ps = state.pointerStir;
    if (!ps || ps.id !== e.pointerId) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const angle = Math.atan2(y - pan.cy, x - pan.cx);
    let delta = angle - ps.last;
    while (delta > Math.PI) delta -= TAU;
    while (delta < -Math.PI) delta += TAU;
    ps.last = angle;
    ps.moved += Math.abs(delta) + Math.hypot(x - ps.startX, y - ps.startY) * 0.001;
    if (Math.abs(delta) > 0.003) {
      state.stirImpulse = Math.min(1, state.stirImpulse + Math.abs(delta) * 0.6);
      state.stirQuality = Math.min(1, state.stirQuality + Math.abs(delta) * 0.028);
      if (Math.abs(delta) > 0.045) spawnRipple(x, y);
    }
    if (e.cancelable) e.preventDefault();
  }, { passive: false });

  function endCanvasStir(e) {
    const ps = state.pointerStir;
    if (!ps || (e && e.pointerId !== ps.id)) return;
    if (ps.moved < 0.09) {
      state.stirImpulse = Math.max(state.stirImpulse, 0.18);
      spawnRipple(pan.cx, pan.cy);
      Sound.tap();
    }
    state.pointerStir = null;
  }

  canvas.addEventListener('pointerup', endCanvasStir);
  canvas.addEventListener('pointercancel', endCanvasStir);
  canvas.addEventListener('lostpointercapture', endCanvasStir);

  /* -------------------------------- stir ----------------------------------- */

  function beginStir(e) {
    if (state.paused || state.serving) return;
    Sound.init();
    Sound.swish();
    state.stirring = true;
    els.stirBtn.classList.add('is-stirring');
    try { els.stirBtn.setPointerCapture(e.pointerId); } catch (err) { /* no-op */ }
    e.preventDefault();
  }

  function endStir() {
    state.stirring = false;
    els.stirBtn.classList.remove('is-stirring');
  }

  els.stirBtn.addEventListener('pointerdown', beginStir);
  els.stirBtn.addEventListener('pointerup', endStir);
  els.stirBtn.addEventListener('pointercancel', endStir);
  els.stirBtn.addEventListener('lostpointercapture', endStir);

  /* -------------------------------- tilt ----------------------------------- */

  let orientationHandler = null;
  let motionHandler = null;
  let tiltWatchdog = 0;

  function onOrientation(e) {
    if (e.gamma == null && e.beta == null) return;
    const g = e.gamma || 0;
    const b = e.beta || 0;
    if (!state.tilt.calibration) state.tilt.calibration = { g, b };
    state.tilt.gotReading = true;
    state.tilt.gotOrientation = true;
    const cal = state.tilt.calibration;
    state.tilt.x = clamp((g - cal.g) / 30, -1, 1);
    state.tilt.y = clamp((b - cal.b) / 30, -1, 1);
  }

  function onMotion(e) {
    if (state.tilt.gotOrientation) return;
    const a = e.accelerationIncludingGravity;
    if (!a || (a.x == null && a.y == null)) return;
    const ax = a.x || 0;
    const ay = a.y || 0;
    if (!state.tilt.calibration) state.tilt.calibration = { g: ax, b: ay };
    state.tilt.gotReading = true;
    const cal = state.tilt.calibration;
    state.tilt.x = clamp((ax - cal.g) / 7, -1, 1);
    state.tilt.y = clamp((ay - cal.b) / 7, -1, 1);
  }

  function enableTilt() {
    state.tiltOn = true;
    state.tilt.x = 0;
    state.tilt.y = 0;
    state.tilt.gotReading = false;
    state.tilt.gotOrientation = false;
    state.tilt.calibration = null;
    orientationHandler = onOrientation;
    motionHandler = onMotion;
    window.addEventListener('deviceorientation', orientationHandler, true);
    window.addEventListener('devicemotion', motionHandler, true);
    els.tiltBtn.setAttribute('aria-pressed', 'true');
    els.tiltReadout.classList.add('is-on');
    Sound.tap();
    toast('Tilt is on. Lean your phone to swirl the pan.');
    clearTimeout(tiltWatchdog);
    tiltWatchdog = setTimeout(() => {
      if (state.tiltOn && !state.tilt.gotReading) {
        toast('No tilt sensor here. Touch controls still work.');
        disableTilt(true);
      }
    }, 1700);
  }

  function disableTilt(silent) {
    state.tiltOn = false;
    state.tilt.x = 0;
    state.tilt.y = 0;
    state.tilt.calibration = null;
    if (orientationHandler) window.removeEventListener('deviceorientation', orientationHandler, true);
    if (motionHandler) window.removeEventListener('devicemotion', motionHandler, true);
    orientationHandler = null;
    motionHandler = null;
    els.tiltBtn.setAttribute('aria-pressed', 'false');
    els.tiltReadout.classList.remove('is-on');
    clearTimeout(tiltWatchdog);
    if (!silent) toast('Tilt off. Touch controls are ready.');
  }

  async function toggleTilt() {
    if (state.tiltOn) {
      disableTilt(false);
      return;
    }
    Sound.init();
    const DOE = window.DeviceOrientationEvent;
    const DME = window.DeviceMotionEvent;
    if (!DOE && !DME) {
      toast('This device has no tilt sensor. Touch works beautifully.');
      Sound.nope();
      return;
    }
    let granted = true;
    try {
      if (DOE && typeof DOE.requestPermission === 'function') {
        granted = (await DOE.requestPermission()) === 'granted';
      } else if (DME && typeof DME.requestPermission === 'function') {
        granted = (await DME.requestPermission()) === 'granted';
      }
    } catch (err) {
      granted = false;
    }
    if (!granted) {
      toast('Motion access was not granted. Touch controls still work.');
      Sound.nope();
      return;
    }
    enableTilt();
  }

  /* -------------------------------- buttons -------------------------------- */

  els.tiltBtn.addEventListener('click', toggleTilt);
  els.clearBtn.addEventListener('click', () => clearPan(false));
  els.serveBtn.addEventListener('click', serveDish);
  els.soundBtn.addEventListener('click', toggleSound);
  els.helpBtn.addEventListener('click', () => {
    closeSheet();
    showWelcome(true);
  });
  els.welcomeStart.addEventListener('click', () => {
    hideWelcome();
  });

  els.recipePill.addEventListener('click', () => {
    const cardHidden = !els.recipeCard || getComputedStyle(els.recipeCard).display === 'none';
    if (cardHidden) {
      openSheet();
    } else if (els.recipeCard.animate) {
      els.recipeCard.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.025)' }, { transform: 'scale(1)' }],
        { duration: 420, easing: 'ease-out' }
      );
    }
  });

  els.sheetBackdrop.addEventListener('click', closeSheet);
  els.sheetGrab.addEventListener('click', closeSheet);

  els.serveNext.addEventListener('click', () => {
    hideServeModal();
    beginRecipe(state.recipeIndex + 1);
  });

  els.serveReplay.addEventListener('click', () => {
    hideServeModal();
    beginRecipe(state.recipeIndex);
  });

  /* ------------------------------- keyboard -------------------------------- */

  window.addEventListener('keydown', (e) => {
    const key = e.key;
    if (key === 'Escape') {
      if (els.recipeSheet.classList.contains('is-on')) closeSheet();
      return;
    }
    if (els.welcome.getAttribute('aria-hidden') !== 'true') {
      if (key === 'Enter' || key === ' ') {
        e.preventDefault();
        hideWelcome();
      }
      return;
    }
    if (els.serveModal.getAttribute('aria-hidden') !== 'true') {
      if (key === 'Enter') {
        e.preventDefault();
        els.serveNext.click();
      }
      return;
    }
    if (els.recipeSheet.classList.contains('is-on')) return;

    if (key === ' ') {
      e.preventDefault();
      if (!state.paused && !state.serving) {
        Sound.init();
        state.stirring = true;
        els.stirBtn.classList.add('is-stirring');
      }
    } else if (key === 'ArrowUp') {
      e.preventDefault();
      setHeat(state.heat + 5);
    } else if (key === 'ArrowDown') {
      e.preventDefault();
      setHeat(state.heat - 5);
    } else if (key === 'Enter') {
      e.preventDefault();
      serveDish();
    } else if (/^[1-9]$/.test(key)) {
      const keys = Object.keys(INGREDIENTS);
      const type = keys[Number(key) - 1];
      if (type) selectIngredient(type);
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.key === ' ') endStir();
  });

  els.heatControl.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault();
      setHeat(state.heat + 5);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault();
      setHeat(state.heat - 5);
    }
  });

  /* -------------------------------- lifecycle ------------------------------ */

  let resizeTimer = 0;
  function scheduleResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 80);
  }

  if (window.ResizeObserver) {
    new ResizeObserver(scheduleResize).observe(els.stage);
  } else {
    window.addEventListener('resize', scheduleResize);
  }
  window.addEventListener('orientationchange', () => setTimeout(resize, 260));

  document.addEventListener('pointerdown', () => Sound.init(), { once: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      endStir();
      endCanvasStir();
      state.pointerStir = null;
    }
  });

  /* --------------------------------- loop ---------------------------------- */

  let lastFrame = performance.now();

  function tick(now) {
    const dt = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;
    if (!state.paused) update(dt);
    drawScene(now / 1000);
    requestAnimationFrame(tick);
  }

  function init() {
    renderPantry();
    els.soundBtn.setAttribute('aria-pressed', profile.sound ? 'true' : 'false');
    Sound.muted = !profile.sound;
    updateCoins();
    updateHeatUI();
    beginRecipe(profile.recipeIndex);
    showWelcome(false);
    resize();
    requestAnimationFrame(tick);
  }

  /* --------------------------------- debug --------------------------------- */

  window.__sizzle = {
    get state() { return state; },
    add: (type, target) => addIngredient(type, target),
    heat: (v) => setHeat(v),
    stir: (amount) => {
      state.stirQuality = clamp(amount == null ? 1 : amount, 0, 1);
      state.stirImpulse = 0.8;
    },
    cookTo: (d) => {
      state.items.forEach((item) => { item.doneness = d == null ? 0.82 : d; });
    },
    serve: () => serveDish(),
    next: () => { hideServeModal(); beginRecipe(state.recipeIndex + 1); },
    recipe: () => state.recipe.id,
    score: () => scoreDish(),
    start: () => hideWelcome(),
    select: (type) => selectIngredient(type),
    clear: () => clearPan(true),
    ready: () => {
      state.recipe.ingredients.forEach((type) => {
        if (!has(state, type)) addIngredient(type);
      });
      state.items.forEach((item) => { item.doneness = 0.84; });
      state.stirQuality = 0.92;
    }
  };

  init();

})();

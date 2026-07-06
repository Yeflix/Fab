"use strict";
/* ════════════════ SETTINGS & SAVE ════════════════ */
const SAVE_KEY = 'fabiola_save_v3';
const SET_KEY = 'fabiola_settings_v3';

const defaultSettings = { quality: 'auto', sound: true, reducedMotion: false, theme: 'gold', animSpeed: 1, musicVol: 0.6 };
let settings = loadSettings();

function loadSettings() {
    try { const s = JSON.parse(localStorage.getItem(SET_KEY)); if (s) return Object.assign({}, defaultSettings, s); } catch (e) { }
    return Object.assign({}, defaultSettings);
}
function saveSettings() { try { localStorage.setItem(SET_KEY, JSON.stringify(settings)); } catch (e) { } }

const ACHIEVEMENTS = [
    { id: 'start', ico: '🚀', name: 'Primer Paso', desc: 'Comenzar el viaje' },
    { id: 'words', ico: '📜', name: 'Palabras del Alma', desc: 'Completar la Fase I' },
    { id: 'noHint', ico: '🎯', name: 'Sin Tropiezos', desc: 'Completar la Fase I sin errores' },
    { id: 'mind', ico: '🧠', name: 'Mente Brillante', desc: 'Resolver todos los desafíos' },
    { id: 'destiny', ico: '💛', name: 'El Omega', desc: 'Llegar al final del viaje' },
    { id: 'complete', ico: '⭐', name: 'Constelación Completa', desc: 'Completar las 3 fases' },
    { id: 'voyager', ico: '🛰', name: 'Voyager', desc: 'Visitar el mapa estelar' },
];

function freshSave() {
    return {
        phase: 1, phase1: false, phase2: false, phase3: false,
        phase3Unlocked: false,
        solvedLetters: new Array(7).fill(false),
        uploaded: new Array(4).fill(false),
        stars: 0, p1Errors: 0, achievements: [],
        poemResponses: {}  // FIX: inicializado desde el principio
    };
}
let save = loadSave();
function loadSave() {
    try {
        const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.solvedLetters) {
            if (!s.uploaded) s.uploaded = new Array(4).fill(false);
            return s;
        }
    } catch (e) { }
    return null;
}
function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { }
    updateHUD();
    try { document.dispatchEvent(new CustomEvent('save-changed')); } catch (e) { }
}
function wipeSave() {
    localStorage.removeItem(SAVE_KEY); save = null;
    showToast('Progreso borrado. Todo vuelve al inicio.');
    document.getElementById('btn-continue').style.display = 'none';
    document.getElementById('hud-progress').style.display = 'none';
    refreshMenu();
}

function hasProgress() { return !!(save && (save.phase > 1 || save.solvedLetters.some(Boolean) || save.phase1)); }

function unlockAchievement(id) {
    if (!save) return;
    if (save.achievements.includes(id)) return;
    save.achievements.push(id);
    persist();
    const a = ACHIEVEMENTS.find(x => x.id === id);
    if (a) { showAchPop(a); award(10); }
}
function award(n) { if (!save) return; save.stars += n; persist(); }

/* ════════════════ HUD ════════════════ */
function updateHUD() {
    const hp = document.getElementById('hud-progress');
    const activeGame = save && document.querySelector('#phase1-screen.active,#phase2-screen.active,#phase3-screen.active,#map-screen.active');
    if (activeGame) { hp.style.display = 'flex'; } else { hp.style.display = 'none'; }
    if (save) {
        const done = (save.phase1 ? 1 : 0) + (save.phase2 ? 1 : 0) + (save.phase3 ? 1 : 0);
        document.getElementById('hud-lbl').textContent = `Fase ${Math.min(save.phase, 3)}/3`;
        document.getElementById('hud-bar').style.width = (done / 3 * 100) + '%';
        document.getElementById('hud-stars').textContent = '★ ' + save.stars;
    }
}
function showTopbar(show) { document.getElementById('topbar').classList.toggle('hidden', !show); }

/* ════════════════ AUDIO ════════════════ */
let audioCtx = null;
function ensureAudio() { if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } } }
function beep(freq, dur, type = 'sine', vol = 0.05) {
    if (!settings.sound || !audioCtx) return;
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + dur);
}
function sfxClick() { ensureAudio(); beep(420, 0.08, 'triangle', 0.04); }
function sfxSuccess() { ensureAudio(); beep(660, 0.12, 'sine', 0.05); setTimeout(() => beep(880, 0.16, 'sine', 0.05), 90); }
function sfxBig() { ensureAudio();[523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.25, 'sine', 0.05), i * 120)); }
function sfxWhoosh() {
    ensureAudio(); if (!audioCtx || !settings.sound) return;
    const o = audioCtx.createOscillator(), g = audioCtx.createGain(), now = audioCtx.currentTime;
    o.type = 'sawtooth'; o.frequency.setValueAtTime(200, now); o.frequency.exponentialRampToValueAtTime(40, now + 1.2);
    g.gain.setValueAtTime(0.001, now); g.gain.exponentialRampToValueAtTime(0.08, now + .3); g.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
    o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(now + 1.4);
}
function sfxBoom() {
    ensureAudio(); if (!audioCtx || !settings.sound) return;
    const o = audioCtx.createOscillator(), g = audioCtx.createGain(), now = audioCtx.currentTime;
    o.type = 'triangle'; o.frequency.setValueAtTime(900, now); o.frequency.exponentialRampToValueAtTime(60, now + 1.2);
    g.gain.setValueAtTime(0.15, now); g.gain.exponentialRampToValueAtTime(0.0001, now + 1.3);
    o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(now + 1.4);
}

/* ════════════════ BACKGROUND CANVAS (ASTRO) ════════════════ */
const bgCanvas = document.getElementById('bgCanvas');
const bgCtx = bgCanvas.getContext('2d', { alpha: false });
let bgStars = [], bgParticles = [], shootingStars = [], planets = [], constellations = [], blackHoleBG = null;
let nebulaeImage = null, supernovaBG = null;
let animationId = null, pageVisible = true, lastFrame = 0;
let QUALITY = resolveQuality();
let currentScreen = 'menu-screen';

function resolveQuality() {
    if (settings.quality !== 'auto') return settings.quality;
    const mem = navigator.deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 4;
    const minSide = Math.min(window.innerWidth, window.innerHeight);
    const isTouch = matchMedia('(pointer:coarse)').matches;
    if (mem <= 2 || cores <= 2 || minSide < 480) return 'low';
    if (mem <= 4 || cores <= 4 || minSide < 760 || isTouch) return 'medium';
    return 'high';
}
const QCONF = {
    low: { stars: 30, particles: 0, fps: 20, glow: false, dpr: 1, planets: 2, shooters: 0, constellations: 1 },
    medium: { stars: 95, particles: 12, fps: 36, glow: false, dpr: 1, planets: 3, shooters: 1, constellations: 2 },
    high: { stars: 170, particles: 30, fps: 60, glow: true, dpr: 1.35, planets: 4, shooters: 2, constellations: 3 },
};
function qc() { return QCONF[QUALITY] || QCONF.medium; }

function resizeBgCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, qc().dpr);
    bgCanvas.width = Math.floor(window.innerWidth * dpr);
    bgCanvas.height = Math.floor(window.innerHeight * dpr);
    bgCanvas.style.width = window.innerWidth + 'px';
    bgCanvas.style.height = window.innerHeight + 'px';
    bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // nebulaeImage stays cached; regenerated only by initBgEntities (width changes)
}
let resizeT, lastBgW = window.innerWidth, lastBgH = window.innerHeight;
window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
        const nw = window.innerWidth, nh = window.innerHeight;
        const widthChanged = Math.abs(nw - lastBgW) > 2;
        const heightDelta = Math.abs(nh - lastBgH);
        // Ignore height-only shifts caused by mobile URL bar showing/hiding
        if (!widthChanged && heightDelta < 160) { lastBgH = nh; return; }
        lastBgW = nw; lastBgH = nh;
        resizeBgCanvas();
        if (widthChanged) initBgEntities();
    }, 250);
}, { passive: true });

function generateNebulaeImage() {
    const w = window.innerWidth, h = window.innerHeight;
    const off = document.createElement('canvas'); off.width = w; off.height = h;
    const ctx = off.getContext('2d');
    [
        { x: w * .20, y: h * .30, r: w * .42, c: '70,32,120', a: .28 },
        { x: w * .78, y: h * .55, r: w * .45, c: '120,40,70', a: .24 },
        { x: w * .50, y: h * .78, r: w * .38, c: '32,72,130', a: .22 },
        { x: w * .10, y: h * .85, r: w * .30, c: '180,90,50', a: .14 },
    ].forEach(n => {
        const g = ctx.createRadialGradient(n.x, n.y, n.r * .1, n.x, n.y, n.r);
        g.addColorStop(0, `rgba(${n.c},${n.a})`); g.addColorStop(.5, `rgba(${n.c},${n.a * .4})`); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    });
    // distant galaxy spiral
    const gx = w * .82, gy = h * .18, gr = Math.min(w, h) * .12;
    for (let a = 0; a < Math.PI * 6; a += 0.05) {
        const r = gr * (a / (Math.PI * 6));
        const x = gx + Math.cos(a) * r, y = gy + Math.sin(a) * r * .5;
        ctx.fillStyle = `rgba(220,200,255,${.18 * (1 - a / (Math.PI * 6))})`;
        ctx.fillRect(x, y, 1.5, 1.5);
    }
    return off;
}

function initBgEntities() {
    const w = window.innerWidth, h = window.innerHeight, c = qc();
    nebulaeImage = null;
    bgStars = Array.from({ length: c.stars }, () => ({
        x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.7 + 0.3,
        speed: Math.random() * 0.12 + 0.02, opacity: Math.random() * 0.6 + 0.3,
        tw: Math.random() * 0.012 + 0.004, off: Math.random() * Math.PI * 2,
        hue: Math.random() < .15 ? (Math.random() < .5 ? '200,220,255' : '255,220,200') : '255,255,255'
    }));
    bgParticles = Array.from({ length: c.particles }, () => ({
        x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.1 + 0.3,
        vx: (Math.random() - 0.5) * 0.25, vy: -(Math.random() * 0.35 + 0.12),
        opacity: Math.random() * 0.35 + 0.12, life: Math.random() * 300 + 200
    }));
    // Orbiting planets - subtle background solar system
    const cx = w * .5, cy = h * .5;
    planets = [];
    const palette = ['#d4a574', '#8bb4d0', '#d4a0b0', '#a0d4a0', '#c0a0d4'];
    for (let i = 0; i < c.planets; i++) {
        planets.push({
            cx, cy,
            orbit: Math.min(w, h) * (.18 + i * .08),
            angle: Math.random() * Math.PI * 2,
            speed: 0.0006 / (i + 1) + 0.0003,
            r: 2.2 + Math.random() * 1.6,
            color: palette[i % palette.length],
            ring: i === 2,
            tilt: -.4 + Math.random() * .4
        });
    }
    shootingStars = [];
    // Constellations - line patterns of stars
    constellations = [];
    for (let k = 0; k < c.constellations; k++) {
        const baseX = (.15 + Math.random() * .7) * w, baseY = (.15 + Math.random() * .55) * h;
        const pts = [];
        const n = 4 + Math.floor(Math.random() * 3);
        let px = baseX, py = baseY;
        for (let i = 0; i < n; i++) {
            px += (Math.random() - .5) * 120;
            py += (Math.random() - .5) * 90;
            pts.push({ x: px, y: py, r: 1.4 + Math.random() * .8 });
        }
        constellations.push({ pts, opacity: .12 + Math.random() * .10 });
    }
}

function spawnShootingStar() {
    const w = window.innerWidth, h = window.innerHeight;
    const fromLeft = Math.random() < .5;
    shootingStars.push({
        x: fromLeft ? -50 : w + 50,
        y: Math.random() * h * .6,
        vx: (fromLeft ? 1 : -1) * (6 + Math.random() * 4),
        vy: 2 + Math.random() * 2,
        life: 1.0,
        trail: []
    });
}

function maybeSupernova() {
    if (QUALITY === 'low' || settings.reducedMotion) return;
    if (Math.random() < .0007) {
        const s = bgStars[Math.floor(Math.random() * bgStars.length)];
        if (s) supernovaBG = { x: s.x, y: s.y, t: 0 };
    }
}

function drawBackground(ts) {
    animationId = requestAnimationFrame(drawBackground);
    if (!pageVisible) return;
    const _spd = (window.__animSpeed || 1);
    const interval = 1000 / (qc().fps * _spd);
    if (window.__fpsTick) window.__fpsTick(ts);
    if (ts - lastFrame < interval) return;
    const dt = ts - lastFrame;
    lastFrame = ts;
    const w = window.innerWidth, h = window.innerHeight, c = qc();
    bgCtx.clearRect(0, 0, w, h);
    if (!nebulaeImage) nebulaeImage = generateNebulaeImage();
    bgCtx.drawImage(nebulaeImage, 0, 0);

    // Constellations (under stars)
    for (const co of constellations) {
        bgCtx.beginPath();
        for (let i = 0; i < co.pts.length; i++) {
            const p = co.pts[i];
            if (i === 0) bgCtx.moveTo(p.x, p.y); else bgCtx.lineTo(p.x, p.y);
        }
        bgCtx.strokeStyle = `rgba(212,165,116,${co.opacity})`;
        bgCtx.lineWidth = .6;
        bgCtx.stroke();
        for (const p of co.pts) {
            bgCtx.beginPath(); bgCtx.arc(p.x, p.y, p.r, 0, 6.283);
            bgCtx.fillStyle = `rgba(255,240,210,${co.opacity * 4})`; bgCtx.fill();
        }
    }

    // Stars
    for (const s of bgStars) {
        const t = Math.sin(ts * s.tw + s.off) * 0.5 + 0.5, a = s.opacity * t;
        let safeR = Math.max(0.02, s.r || 0.3);
        bgCtx.beginPath(); bgCtx.arc(s.x, s.y, safeR, 0, 6.283);
        bgCtx.fillStyle = `rgba(${s.hue},${a})`; bgCtx.fill();
        if (c.glow && s.r > 1.2 && t > 0.75) {
            bgCtx.beginPath(); bgCtx.arc(s.x, s.y, safeR * 2.6, 0, 6.283);
            bgCtx.fillStyle = `rgba(200,180,220,${a * 0.18})`; bgCtx.fill();
        }
        s.y -= s.speed * 0.1; if (s.y < -10) { s.y = h + 10; s.x = Math.random() * w; }
    }

    // Particles (cosmic dust)
    for (const p of bgParticles) {
        p.x += p.vx; p.y += p.vy; p.life--;
        if (p.life <= 0 || p.y < -20 || p.x < -20 || p.x > w + 20) { p.x = Math.random() * w; p.y = h + 10; p.life = Math.random() * 300 + 200; }
        bgCtx.beginPath(); bgCtx.arc(p.x, p.y, p.r, 0, 6.283); bgCtx.fillStyle = `rgba(212,165,116,${p.opacity})`; bgCtx.fill();
    }

    // Planets in orbit (subtle, recenter around screen)
    const ccx = w * .5, ccy = h * .5;
    if (planets.length) {
        // central faint sun
        const sg = bgCtx.createRadialGradient(ccx, ccy, 0, ccx, ccy, 30);
        sg.addColorStop(0, 'rgba(255,220,160,.35)'); sg.addColorStop(1, 'rgba(255,220,160,0)');
        bgCtx.fillStyle = sg; bgCtx.beginPath(); bgCtx.arc(ccx, ccy, 30, 0, 6.283); bgCtx.fill();
    }
    for (const pl of planets) {
        pl.cx = ccx; pl.cy = ccy;
        pl.angle += pl.speed * dt;
        // dashed orbit ring
        bgCtx.beginPath(); bgCtx.setLineDash([3, 8]);
        bgCtx.ellipse(pl.cx, pl.cy, pl.orbit, pl.orbit * .55, pl.tilt, 0, 6.283);
        bgCtx.strokeStyle = 'rgba(212,165,116,.07)'; bgCtx.lineWidth = 1; bgCtx.stroke();
        bgCtx.setLineDash([]);
        const px = pl.cx + Math.cos(pl.angle) * pl.orbit * Math.cos(pl.tilt) - Math.sin(pl.angle) * pl.orbit * .55 * Math.sin(pl.tilt);
        const py = pl.cy + Math.cos(pl.angle) * pl.orbit * Math.sin(pl.tilt) + Math.sin(pl.angle) * pl.orbit * .55 * Math.cos(pl.tilt);
        // glow
        if (c.glow) {
            bgCtx.beginPath(); bgCtx.arc(px, py, pl.r * 3, 0, 6.283);
            bgCtx.fillStyle = pl.color + '22'; bgCtx.fill();
        }
        bgCtx.beginPath(); bgCtx.arc(px, py, pl.r, 0, 6.283);
        bgCtx.fillStyle = pl.color; bgCtx.fill();
        if (pl.ring) {
            bgCtx.beginPath(); bgCtx.ellipse(px, py, pl.r * 2, pl.r * .6, .4, 0, 6.283);
            bgCtx.strokeStyle = 'rgba(212,165,116,.5)'; bgCtx.lineWidth = .8; bgCtx.stroke();
        }
    }

    // Shooting stars
    if (c.shooters && Math.random() < .005) spawnShootingStar();
    for (let i = shootingStars.length - 1; i >= 0; i--) {
        const s = shootingStars[i];
        s.trail.push({ x: s.x, y: s.y });
        if (s.trail.length > 14) s.trail.shift();
        s.x += s.vx; s.y += s.vy; s.life -= .008;
        for (let j = 0; j < s.trail.length; j++) {
            const t = s.trail[j], a = (j / s.trail.length) * s.life;
            bgCtx.beginPath(); bgCtx.arc(t.x, t.y, 1.6 * a, 0, 6.283);
            bgCtx.fillStyle = `rgba(255,240,200,${a})`; bgCtx.fill();
        }
        bgCtx.beginPath(); bgCtx.arc(s.x, s.y, 2, 0, 6.283);
        bgCtx.fillStyle = 'rgba(255,255,255,' + s.life + ')'; bgCtx.fill();
        if (s.life <= 0 || s.x < -100 || s.x > w + 100 || s.y > h + 100) shootingStars.splice(i, 1);
    }

    // Random ambient supernova
    maybeSupernova();
    if (supernovaBG) {
        supernovaBG.t += 1;
        const t = supernovaBG.t, r = t * 3;
        const a = Math.max(0, 1 - t / 60);
        const grad = bgCtx.createRadialGradient(supernovaBG.x, supernovaBG.y, 0, supernovaBG.x, supernovaBG.y, r);
        grad.addColorStop(0, `rgba(255,255,255,${a})`);
        grad.addColorStop(.4, `rgba(255,220,150,${a * .6})`);
        grad.addColorStop(1, 'rgba(180,80,40,0)');
        bgCtx.fillStyle = grad; bgCtx.beginPath(); bgCtx.arc(supernovaBG.x, supernovaBG.y, r, 0, 6.283); bgCtx.fill();
        bgCtx.strokeStyle = `rgba(255,210,160,${a * .7})`; bgCtx.lineWidth = 1.2;
        bgCtx.beginPath(); bgCtx.arc(supernovaBG.x, supernovaBG.y, r, 0, 6.283); bgCtx.stroke();
        if (t > 70) supernovaBG = null;
    }

    // Background black hole on phase 3 / map
    if (blackHoleBG) {
        const bh = blackHoleBG;
        bh.angle += .005 * dt;
        const rg = bgCtx.createRadialGradient(bh.x, bh.y, 0, bh.x, bh.y, bh.r * 3);
        rg.addColorStop(0, 'rgba(0,0,0,1)');
        rg.addColorStop(.35, 'rgba(0,0,0,.9)');
        rg.addColorStop(.5, 'rgba(80,40,140,.45)');
        rg.addColorStop(.7, 'rgba(212,165,116,.25)');
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        bgCtx.fillStyle = rg; bgCtx.beginPath(); bgCtx.arc(bh.x, bh.y, bh.r * 3, 0, 6.283); bgCtx.fill();
        bgCtx.save(); bgCtx.translate(bh.x, bh.y); bgCtx.rotate(bh.angle);
        bgCtx.strokeStyle = 'rgba(255,200,150,.5)'; bgCtx.lineWidth = 2;
        bgCtx.beginPath(); bgCtx.ellipse(0, 0, bh.r * 1.8, bh.r * .5, 0, 0, 6.283); bgCtx.stroke();
        bgCtx.strokeStyle = 'rgba(180,120,220,.35)';
        bgCtx.beginPath(); bgCtx.ellipse(0, 0, bh.r * 2.2, bh.r * .6, 0, 0, 6.283); bgCtx.stroke();
        bgCtx.restore();
        // event horizon
        bgCtx.fillStyle = '#000'; bgCtx.beginPath(); bgCtx.arc(bh.x, bh.y, bh.r, 0, 6.283); bgCtx.fill();
    }
}
function startBg() {
    resizeBgCanvas(); initBgEntities();
    if (animationId) cancelAnimationFrame(animationId);
    lastFrame = 0; animationId = requestAnimationFrame(drawBackground);
}
function setBackgroundFor(screen) {
    // toggle black hole presence based on screen
    if (screen === 'phase3-screen') {
        blackHoleBG = { x: window.innerWidth * .85, y: window.innerHeight * .2, r: 34, angle: 0 };
    } else if (screen === 'map-screen') {
        blackHoleBG = { x: window.innerWidth * .92, y: window.innerHeight * .85, r: 22, angle: 0 };
    } else blackHoleBG = null;
}
document.addEventListener('visibilitychange', () => { pageVisible = !document.hidden; });

/* ════════════════ SPARKLES ════════════════ */
function createSparkle(x, y, count = 10) {
    if (settings.reducedMotion || QUALITY === 'low') count = Math.min(count, 4);
    const f = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
        const s = document.createElement('div');
        s.style.cssText = `position:fixed;pointer-events:none;z-index:60;width:6px;height:6px;background:#f0d0a8;border-radius:50%;left:${x}px;top:${y}px;box-shadow:0 0 12px rgba(240,200,150,.8);--dx:${(Math.random() - .5) * 80}px;--dy:${(Math.random() - .5) * 80 - 30}px;animation:sparkle ${0.7 + Math.random() * 0.7}s ease-out forwards;`;
        f.appendChild(s); setTimeout(() => s.remove(), 1500);
    }
    document.body.appendChild(f);
}

/* ════════════════ TOAST / POPUP ════════════════ */
const toastEl = document.getElementById('toast'); let toastT;
function showToast(m, d = 2800) {
    clearTimeout(toastT); toastEl.textContent = m; toastEl.classList.add('show');
    toastT = setTimeout(() => toastEl.classList.remove('show'), d);
}
let achQueue = [], achBusy = false;
function showAchPop(a) { achQueue.push(a); if (!achBusy) nextAchPop(); }
function nextAchPop() {
    if (!achQueue.length) { achBusy = false; return; }
    achBusy = true; const a = achQueue.shift();
    const pop = document.getElementById('ach-pop');
    document.getElementById('ach-pop-name').textContent = a.name;
    pop.querySelector('.ico').textContent = a.ico;
    pop.classList.add('show'); sfxSuccess();
    setTimeout(() => { pop.classList.remove('show'); setTimeout(nextAchPop, 500); }, 3200);
}

/* ════════════════ BLACK HOLE TRANSITION ════════════════ */
function blackHoleTransition(after) {
    if (settings.reducedMotion) { after && after(); return; }
    const ov = document.getElementById('blackhole-overlay');
    ov.classList.add('active');
    sfxWhoosh();
    // restart anims
    ov.querySelectorAll('.bh-disk').forEach(d => { d.style.animation = 'none'; d.offsetHeight; d.style.animation = ''; });
    setTimeout(() => { after && after(); }, 900);
    setTimeout(() => { ov.classList.remove('active'); }, 1700);
}

/* ════════════════ SUPERNOVA OVERLAY ════════════════ */
function supernovaBurst() {
    if (settings.reducedMotion) return;
    const ov = document.getElementById('supernova-overlay');
    ov.classList.add('active');
    sfxBoom();
    ov.querySelectorAll('.sn-core,.sn-ring').forEach(d => { d.style.animation = 'none'; d.offsetHeight; d.style.animation = ''; });
    setTimeout(() => ov.classList.remove('active'), 2400);
}

/* ════════════════ FIREBASE — RESPUESTAS DE POEMAS ════════════════ */
async function savePoemResponse(stageIdx, title, text) {
    if (!window._db) { showToast('⚠ Firebase no inicializado'); return false; }
    try {
        await window._db.collection('poemResponses').doc(`poem_${stageIdx}`).set({
            poemTitle: title,
            response: text,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        return true;
    } catch (e) {
        console.error('Firestore error:', e);
        showToast('❌ Error al guardar. Revisa la consola.');
        return false;
    }
}

function submitPoemResponse(stageIdx, title) {
    const area = document.getElementById(`poem-response-${stageIdx}`);
    const btn = document.getElementById(`poem-submit-${stageIdx}`);
    const stat = document.getElementById(`poem-status-${stageIdx}`);
    const text = area?.value?.trim();
    if (!text) { showToast('✦ Escribe algo antes de enviar al cosmos'); return; }

    btn.disabled = true;
    btn.textContent = 'TRANSMITIENDO…';
    stat.textContent = '';

    savePoemResponse(stageIdx, title, text).then(ok => {
        if (ok) {
            btn.textContent = '✦ TRANSMITIDO';
            btn.style.borderColor = 'var(--success)';
            btn.style.color = 'var(--success)';
            area.disabled = true;
            stat.textContent = '✓ Tu reflexión viaja entre las estrellas';
            stat.style.color = 'var(--success)';
            const br = btn.getBoundingClientRect();
            createSparkle(br.left + br.width / 2, br.top, 14);
            sfxSuccess?.();
            if (save) {
                if (!save.poemResponses) save.poemResponses = {};
                save.poemResponses[stageIdx] = text;
                persist();
            }
        } else {
            btn.disabled = false;
            btn.textContent = 'ENVIAR AL COSMOS ✦';
        }
    });
}

/* ════════════════ NEBULA DRIFT — TRANSICIÓN CÓSMICA ENTRE POEMAS ════════════════ */
let confTransitioning = false;

function nebulaDrift(fromIdx, toIdx, callback) {
    if (settings?.reducedMotion || QUALITY === 'low') { callback(); return; }
    if (confTransitioning) return;
    confTransitioning = true;

    const W = window.innerWidth, H = window.innerHeight;
    const cx = W / 2, cy = H / 2;

    /* Overlay con canvas */
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:350;pointer-events:all;overflow:hidden;opacity:0;transition:opacity .3s ease';
    const cv = document.createElement('canvas');
    cv.style.cssText = 'position:absolute;inset:0;';
    cv.width = W; cv.height = H;
    ov.appendChild(cv);
    document.body.appendChild(ov);
    const ctx = cv.getContext('2d');

    /* Origen: centro del stage actual */
    const stEl = document.getElementById(`conf-stage-${fromIdx}`);
    const r = stEl?.getBoundingClientRect() || { left: cx - 100, top: cy - 100, width: 200, height: 200 };
    const ox = r.left + r.width / 2;
    const oy = r.top + r.height / 2;

    const COUNT = QUALITY === 'high' ? 130 : 75;
    const FRAMES = 72; // ~1.2s a 60fps
    let frame = 0;
    let switched = false;

    /* Paleta cósmica */
    const palette = [
        'hsl(260,75%,70%)', 'hsl(290,70%,65%)', 'hsl(320,65%,72%)',
        'hsl(200,80%,70%)', 'hsl(340,60%,78%)', 'hsl(180,70%,68%)'
    ];

    /* Partículas dinámicas */
    const stars = Array.from({ length: COUNT }, () => {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 1.5;
        return {
            x: ox + (Math.random() - .5) * r.width * .6,
            y: oy + (Math.random() - .5) * r.height * .6,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: Math.random() * 3 + .6,
            color: palette[Math.floor(Math.random() * palette.length)],
            trail: []
        };
    });

    /* Estrellas de fondo estáticas */
    const bgStars = Array.from({ length: 80 }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        s: Math.random() * 1.4 + .3,
        a: Math.random()
    }));

    function draw() {
        const t = frame / FRAMES;
        const peak = Math.sin(t * Math.PI); // curva suave 0→1→0

        ctx.clearRect(0, 0, W, H);

        /* Fondo oscuro nebular */
        ctx.fillStyle = `rgba(4,2,12,${peak * .92})`;
        ctx.fillRect(0, 0, W, H);

        /* Fondo de estrellas tenues */
        bgStars.forEach(s => {
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.s, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${s.a * peak * .6})`;
            ctx.fill();
        });

        /* Anillos de nebulosa giratoria */
        for (let ring = 0; ring < 4; ring++) {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(t * Math.PI * (ring % 2 === 0 ? 1.4 : -1) + ring);
            const rad = (ring + 1) * 110 * (.8 + peak * .4);
            const g = ctx.createRadialGradient(0, 0, ring * 25, 0, 0, rad);
            g.addColorStop(0, `hsla(${270 + ring * 18},80%,45%,${peak * .18})`);
            g.addColorStop(.5, `hsla(${300 + ring * 12},70%,35%,${peak * .1})`);
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.ellipse(0, 0, rad * 1.2, rad * .65, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        /* Núcleo brillante central (mitad de la animación) */
        if (t > .25 && t < .75) {
            const cp = Math.sin((t - .25) / .5 * Math.PI);
            const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 130 * cp);
            cg.addColorStop(0, `hsla(300,90%,90%,${cp * .55})`);
            cg.addColorStop(.35, `hsla(280,80%,55%,${cp * .28})`);
            cg.addColorStop(1, 'transparent');
            ctx.fillStyle = cg;
            ctx.fillRect(0, 0, W, H);
        }

        /* Partículas con trail */
        ctx.shadowBlur = 8; /* FIX: set once outside the loop, not per particle */
        stars.forEach(s => {
            if (t < .45) {
                /* Expansión: salen del stage hacia afuera */
                s.x += s.vx; s.y += s.vy;
                s.vx *= .97; s.vy *= .97;
            } else {
                /* Colapso: espiralizan hacia el centro */
                const dx = cx - s.x, dy = cy - s.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const pull = .45 + (t - .45) * 1.2;
                s.vx += (dx / dist) * pull;
                s.vy += (dy / dist) * pull;
                s.vx *= .84; s.vy *= .84;
                s.x += s.vx; s.y += s.vy;
            }

            s.trail.push({ x: s.x, y: s.y });
            if (s.trail.length > 9) s.trail.shift();

            /* Trail luminoso */
            if (s.trail.length > 2) {
                ctx.beginPath();
                ctx.moveTo(s.trail[0].x, s.trail[0].y);
                s.trail.forEach(p => ctx.lineTo(p.x, p.y));
                ctx.strokeStyle = s.color;
                ctx.globalAlpha = .28 * peak;
                ctx.lineWidth = s.size * .6;
                ctx.stroke();
                ctx.globalAlpha = 1;
            }

            /* Partícula */
            const sz = s.size * (.6 + peak * .7);
            ctx.beginPath();
            ctx.arc(s.x, s.y, Math.max(.2, sz), 0, Math.PI * 2);
            ctx.fillStyle = s.color;
            ctx.shadowColor = s.color;
            ctx.globalAlpha = .9 * peak;
            ctx.fill();
            ctx.globalAlpha = 1;
        });
        ctx.shadowBlur = 0; /* FIX: reset once after loop */

        /* Switch del contenido al 45% de la animación (en el pico máximo de oscuridad) */
        if (!switched && t >= .45) {
            switched = true;
            callback();
        }

        frame++;
        if (frame < FRAMES) {
            requestAnimationFrame(draw);
        } else {
            ov.style.opacity = '0';
            setTimeout(() => { ov.remove(); confTransitioning = false; }, 350);
        }
    }

    requestAnimationFrame(() => {
        ov.style.opacity = '1';
        requestAnimationFrame(draw);
    });
}

/* ════════════════ SCREENS ════════════════ */
function showScreen(id, after) {
    const cur = document.querySelector('.screen.active');
    const go = () => {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const t = document.getElementById(id);
        if (t) { t.classList.add('active'); currentScreen = id; window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' }); }
        const inGame = ['phase1-screen', 'phase2-screen', 'phase3-screen', 'map-screen'].includes(id);
        showTopbar(id !== 'menu-screen');
        document.getElementById('hud-progress').style.display = inGame ? 'flex' : 'none';
        setBackgroundFor(id);
        updateHUD();
        if (after) after();
    };
    if (cur && !settings.reducedMotion) {
        cur.style.animation = 'fadeSlideOut .35s ease-in forwards';
        setTimeout(() => { cur.style.animation = ''; go(); }, 330);
    } else { if (cur) cur.style.animation = ''; go(); }
}
function simulateLoading(targetScreen, setup, message) {
    const loader = document.getElementById('loading-screen');
    const bar = document.getElementById('loading-bar'), msg = document.getElementById('loading-msg');
    if (settings.reducedMotion) { showScreen(targetScreen, setup); return; }
    loader.classList.add('active'); msg.textContent = message; bar.style.width = '0%';
    let p = 0;
    const iv = setInterval(() => {
        p += Math.random() * 22; if (p > 100) p = 100; bar.style.width = p + '%';
        if (p >= 100) { clearInterval(iv); setTimeout(() => { showScreen(targetScreen, setup); loader.classList.remove('active'); }, 280); }
    }, 90);
}

/* ════════════════ CONSTELLATION MAP (HUB) ════════════════ */
// ✦ Constelación de Cassiopeia (forma de W).
//    p1, p2, p3 son jugables; p4 y p5 quedan bloqueadas hasta que mejores el código.
//    Para agregar nuevas fases, añade más nodos aquí y desbloquéalos en isUnlocked().
const MAP_NODES = [
    { id: 'p1', x: 55, y: 10, label: 'I · El Alpha', sub: 'Acróstico estelar' },
    { id: 'p2', x: 28, y: 30, label: 'II · Desafíos', sub: 'Sistema planetario' },
    { id: 'p3', x: 60, y: 52, label: 'III · El Omega', sub: 'Supernova del corazón' },
    { id: 'p4', x: 28, y: 74, label: 'IV · ✦ Próximamente', sub: 'Bloqueada' },
    { id: 'p5', x: 60, y: 92, label: 'V · ✦ Próximamente', sub: 'Bloqueada' },
];
function isUnlocked(id) {
    // 🔒 Fases extra: cámbialo cuando agregues su lógica
    if (id === 'p4' || id === 'p5') return false;
    if (!save) return id === 'p1';
    if (id === 'p1') return true;
    if (id === 'p2') return save.phase1;
    if (id === 'p3') return save.phase2;
    return false;
}
function isCompleted(id) {
    if (!save) return false;
    if (id === 'p1') return save.phase1;
    if (id === 'p2') return save.phase2;
    if (id === 'p3') return save.phase3;
    return false;
}
function currentPhaseId() {
    if (!save) return 'p1';
    if (!save.phase1) return 'p1';
    if (!save.phase2) return 'p2';
    return 'p3';
}

function buildMap() {
    unlockAchievement('voyager');
    const wrap = document.getElementById('map-wrap');
    // remove old nodes
    wrap.querySelectorAll('.map-node,.map-mini,.bh-icon').forEach(n => n.remove());
    const svg = document.getElementById('map-svg');
    svg.innerHTML = '';
    // SVG: constellation lines
    const W = 620, H = 1000;
    const pos = id => { const n = MAP_NODES.find(m => m.id === id); return { x: n.x * W / 100, y: n.y * H / 100 }; };
    // Main lines
    const lines = [
        { from: 'p1', to: 'p2' },
        { from: 'p2', to: 'p3' },
        { from: 'p3', to: 'p4' },
        { from: 'p4', to: 'p5' },
    ];
    lines.forEach((ln, i) => {
        const a = pos(ln.from), b = pos(ln.to);
        const done = isCompleted(ln.from);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', a.x); line.setAttribute('y1', a.y);
        line.setAttribute('x2', b.x); line.setAttribute('y2', b.y);
        line.setAttribute('stroke', done ? 'rgba(212,165,116,.75)' : 'rgba(212,165,116,.18)');
        line.setAttribute('stroke-width', '1.6');
        line.setAttribute('stroke-dasharray', done ? '0' : '4 6');
        if (done && !settings.reducedMotion) {
            const len = Math.hypot(b.x - a.x, b.y - a.y);
            line.style.setProperty('--len', len);
            line.setAttribute('stroke-dasharray', len);
            line.style.strokeDashoffset = len;
            line.style.animation = `drawLine 1.4s ${.2 * i}s ease forwards`;
        }
        svg.appendChild(line);
    });

    // Subsidiary mini stars around nodes (acrostic letters around p1, planets around p2, hearts around p3)
    const minis = [];
    // around p1: 7 small stars in arc
    const p1c = pos('p1');
    for (let i = 0; i < 7; i++) {
        const ang = 0 + (i - 3) * 0.32; // arc opening to the right
        const rx = 70, ry = 90;
        const x = p1c.x + Math.cos(ang) * rx + 20;
        const y = p1c.y + Math.sin(ang) * ry;
        minis.push({ x, y, on: save && save.solvedLetters[i] });
        // line from p1
        const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        l.setAttribute('x1', p1c.x); l.setAttribute('y1', p1c.y);
        l.setAttribute('x2', x); l.setAttribute('y2', y);
        l.setAttribute('stroke', (save && save.solvedLetters[i]) ? 'rgba(139,180,208,.55)' : 'rgba(139,180,208,.12)');
        l.setAttribute('stroke-width', '.8');
        svg.appendChild(l);
    }
    // around p2: 4 planets
    const p2c = pos('p2');
    for (let i = 0; i < 4; i++) {
        const ang = Math.PI / 2 + (i * Math.PI / 3); // arc opening downward-left
        const x = p2c.x + Math.cos(ang) * 60 - 20;
        const y = p2c.y + Math.sin(ang) * 90;
        minis.push({ x, y, on: save && save.uploaded && save.uploaded[i], planet: true, color: ['#d4b88a', '#8bb4d0', '#d4a0b0', '#a0d4a0'][i] });
        const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        l.setAttribute('x1', p2c.x); l.setAttribute('y1', p2c.y);
        l.setAttribute('x2', x); l.setAttribute('y2', y);
        l.setAttribute('stroke', (save && save.uploaded && save.uploaded[i]) ? 'rgba(212,184,138,.55)' : 'rgba(212,184,138,.12)');
        l.setAttribute('stroke-width', '.8');
        l.setAttribute('stroke-dasharray', '3 6');
        svg.appendChild(l);
    }
    // Render minis as DOM dots (so we can color them more easily)
    minis.forEach(m => {
        const d = document.createElement('div');
        d.className = 'map-mini' + (m.on ? ' on' : '');
        if (m.planet) { d.style.background = m.on ? `radial-gradient(circle at 30% 30%, #fff, ${m.color})` : '#3a3a4e'; if (m.on) d.style.boxShadow = `0 0 12px ${m.color}99`; }
        d.style.left = (m.x / W * 100) + '%';
        d.style.top = (m.y / H * 100) + '%';
        wrap.appendChild(d);
    });

    // Big nodes
    MAP_NODES.forEach(n => {
        const node = document.createElement('div');
        const unlocked = isUnlocked(n.id), done = isCompleted(n.id), cur = currentPhaseId() === n.id;
        node.className = 'map-node' + (!unlocked ? ' locked' : '') + (done ? ' completed' : '') + (cur && unlocked && !done ? ' current' : '');
        node.style.left = n.x + '%';
        node.style.top = n.y + '%';
        node.innerHTML = `<div class="map-star">${done ? '✓' : n.id.toUpperCase().replace('P', '')}</div>
      ${unlocked && !done ? '<div class="map-orbit"></div>' : ''}
      <div class="lbl">${n.label}</div><div class="sub">${n.sub}</div>`;
        if (unlocked) {
            node.addEventListener('click', () => {
                sfxClick();
                if (n.id === 'p1') enterPhase(1);
                else if (n.id === 'p2') enterPhase(2);
                else enterPhase(3);
            });
        } else {
            node.addEventListener('click', () => showToast('🔒 Completa la fase anterior para desbloquearla'));
        }
        wrap.appendChild(node);
    });

    // Black hole singularity in corner
    const bh = document.createElement('div');
    bh.className = 'bh-icon';
    bh.style.left = '90%'; bh.style.top = '5%';
    bh.title = 'Agujero negro - singularidad cósmica';
    wrap.appendChild(bh);
}

function enterPhase(p) {
    if (!save) { save = freshSave(); persist(); unlockAchievement('start'); }
    const launch = () => blackHoleTransition(() => {
        if (p === 1) simulateLoading('phase1-screen', () => { buildPhase1(true); updatePhaseIndicators(1); }, 'INICIALIZANDO MEMORIAS...');
        else if (p === 2) simulateLoading('phase2-screen', () => { buildPhase2(true); updatePhaseIndicators(2); }, 'CALIBRANDO ECUACIONES...');
        else simulateLoading('phase3-screen', () => { buildPhase3(); updatePhaseIndicators(3); startConfession(); }, 'SINTONIZANDO ÚLTIMA FRECUENCIA...');
    });
    if (p === 3) { requestPhase3Access(launch); return; }
    launch();
}

/* ════════════════ PHASE 3 GATE (secret key) ════════════════ */
// 🔑 Yefferson: cambia esta clave por la que solo tú y Fabiola sepan.
//    Se compara sin distinguir mayúsculas/minúsculas ni espacios al borde.
const PHASE3_KEY = "Kira";
let _gatePending = null;
let _gateAttempts = 0;
function requestPhase3Access(onSuccess) {
    // Siempre pedir la clave, incluso si ya fue desbloqueada antes.
    _gatePending = onSuccess;
    _gateAttempts = 0;
    const ov = document.getElementById('gate-overlay');
    const inp = document.getElementById('gate-input');
    const msg = document.getElementById('gate-msg');
    const card = ov.querySelector('.gate-card');
    inp.value = ''; inp.classList.remove('wrong'); card.classList.remove('shake');
    msg.textContent = ''; msg.className = 'gate-msg';
    ov.classList.add('active'); ov.classList.remove('flash-err');
    setTimeout(() => inp.focus(), 280);
}
function closeGate() {
    sfxClick();
    document.getElementById('gate-overlay').classList.remove('active');
    _gatePending = null;
}
function submitGate() {
    const ov = document.getElementById('gate-overlay');
    const inp = document.getElementById('gate-input');
    const msg = document.getElementById('gate-msg');
    const card = ov.querySelector('.gate-card');
    const val = (inp.value || '').trim().toLowerCase();
    const fail = (text) => {
        sfxClick();
        inp.classList.add('wrong');
        card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
        ov.classList.remove('flash-err'); void ov.offsetWidth; ov.classList.add('flash-err');
        msg.textContent = text;
        msg.className = 'gate-msg err';
        inp.select();
        setTimeout(() => { inp.classList.remove('wrong'); card.classList.remove('shake'); ov.classList.remove('flash-err'); }, 600);
    };
    if (!val) { fail('✗ Ingresa la clave para continuar.'); return; }
    if (val === PHASE3_KEY.trim().toLowerCase()) {
        sfxBig();
        msg.textContent = '✦ Clave correcta. Cruzando el horizonte de eventos...';
        msg.className = 'gate-msg ok';
        if (save) { save.phase3Unlocked = true; persist(); }
        const cb = _gatePending; _gatePending = null;
        setTimeout(() => {
            ov.classList.remove('active');
            if (cb) cb();
        }, 700);
    } else {
        _gateAttempts++;
        const hints = [
            '✗ Clave incorrecta. Inténtalo otra vez.',
            '✗ Aún no. Esa palabra no abre la singularidad.',
            '✗ Las estrellas no la reconocen. Pregúntale a Yefferson.',
            '✗ La singularidad sigue sellada. Vuelve a intentarlo.'
        ];
        fail(hints[Math.min(_gateAttempts - 1, hints.length - 1)]);
    }
}
// Enter para enviar, Escape para cerrar
document.addEventListener('keydown', (e) => {
    const ov = document.getElementById('gate-overlay');
    if (!ov || !ov.classList.contains('active')) return;
    if (e.key === 'Enter') { e.preventDefault(); submitGate(); }
    else if (e.key === 'Escape') { e.preventDefault(); closeGate(); }
});

/* ════════════════ GAME FLOW ════════════════ */
function newGame() {
    ensureAudio(); sfxClick();
    save = freshSave(); persist();
    unlockAchievement('start');
    const r = document.getElementById('btn-new').getBoundingClientRect();
    createSparkle(r.left + r.width / 2, r.top + r.height / 2, 14);
    blackHoleTransition(() => {
        showScreen('map-screen', buildMap);
        setTimeout(() => showToast('✦ Tu mapa estelar te espera. Toca la primera estrella.'), 700);
    });
}
function continueGame() {
    ensureAudio(); sfxClick();
    if (!save) { newGame(); return; }
    showScreen('map-screen', buildMap);
}
function goToPhase2() {
    if (!save || !save.phase1) return;
    sfxClick(); save.phase = 2; persist();
    supernovaBurst();
    setTimeout(() => {
        blackHoleTransition(() => {
            simulateLoading('phase2-screen', () => { buildPhase2(); updatePhaseIndicators(2); setTimeout(() => showToast('✦ Fase II: Conquista los cuatro planetas'), 500); }, 'CALIBRANDO ECUACIONES DE ESTADO...');
        });
    }, 900);
}
function goToPhase3() {
    if (!save || !save.phase2) return;
    sfxClick();
    requestPhase3Access(() => {
        save.phase = 3; persist();
        unlockAchievement('mind');
        supernovaBurst();
        setTimeout(() => {
            blackHoleTransition(() => {
                simulateLoading('phase3-screen', () => { buildPhase3(); updatePhaseIndicators(3); startConfession(); setTimeout(() => showToast('✦ Fase III: La Verdad te espera...'), 500); }, 'SINTONIZANDO ÚLTIMA FRECUENCIA...');
            });
        }, 900);
    });
}
function finishGame() { sfxClick(); showScreen('menu-screen'); refreshMenu(); }
function goHome() {
    sfxClick();
    if (['phase1-screen', 'phase2-screen', 'phase3-screen', 'map-screen'].includes(currentScreen)) {
        showToast('Tu progreso queda guardado ✦');
    }
    showScreen('menu-screen'); refreshMenu();
}
function refreshMenu() {
    document.getElementById('btn-continue').style.display = hasProgress() ? 'inline-block' : 'none';
    document.getElementById('btn-new').textContent = hasProgress() ? 'NUEVA PARTIDA ✦' : 'COMENZAR ✦';
}

function updatePhaseIndicators(active) {
    document.querySelectorAll('#' + currentScreen + ' .phase-dot').forEach((d, i) => {
        d.classList.remove('completed', 'active');
        if (i + 1 < active) d.classList.add('completed');
        if (i + 1 === active) d.classList.add('active');
    });
    document.querySelectorAll('#' + currentScreen + ' .phase-line').forEach((l, i) => {
        l.classList.toggle('done', i + 1 < active);
    });
}

/* ════════════════ PHASE 1 — ACROSTIC + MINI CONSTELLATION ════════════════ */
const acrosticData = [
    { letter: 'F', clue: '«________ compañera de teoremas, pasillos y de la vida diaria.» — La primera palabra del poema que te escribí.', answer: 'fascinante', hint: 'Empieza con F, sinónimo de cautivadora...' },
    { letter: 'A', clue: '«________ queridísima, mi mejor compañía entre las leyes del universo y la vida.» — Así te llamé en el segundo verso.', answer: 'amiga', hint: 'Empieza con A, nuestro vínculo desde el principio...' },
    { letter: 'B', clue: '«________ que irradia en todo su ser, tan perfecta como una ecuación de unicidad.»', answer: 'belleza', hint: 'Empieza con B, algo que posees naturalmente...' },
    { letter: 'I', clue: '«________ deslumbrante que define y eleva el estándar de la excelencia absoluta.» — Una de tus cualidades más admiradas.', answer: 'inteligencia', hint: 'Empieza con I, tu mente es...' },
    { letter: 'O', clue: '«________ inmenso siento por ti, mi referente y apoyo inquebrantable.» — Lo que me inspiras.', answer: 'orgullo', hint: 'Empieza con O, un sentimiento de admiración profunda...' },
    { letter: 'L', clue: '«________ genuina que ilumina mis días, reduciendo a cero cualquier entropía.» — Eres esto para mí.', answer: 'luz', hint: 'Empieza con L, lo que ilumina la oscuridad...' },
    { letter: 'A', clue: '«________ mente brillante, la estrella más destacada de nuestro cosmos.» — La última palabra del acróstico.', answer: 'autentica', hint: 'Empieza con A, sinónimo de genuina y verdadera...' },
];
function p1Count() { return save.solvedLetters.filter(Boolean).length; }
function buildP1Constellation() {
    const c = document.getElementById('p1-constellation'); c.innerHTML = '';
    const W = 280, H = 60;
    // Horizontal path: left -> right, with subtle vertical wiggle
    const pts = acrosticData.map((_, i) => ({ x: 20 + i * 40, y: 30 + Math.sin(i * 1.1) * 16 }));
    const svgNs = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNs, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    for (let i = 0; i < pts.length - 1; i++) {
        const l = document.createElementNS(svgNs, 'line');
        l.setAttribute('x1', pts[i].x); l.setAttribute('y1', pts[i].y);
        l.setAttribute('x2', pts[i + 1].x); l.setAttribute('y2', pts[i + 1].y);
        l.setAttribute('class', 'cline' + (save && save.solvedLetters[i] && save.solvedLetters[i + 1] ? ' on' : ''));
        svg.appendChild(l);
    }
    pts.forEach((p, i) => {
        const c2 = document.createElementNS(svgNs, 'circle');
        c2.setAttribute('cx', p.x); c2.setAttribute('cy', p.y); c2.setAttribute('r', 3);
        c2.setAttribute('class', 'cdot' + (save && save.solvedLetters[i] ? ' on' : ''));
        svg.appendChild(c2);
    });
    c.appendChild(svg);
}

function buildPhase1(restore) {
    const c = document.getElementById('acrostic-container'); c.innerHTML = '';
    const b = document.getElementById('btn-to-phase2'); b.classList.add('locked'); b.disabled = true; b.classList.remove('phase-nav');
    document.getElementById('unlock-msg-p1').classList.remove('show');
    buildP1Constellation();
    acrosticData.forEach((item, i) => {
        const solved = save && save.solvedLetters[i];
        const row = document.createElement('div'); row.className = 'acrostic-row' + (solved ? ' solved-row' : ''); row.id = `acrostic-row-${i}`;
        row.innerHTML = `<span class="acrostic-letter${solved ? ' solved' : ''}" id="letter-${i}">${item.letter}</span>
      <span class="acrostic-clue">${item.clue}</span>
      <div style="display:flex;flex-direction:column;align-items:center;">
        <input type="text" class="acrostic-input${solved ? ' correct' : ''}" id="acrostic-input-${i}" placeholder="Escribe tu respuesta..." autocomplete="off" value="${solved ? item.answer : ''}">
        <button class="hint-btn" data-i="${i}">¿Necesitas una pista?</button>
        <p class="hint-text" id="hint-${i}">${item.hint}</p>
      </div>`;
        c.appendChild(row);
        if (!settings.reducedMotion) setTimeout(() => row.classList.add('visible'), 120 + i * 100); else row.classList.add('visible');
        const inp = row.querySelector('input');
        inp.addEventListener('input', () => checkAcrostic(i, inp));
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') checkAcrostic(i, inp); });
        row.querySelector('.hint-btn').addEventListener('click', e => { document.getElementById('hint-' + i).classList.add('show'); e.target.style.display = 'none'; });
    });
    updateP1Progress(restore);
}
function updateP1Progress(restore) {
    const n = p1Count();
    document.getElementById('progress-p1').textContent = n === 7 ? '✨ 7 de 7 — ¡Constelación completa!' : `${n} de 7 estrellas encendidas`;
    if (restore && save.phase1) completePhase1(true);
}
function checkAcrostic(i, inp) {
    const ans = inp.value.trim().toLowerCase(), corr = acrosticData[i].answer.toLowerCase();
    const hint = document.getElementById('hint-' + i), lett = document.getElementById('letter-' + i), row = document.getElementById('acrostic-row-' + i);
    if (!ans) { inp.classList.remove('correct', 'wrong'); return; }
    if (ans === corr) {
        inp.classList.add('correct'); inp.classList.remove('wrong'); hint.classList.remove('show');
        lett.classList.add('solved'); row.classList.add('solved-row');
        if (!save.solvedLetters[i]) {
            save.solvedLetters[i] = true; persist(); sfxSuccess();
            const n = p1Count();
            document.getElementById('progress-p1').textContent = `${n} de 7 estrellas encendidas`;
            createSparkle(inp.getBoundingClientRect().left + 95, inp.getBoundingClientRect().top, 6);
            buildP1Constellation();
            if (n === 7) completePhase1();
            else if (n >= 3) showToast(`✨ ${n} de 7... la constelación toma forma`);
        }
    } else if (ans.length > 2) {
        inp.classList.add('wrong');
        // ✦ Solo contar un error por palabra (no por cada tecla)
        if (!inp.dataset.errored) { save.p1Errors++; inp.dataset.errored = '1'; persist(); }
        setTimeout(() => inp.classList.remove('wrong'), 450);
    } else {
        inp.classList.remove('wrong');
    }
}
function completePhase1(restore) {
    if (!save.phase1) {
        save.phase1 = true; if (save.phase < 2) save.phase = 2; persist();
        unlockAchievement('words');
        if (save.p1Errors === 0) unlockAchievement('noHint');
        if (!restore) { sfxBig(); supernovaBurst(); showToast('🌟 ¡Fase I completada! Tu constelación brilla.'); }
    }
    document.getElementById('progress-p1').textContent = '✨ 7 de 7 — ¡Constelación completa!';
    const msg = document.getElementById('unlock-msg-p1');
    msg.textContent = 'Has reconstruido el acróstico. Cada letra es una estrella en tu cielo. La Fase II te espera...';
    msg.classList.add('show');
    const b = document.getElementById('btn-to-phase2'); b.classList.remove('locked'); b.disabled = false; b.classList.add('phase-nav');
    if (!restore) {
        createSparkle(window.innerWidth / 2, window.innerHeight * 0.7, 18);
        // ✦ Auto-avance en 10s (cancelable si el usuario hace click en el botón)
        startPhaseAutoAdvance(b, 10, 'CONTINUAR A FASE II', () => { if (currentScreen === 'phase1-screen') goToPhase2(); });
    }
}

/* ════════════════ PHASE 2 — PROBLEMS AS PLANETS ════════════════ */
const problems = [
{
    title: 'Problema 1 · Electromagnetismo',
    planet: '🪐',
    color: '#d4b88a',
    topic: 'Ley de Gauss con dieléctricos | Capacitancia | Energía',
    text: `Un capacitor esférico está formado por dos conductores concéntricos de radios a y c (a < c). La región entre las esferas se llena con dos dieléctricos lineales, homogéneos e isotrópicos: ε₁ desde r=a hasta r=b y ε₂ desde r=b hasta r=c. La esfera interna posee carga +Q y la externa carga −Q.

(a) Determine D⃗, E⃗ y P⃗ en r<a, a<r<b, b<r<c y r>c.
(b) Calcule la diferencia de potencial y la capacitancia equivalente.
(c) Determine la energía electrostática total almacenada.
(d) Verifique el resultado mediante W = Q²/(2C).
(e) Analice los límites b→a y b→c.`
},
{
    title: 'Problema 2 · Mecánica Clásica',
    planet: '🌍',
    color: '#8bb4d0',
    topic: 'Fuerzas centrales | Órbitas | Precesión',
    text: `Una partícula de masa m se mueve bajo la fuerza central

F(r) = -k/r² + α/r³, donde k>0 y |α|≪ k.

(a) Utilizando u=1/r y la ecuación de Binet, demuestre que d²u/dθ² + u = (mk/L²) − (mα/L²)u.
(b) Para α=0, demuestre que las órbitas son secciones cónicas.
(c) Para α≠0, determine la precesión angular Δθ por revolución.
(d) Obtenga la condición para órbitas circulares estables.
(e) Discuta la relación con la precesión del perihelio. Analice por qué la identificación α = 3GMm/c² es dimensionalmente incorrecta y compare este modelo con la corrección relativista efectiva.`
},
{
    title: 'Problema 3 · Análisis Complejo',
    planet: '🌑',
    color: '#d4a0b0',
    topic: 'Teorema de los Residuos | Cortes de rama',
    text: `Evalúe

I(a)=∫₀^∞ ln(x)/(x²+a²)² dx,   a>0.

(a) Seleccione y justifique un contorno adecuado para resolver la integral mediante análisis complejo. Discuta las ventajas y limitaciones de los contornos semicircular y keyhole.
(b) Identifique y clasifique las singularidades de la función integranda y calcule los residuos necesarios.
(c) Aplique el Teorema de los Residuos.
(d) Demuestre que las contribuciones de los arcos relevantes desaparecen en el límite correspondiente.
(e) Obtenga I(a) y verifique dimensionalmente el resultado.`
},
{
    title: 'Problema 4 · Cálculo Vectorial & Magnetismo',
    planet: '🌕',
    color: '#a0d4a0',
    topic: 'Biot-Savart | Ampère | Stokes',
    text: `Considere un solenoide toroidal de sección rectangular con N vueltas, radios ρ₁<ρ₂, altura h y corriente I.

(a) Utilizando la ley de Ampère, determine B⃗ en las regiones ρ<ρ₁, ρ₁<ρ<ρ₂ y ρ>ρ₂.
(b) Calcule el flujo magnético total y la autoinductancia L.
(c) Verifique el resultado para B⃗ mediante la ley de Biot-Savart en ρ=(ρ₁+ρ₂)/2.
(d) Si I(t)=I₀cos(ωt), determine la fem inducida en una espira secundaria que enlaza completamente el flujo magnético del toroide.
(e) Verifique la consistencia de los resultados mediante el teorema de Stokes.`
}
];
function buildPhase2(restore) {
    const c = document.getElementById('problems-container'); c.innerHTML = '';
    if (!save.uploaded) save.uploaded = new Array(4).fill(false);
    const b = document.getElementById('btn-to-phase3'); b.classList.add('locked'); b.disabled = true; b.classList.remove('phase-nav');
    problems.forEach((p, i) => {
        const up = !!save.uploaded[i];
        const card = document.createElement('div'); card.className = 'problem-card' + (up ? ' card-uploaded' : ''); card.id = `problem-card-${i}`;
        card.innerHTML = `
      <div class="planet-orb" style="background:radial-gradient(circle at 35% 30%, #fff, ${p.color} 50%, #2a1a10);">${p.planet}</div>
      <h3>${p.title}</h3><p class="problem-topic">📚 ${p.topic}</p><div class="problem-text">${p.text}</div>
      <div class="upload-area">
        <input type="file" id="file-input-${i}" accept="image/*">
        <label for="file-input-${i}" class="file-label${up ? ' has-file' : ''}" id="file-label-${i}">📎 ${up ? 'Imagen subida ✓' : 'Seleccionar imagen'}</label>
        <span class="upload-status${up ? ' success' : ''}" id="upload-status-${i}">${up ? '✓ Listo' : ''}</span>
        <img class="upload-preview" id="upload-preview-${i}" alt="Vista previa">
      </div>`;
        c.appendChild(card);
        card.querySelector('input').addEventListener('change', e => handleFile(i, e.target));
    });
    updateP2Progress(restore);
}
// ─── URL del Google Apps Script desplegado como Web App ───────────────────────
// Reemplaza este valor con la URL que obtienes al hacer Deploy en Apps Script.
// Guía: script.google.com → Nuevo proyecto → pega el código → Implementar →
//       Web App → "Ejecutar como: Yo" · "Quién puede acceder: Cualquier persona"
const DRIVE_UPLOAD_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwqjrntt-Mn7EjWDQZwulr5TZcM2FQKbjAoVa4UPi6gXfwOwfzhLdFlBKoe_vWN5g8HiQ/exec';
// ──────────────────────────────────────────────────────────────────────────────

async function handleFile(i, inp) {
    const f    = inp.files[0];
    const lab  = document.getElementById('file-label-' + i);
    const st   = document.getElementById('upload-status-' + i);
    const prv  = document.getElementById('upload-preview-' + i);
    const card = document.getElementById('problem-card-' + i);

    // Archivo deseleccionado → resetear
    if (!f) {
        lab.classList.remove('has-file', 'uploading');
        lab.textContent = '📎 Seleccionar imagen';
        st.textContent  = '';
        st.className    = 'upload-status';
        prv.classList.remove('show');
        card.classList.remove('card-uploaded');
        save.uploaded[i] = false; persist(); updateP2Progress();
        return;
    }

    // Validación básica de tipo
    if (!f.type.startsWith('image/')) {
        showToast('⚠ Solo se aceptan imágenes.');
        inp.value = '';
        return;
    }

    // Vista previa local inmediata (no espera a que suba)
    const reader = new FileReader();
    reader.onload = e => { prv.src = e.target.result; prv.classList.add('show'); };
    reader.readAsDataURL(f);

    // Estado: subiendo
    lab.classList.add('has-file', 'uploading');
    lab.textContent = '⏳ Subiendo…';
    st.textContent  = 'Transmitiendo al cosmos…';
    st.className    = 'upload-status uploading';
    card.classList.remove('card-uploaded');

    try {
        if (!DRIVE_UPLOAD_ENDPOINT || DRIVE_UPLOAD_ENDPOINT.includes('PEGA_AQUI')) {
            throw new Error('Configura DRIVE_UPLOAD_ENDPOINT en script.js');
        }

        // Comprimir imagen antes de enviar (máx 1200 px, 78 % calidad)
        const dataUrl = await compressImageFile(f, 1200, 0.78);

        const problemTitle = (typeof problems !== 'undefined' && problems[i])
            ? problems[i].title
            : `Problema ${i + 1}`;

        // POST al Apps Script con mode:'no-cors' (el script recibe igual;
        // no podemos leer la respuesta pero la imagen sí llega a Drive).
        await fetch(DRIVE_UPLOAD_ENDPOINT, {
            method:  'POST',
            mode:    'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
                image:        dataUrl,
                fileName:     `Problema_${i + 1}_${Date.now()}.jpg`,
                problemIndex: i,
                problemTitle,
            }),
        });

        // Estado: éxito
        const shortName = f.name.length > 24 ? f.name.substring(0, 24) + '…' : f.name;
        lab.classList.remove('uploading');
        lab.textContent = '📎 ' + shortName;
        st.textContent  = '✓ Enviada al cosmos';
        st.className    = 'upload-status success';
        card.classList.add('card-uploaded');
        save.uploaded[i] = true; persist(); sfxSuccess();
        try { const r = lab.getBoundingClientRect(); createSparkle(r.left + r.width / 2, r.top, 5); } catch (_) {}
        updateP2Progress();

    } catch (err) {
        console.error('[Fase II] Error al subir imagen:', err);
        lab.classList.remove('has-file', 'uploading');
        lab.textContent = '⚠ Error — toca para reintentar';
        st.textContent  = 'Falló la transmisión';
        st.className    = 'upload-status error';
        prv.classList.remove('show');
        card.classList.remove('card-uploaded');
        save.uploaded[i] = false; persist(); updateP2Progress();
        showToast('❌ Error al subir. Verifica tu conexión.');
    }
}
function updateP2Progress(restore) {
    const cnt = save.uploaded.filter(Boolean).length;
    document.getElementById('upload-count-p2').textContent = `${cnt} de 4 planetas conquistados`;
    if (cnt >= 4) {
        const b = document.getElementById('btn-to-phase3'); b.classList.remove('locked'); b.disabled = false; b.classList.add('phase-nav');
        if (!save.phase2) {
            save.phase2 = true; if (save.phase < 3) save.phase = 3; persist();
            if (!restore) {
                createSparkle(window.innerWidth / 2, window.innerHeight * 0.75, 18); sfxBig(); supernovaBurst();
                showToast('🌟 ¡Los 4 planetas son tuyos! La Fase III te aguarda.');
            }
        }
    }
}

/* ════════════════ PHASE 3 — CONFESSION ════════════════ */
const confessionStages = [
    {
        type: 'poem', title: 'Poema I — Acróstico', content: `Fascinante compañera de teoremas, pasillos y de la vida diaria.
Amiga queridísima, mi mejor compañía entre las leyes del universo y la vida.
Belleza que irradia en todo su ser, tan perfecta como una ecuación de unicidad.
Inteligencia deslumbrante que define y eleva el estándar de la excelencia absoluta.
Orgullo inmenso siento por ti, mi referente y apoyo inquebrantable.
Luz genuina que ilumina mis días, reduciendo a cero cualquier entropía.
Auténtica mente brillante, la estrella más destacada de nuestro cosmos.`},
    {
        type: 'poem', title: 'Poema II — Para el Descanso', content: `Que la inercia del cuerpo encuentre su pausa,
y la entropía de tu mente se rinda a la sombra.
Cierra los ojos y suelta la causa;
el descanso es la ley que la noche te nombra
y en susurros te exige: "Reposa, Brillante Fabiola.
Has ocupado el desorden estando en la luz,
y ahora ocuparé tu dolor y cansancio en la penumbra
ofreciendo un cobijo nocturno."`},
    {
        type: 'flashback', title: '✨ Algo que dijiste una vez...', content: `"Actualmente, ¿te soy sincera? Quiero a alguien que me ame tanto
que esté dispuesto a consagrar una vida conmigo, que yo sea su vida
y él sea la mía, que si me muero no busque otra pareja,
que me lleve para siempre en su alma, que nuestras tumbas
estén lado a lado.

Para mí, como dijo Nietzsche, el amor va más allá del bien y del mal."`},
    {
        type: 'poem', title: 'Poema III — Tu Intelecto', content: `Hay un arcano influjo en tu numen,
que avasalla el abismo con regio ademán.
No es azar, Fabiola, es tu inefable lumen,
que domeña el empíreo cual firme guardián.

Tu ahínco gravita en la bóveda arcana,
donde el éter silente a los astros asombra.
Tus lauros refulgen con lumbre soberana,
y ante tu intelecto claudica la sombra.`},
    { type: 'confession' },
];

function buildPhase3() {
    const c = document.getElementById('confession-stages'); c.innerHTML = '';
    document.getElementById('btn-finish').style.display = 'none';

    confessionStages.forEach((s, i) => {
        const d = document.createElement('div');
        d.className = 'confession-stage'; d.id = `conf-stage-${i}`;

        if (s.type === 'confession') {
            /* ── Escena final de confesión ── */
            d.innerHTML = `
              <div class="celestial-body">
                <div class="cb-halo"></div>
                <div class="cb-ring thin"></div>
                <div class="cb-ring"></div>
                <div class="cb-planet"></div>
                <div class="cb-moon"></div>
              </div>
              <p style="font-size:1.05rem;color:var(--text);line-height:1.9;text-align:center;">
                Este proyecto está inspirado para que puedas conocer una verdad, una verdad que llegó hacia ti de una manera <em>"Inusual"</em>.<br>
                La importancia que tienes en mi vida no es ínfima. Cada pensamiento, cada acción, cada momento que compartimos es especial para mí.
              </p>
              <div class="confession-final">
                Фабиола,<br><br><span style="font-size:1.5rem;">✦</span><br>
                No es una ecuación por resolver ni un teorema por demostrar.<br>
                Es la constante que da sentido a todas las variables de mi vida.<br>
                La luz que reduce mi entropía a cero.<br>
              </div>

              <!-- ══ PROPUESTAS DE ENTREGA ══ -->
              <div class="delivery-section">
                <p class="delivery-label">✦ Descarga el archivo y veras camino. ✦</p>
                <p class="delivery-sub">Descarga la carta completa como PDF — imprímela, guárdala o compártela como prefieras.</p>
                <div class="delivery-cards">
                  <div class="delivery-card" onclick="selectDelivery(this,'imprimir')">
                    <div class="dc-icon">🖨️</div>
                    <div class="dc-title">Carta Impresa</div>
                    <div class="dc-desc">Imprímela y entrégala en mano. Algo real, tangible, que puedas guardar.</div>
                  </div>
                  <div class="delivery-card" onclick="selectDelivery(this,'digital')">
                    <div class="dc-icon">📱</div>
                    <div class="dc-title">Mensaje Digital</div>
                    <div class="dc-desc">Envía el PDF por correo o mensajería. La distancia no detiene las estrellas.</div>
                  </div>
                  <div class="delivery-card" onclick="selectDelivery(this,'juntos')">
                    <div class="dc-icon">🌌</div>
                    <div class="dc-title">Leerla Juntos</div>
                    <div class="dc-desc">Abre el PDF juntos, en el momento que el universo elija. Sin prisa.</div>
                  </div>
                  <div class="delivery-card" onclick="selectDelivery(this,'guardar')">
                    <div class="dc-icon">✨</div>
                    <div class="dc-title">Guardar el Sentimiento</div>
                    <div class="dc-desc">Guárdala por ahora.</div>
                  </div>
                </div>
                <button class="btn confession-pdf-btn" id="btn-download-confession" onclick="downloadConfessionPDF()">
                  ✦ Descargar Carta (PDF) ✦
                </button>
                <div id="pdf-feedback" style="font-size:.85rem;color:var(--gold);margin-top:.6rem;min-height:1.2em;text-align:center;"></div>
              </div>`;

                } else if (s.type === 'poem') {
            /* ── Poema + caja de reflexión ── */
            const saved = save?.poemResponses?.[i] || '';
            const sent = !!saved;
            const safeTitle = s.title.replace(/'/g, "\\'");
            d.innerHTML = `
              <h3 style="color:var(--gold);letter-spacing:.1em;font-weight:normal;margin-bottom:.8rem;font-size:1.05rem;">${s.title}</h3>
              <div class="poem-display">${s.content}</div>
              <div class="poem-response-wrap">
                <p class="poem-response-label">✦ ¿Cómo te hizo sentir este poema?</p>
                <textarea id="poem-response-${i}" class="poem-response-area"
                  placeholder="Escribe tu reflexión aquí…" maxlength="600"
                  ${sent ? 'disabled' : ''}>${saved}</textarea>
                <div class="poem-response-footer">
                  <span class="poem-char-count" id="poem-chars-${i}">${saved.length}/600</span>
                  <button id="poem-submit-${i}" class="btn small poem-submit-btn"
                    onclick="submitPoemResponse(${i}, '${safeTitle}')"
                    ${sent ? `disabled style="border-color:var(--success);color:var(--success)"` : ''}>
                    ${sent ? '✦ TRANSMITIDO' : 'ENVIAR AL COSMOS ✦'}
                  </button>
                </div>
                <div id="poem-status-${i}" class="poem-response-status" style="${sent ? 'color:var(--success)' : ''}">
                  ${sent ? '✓ Tu reflexión viaja entre las estrellas' : ''}
                </div>
              </div>`;

            /* Contador de caracteres (solo si no fue enviado aún) */
            if (!sent) {
                setTimeout(() => {
                    const ta = document.getElementById(`poem-response-${i}`);
                    const cc = document.getElementById(`poem-chars-${i}`);
                    if (ta && cc) ta.addEventListener('input', () => { cc.textContent = `${ta.value.length}/600`; });
                }, 0);
            }

        } else {
            /* ── Flashback ── */
            d.innerHTML = `
              <h3 style="color:var(--gold);letter-spacing:.1em;font-weight:normal;margin-bottom:.8rem;font-size:1.05rem;">${s.title}</h3>
              <div class="flashback-quote">${s.content}</div>`;
        }

        c.appendChild(d);
    });
}

let confIdx = 0;

function startConfession() {
    confIdx = 0;
    document.querySelectorAll('.confession-stage').forEach(s => s.classList.remove('active'));
    document.getElementById('conf-nav').style.display = 'flex';
    showConfStage(0);
}

function showConfStage(idx) {
    const stages = document.querySelectorAll('.confession-stage');
    stages.forEach(s => s.classList.remove('active'));
    stages[idx].classList.add('active');

    /* Scroll suave al stage */
    setTimeout(() => {
        stages[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);

    /* Chispas de entrada */
    const r = stages[idx].getBoundingClientRect();
    createSparkle(r.left + r.width / 2, r.top + 40, 12);

    /* Navegación */
    document.getElementById('btn-prev-stage').style.visibility = idx === 0 ? 'hidden' : 'visible';
    const next = document.getElementById('btn-next-stage');
    if (idx === stages.length - 1) {
        next.style.display = 'none';
        document.getElementById('conf-nav').style.display = 'none';
        document.getElementById('btn-finish').style.display = 'inline-block';
        if (!save.phase3) {
            save.phase3 = true; persist();
            unlockAchievement('destiny'); unlockAchievement('complete');
            sfxBig(); supernovaBurst();
            createSparkle(window.innerWidth / 2, window.innerHeight * 0.6, 26);
        }
    } else {
        next.style.display = 'inline-block';
    }
}

function confNext() {
    sfxClick();
    if (confTransitioning || confIdx >= confessionStages.length - 1) return;
    const next = confIdx + 1;
    nebulaDrift(confIdx, next, () => { confIdx = next; showConfStage(confIdx); });
}

function confPrev() {
    sfxClick();
    if (confTransitioning || confIdx <= 0) return;
    const prev = confIdx - 1;
    nebulaDrift(confIdx, prev, () => { confIdx = prev; showConfStage(confIdx); });
}

/* ════════════════ PROGRESS / SETTINGS RENDER ════════════════ */
function renderProgress() {
    const s = save || freshSave();
    const done = (s.phase1 ? 1 : 0) + (s.phase2 ? 1 : 0) + (s.phase3 ? 1 : 0);
    document.getElementById('st-phases').textContent = `${done} / 3`;
    document.getElementById('st-words').textContent = `${s.solvedLetters.filter(Boolean).length} / 7`;
    document.getElementById('st-problems').textContent = `${(s.uploaded || []).filter(Boolean).length} / 4`;
    document.getElementById('st-stars').textContent = `★ ${s.stars}`;
    document.getElementById('st-ach').textContent = `${s.achievements.length} / ${ACHIEVEMENTS.length}`;
    const list = document.getElementById('ach-list'); list.innerHTML = '';
    ACHIEVEMENTS.forEach(a => {
        const got = s.achievements.includes(a.id);
        const el = document.createElement('div'); el.className = 'ach' + (got ? ' unlocked' : '');
        el.innerHTML = `<div class="ico">${a.ico}</div><div class="meta"><div class="name">${a.name}</div><div class="desc">${a.desc}</div></div><div class="state">${got ? '✓' : '🔒'}</div>`;
        list.appendChild(el);
    });
}
function renderSettings() {
    document.querySelectorAll('#seg-quality button').forEach(b => b.classList.toggle('active', b.dataset.q === (settings.quality === 'auto' ? QUALITY : settings.quality)));
    document.getElementById('tg-sound').classList.toggle('on', settings.sound);
    document.getElementById('tg-motion').classList.toggle('on', settings.reducedMotion);
}
document.querySelectorAll('#seg-quality button').forEach(b => b.addEventListener('click', () => {
    settings.quality = b.dataset.q; QUALITY = resolveQuality(); saveSettings(); renderSettings(); startBg();
    showToast('Calidad: ' + ({ low: 'Baja', medium: 'Media', high: 'Alta' }[QUALITY]));
}));
document.getElementById('tg-sound').addEventListener('click', function () { settings.sound = !settings.sound; this.classList.toggle('on', settings.sound); saveSettings(); if (settings.sound) sfxClick(); });
document.getElementById('tg-motion').addEventListener('click', function () { settings.reducedMotion = !settings.reducedMotion; this.classList.toggle('on', settings.reducedMotion); saveSettings(); });

/* ════════════════ TOPBAR HANDLERS ════════════════ */
document.getElementById('btn-home').addEventListener('click', goHome);
document.getElementById('btn-map').addEventListener('click', () => { sfxClick(); if (!save) { save = freshSave(); persist(); } showScreen('map-screen', buildMap); });
document.getElementById('btn-settings').addEventListener('click', () => { sfxClick(); showScreen('settings-screen', renderSettings); });
document.getElementById('btn-mute').addEventListener('click', function () {
    settings.sound = !settings.sound; saveSettings(); this.textContent = settings.sound ? '🔊' : '🔇';
    document.getElementById('tg-sound').classList.toggle('on', settings.sound);
    // ✦ Música local
    const m = document.getElementById('bgMusic');
    if (m) { if (settings.sound) { m.play().catch(() => { }); } else { m.pause(); } }
});

/* ════════════════ SECRET KEY ════════════════ */
document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'K' || e.key === 'k')) {
        e.preventDefault();
        if (!save) { save = freshSave(); }
        if (currentScreen === 'phase1-screen') { save.solvedLetters.fill(true); save.phase1 = true; persist(); completePhase1(); /* No saltar la fase: dejar que el usuario use el botón / auto-avance */ }
        else if (currentScreen === 'phase2-screen') { save.uploaded.fill(true); save.phase2 = true; persist(); updateP2Progress(); /* Fase 3 SIEMPRE requiere la clave secreta — no se puede saltar */ }
        else { save.solvedLetters.fill(true); save.phase1 = true; save.uploaded.fill(true); save.phase2 = true; persist(); enterPhase(3); /* enterPhase(3) pide la clave */ }
    }
});

/* ════════════════ AUTO-ADVANCE (10s, cancelable con click) ════════════════ */
let _autoAdvIv = null;
function clearAutoAdvance() {
    if (_autoAdvIv) { clearInterval(_autoAdvIv); _autoAdvIv = null; }
}
function startPhaseAutoAdvance(btn, seconds, baseLabel, onDone) {
    clearAutoAdvance();
    let left = seconds;
    const render = () => { btn.innerHTML = baseLabel + ' → <span class="count-pill">(' + left + 's)</span>'; };
    render();
    const cancel = () => {
        clearAutoAdvance();
        btn.innerHTML = baseLabel + ' →';
        btn.removeEventListener('click', cancel);
    };
    btn.addEventListener('click', cancel);
    _autoAdvIv = setInterval(() => {
        left--;
        if (left <= 0) { cancel(); onDone && onDone(); return; }
        render();
    }, 1000);
}

/* ════════════════ GALERÍA v2 (upload / edit / delete) ════════════════ */
const GAL_KEY = 'fabiola_gallery_v2';
let _galEditing = false;
function loadGalleryStore() { try { return JSON.parse(localStorage.getItem(GAL_KEY)) || []; } catch (e) { return []; } }
function saveGalleryStore(list) { try { localStorage.setItem(GAL_KEY, JSON.stringify(list)); } catch (e) { showToast('No queda espacio local para guardar la imagen'); } }
function renderGallery() {
    const grid = document.getElementById('gallery-grid'); if (!grid) return;
    grid.classList.toggle('editing', _galEditing);
    const items = loadGalleryStore();
    grid.innerHTML = '';
    if (items.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'gal-empty';
        empty.innerHTML = '✦<br><br><strong>Tu galería está vacía</strong><br><span style="font-size:.85rem">Toca <em>SUBIR FOTOS</em> para guardar tus primeros recuerdos. Quedan en este dispositivo.</span>';
        grid.appendChild(empty);
        return;
    }
    items.forEach((it, i) => {
        const wrap = document.createElement('div'); wrap.className = 'gallery-item gal-item';
        const img = document.createElement('img'); img.src = it.src; img.alt = it.caption || 'Recuerdo'; img.loading = 'lazy';
        wrap.appendChild(img);
        if (it.caption) { const cap = document.createElement('div'); cap.className = 'gi-caption'; cap.textContent = it.caption; wrap.appendChild(cap); }
        const del = document.createElement('button'); del.className = 'gi-del'; del.type = 'button'; del.innerHTML = '✕';
        del.onclick = (e) => { e.stopPropagation(); if (confirm('¿Eliminar esta foto?')) { const list = loadGalleryStore(); list.splice(i, 1); saveGalleryStore(list); renderGallery(); } };
        wrap.appendChild(del);
        const edit = document.createElement('div'); edit.className = 'gal-caption-edit';
        const inp = document.createElement('input'); inp.type = 'text'; inp.maxLength = 80; inp.placeholder = 'Descripción…'; inp.value = it.caption || '';
        inp.onchange = () => { const list = loadGalleryStore(); if (list[i]) { list[i].caption = inp.value.trim(); saveGalleryStore(list); } };
        inp.onclick = (e) => e.stopPropagation();
        edit.appendChild(inp); wrap.appendChild(edit);
        wrap.addEventListener('click', () => { if (!_galEditing) openLightbox(it.src); });
        grid.appendChild(wrap);
    });
}
function toggleGalleryEdit() {
    _galEditing = !_galEditing;
    const btn = document.getElementById('gal-edit-btn'); if (btn) btn.textContent = _galEditing ? 'LISTO' : 'EDITAR';
    renderGallery();
}
function clearUploadedGallery() {
    if (!confirm('¿Borrar TODAS las fotos subidas?')) return;
    localStorage.removeItem(GAL_KEY); _galEditing = false;
    const btn = document.getElementById('gal-edit-btn'); if (btn) btn.textContent = 'EDITAR';
    renderGallery(); showToast('Galería vaciada');
}
function compressImageFile(file, maxSide = 1200, quality = 0.78) {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onerror = reject;
        r.onload = () => {
            const img = new Image();
            img.onload = () => {
                let { width: w, height: h } = img;
                if (w > maxSide || h > maxSide) {
                    if (w >= h) { h = Math.round(h * maxSide / w); w = maxSide; }
                    else { w = Math.round(w * maxSide / h); h = maxSide; }
                }
                const c = document.createElement('canvas'); c.width = w; c.height = h;
                c.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(c.toDataURL('image/jpeg', quality));
            };
            img.onerror = reject;
            img.src = r.result;
        };
        r.readAsDataURL(file);
    });
}
async function handleGalleryUpload(ev) {
    const files = [...(ev.target.files || [])]; if (!files.length) return;
    showToast('Procesando ' + files.length + ' imagen(es)…');
    const list = loadGalleryStore();
    let added = 0;
    for (const f of files) {
        if (!f.type.startsWith('image/')) continue;
        try {
            const dataUrl = await compressImageFile(f);
            list.push({ src: dataUrl, caption: '', ts: Date.now() });
            added++;
        } catch (e) { console.warn(e); }
    }
    saveGalleryStore(list);
    ev.target.value = '';
    renderGallery();
    showToast('✦ ' + added + ' foto(s) añadidas');
}
function openLightbox(src) {
    const lb = document.getElementById('gallery-lightbox');
    lb.querySelector('img').src = src;
    lb.classList.add('active');
}
function closeLightbox() { document.getElementById('gallery-lightbox').classList.remove('active'); }
// wire upload listener once DOM ready
document.addEventListener('DOMContentLoaded', () => {
    const up = document.getElementById('gal-upload'); if (up) up.addEventListener('change', handleGalleryUpload);
});



/* ════════════════ SCROLL HINT ════════════════ */
(function () {
    const el = document.getElementById('scroll-hint'); if (!el) return;
    el.addEventListener('click', () => { window.scrollBy({ top: window.innerHeight * 0.7, behavior: 'smooth' }); });
    function update() {
        const sh = document.documentElement.scrollHeight, ih = window.innerHeight, sy = window.scrollY || window.pageYOffset;
        const scrollable = sh > ih + 60;
        const nearBottom = sy + ih >= sh - 40;
        // Solo lo mostramos en pantallas de juego/galería/mapa, no en menú
        const okScreen = ['phase1-screen', 'phase2-screen', 'phase3-screen', 'map-screen', 'gallery-screen', 'progress-screen', 'settings-screen', 'credits-screen'].includes(currentScreen);
        el.classList.toggle('visible', okScreen && scrollable && !nearBottom);
    }
    // Throttle para no saturar móviles
    let _upT = null; const upd = () => { if (_upT) return; _upT = setTimeout(() => { _upT = null; update(); }, 180); };
    window.addEventListener('scroll', upd, { passive: true });
    window.addEventListener('resize', upd);
    try { new MutationObserver(upd).observe(document.body, { childList: true, subtree: true }); } catch (e) { }
    setInterval(update, 1200);
})();


/* ════════════════ CONSTELLATIONS DATA (real) ════════════════ */
const CONSTELLATION_DESC = {
    ursa_major: 'Osa Mayor — el carro celeste del hemisferio norte, guía de viajeros desde la antigüedad.',
    ursa_minor: 'Osa Menor — alberga a Polaris, la estrella que siempre apunta al norte.',
    orion: 'Orión — el cazador, con su cinturón de tres estrellas brillantes (Alnitak, Alnilam, Mintaka).',
    cassiopeia: 'Casiopea — la reina de Etiopía con forma de W coronando el cielo boreal.',
    cygnus: 'Cygnus — el cisne que vuela por la Vía Láctea, también llamado la Cruz del Norte.',
    lyra: 'Lyra — la lira de Orfeo, con la brillante Vega como joya central.',
    leo: 'Leo — el león, con Regulus latiendo como su corazón estelar.',
    scorpius: 'Escorpio — el escorpión cuyo aguijón apunta hacia la Vía Láctea, dominado por Antares.',
    taurus: 'Tauro — el toro, hogar de las Pléyades y de la mirada roja de Aldebarán.',
    gemini: 'Géminis — los hermanos Cástor y Pólux, símbolo de lazos eternos.',
    aquila: 'Águila — el águila de Zeus, con Altair como su ojo brillante.',
    pegasus: 'Pegaso — el caballo alado, célebre por su gran cuadrado celeste.',
    andromeda: 'Andrómeda — la princesa encadenada, vecina de nuestra galaxia gemela.',
    perseus: 'Perseo — el héroe que sostiene la cabeza de Medusa (Algol, la estrella demonio).',
    draco: 'Dragón — la serpiente celeste que serpentea entre las dos Osas.',
};
/* =═══════════════ CONSTELLATIONS DATA (REAL & PRECISE) ═══════════════ */
const CONSTELLATIONS = [
    {
        id: 'ursa_major',
        name: 'Osa Mayor',
        stars: [
            { x: 85, y: 25, mag: 1.8, c: 'B', n: 'Alkaid' },
            { x: 73, y: 30, mag: 2.2, c: 'W', n: 'Mizar' },
            { x: 61, y: 32, mag: 1.8, c: 'W', n: 'Alioth' },
            { x: 49, y: 36, mag: 3.3, c: 'W', n: 'Megrez' },
            { x: 47, y: 56, mag: 2.4, c: 'W', n: 'Phecda' },
            { x: 23, y: 52, mag: 2.3, c: 'W', n: 'Merak' },
            { x: 20, y: 32, mag: 1.8, c: 'O', n: 'Dubhe' }
        ],
        lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]]
    },
    {
        id: 'ursa_minor',
        name: 'Osa Menor',
        stars: [
            { x: 15, y: 20, mag: 2.0, c: 'Y', n: 'Polaris' },
            { x: 28, y: 26, mag: 4.3, c: 'W', n: 'Yildun' },
            { x: 40, y: 30, mag: 4.2, c: 'W' },
            { x: 50, y: 36, mag: 4.3, c: 'W' },
            { x: 52, y: 50, mag: 5.0, c: 'W' },
            { x: 65, y: 46, mag: 2.0, c: 'O', n: 'Kochab' },
            { x: 62, y: 32, mag: 3.0, c: 'W', n: 'Pherkad' }
        ],
        lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]]
    },
    {
        id: 'orion',
        name: 'Orión',
        stars: [
            { x: 30, y: 20, mag: 0.4, c: 'R', n: 'Betelgeuse' },
            { x: 70, y: 22, mag: 1.6, c: 'B', n: 'Bellatrix' },
            { x: 50, y: 12, mag: 3.4, c: 'B', n: 'Meissa' },
            { x: 42, y: 48, mag: 1.7, c: 'B', n: 'Alnitak' },
            { x: 50, y: 49, mag: 1.7, c: 'B', n: 'Alnilam' },
            { x: 58, y: 50, mag: 2.2, c: 'B', n: 'Mintaka' },
            { x: 32, y: 78, mag: 2.1, c: 'B', n: 'Saiph' },
            { x: 68, y: 80, mag: 0.1, c: 'B', n: 'Rigel' },
            { x: 50, y: 64, mag: 2.8, c: 'B', n: 'Hatysa' }
        ],
        lines: [[0, 1], [0, 3], [1, 5], [3, 4], [4, 5], [3, 6], [5, 7], [6, 7], [4, 8], [0, 2], [1, 2]]
    },
    {
        id: 'cassiopeia',
        name: 'Casiopea',
        stars: [
            { x: 15, y: 60, mag: 2.2, c: 'W', n: 'Caph' },
            { x: 33, y: 35, mag: 2.2, c: 'O', n: 'Schedar' },
            { x: 50, y: 55, mag: 2.2, c: 'B', n: 'Gamma Cas' },
            { x: 68, y: 38, mag: 2.7, c: 'W', n: 'Ruchbah' },
            { x: 85, y: 52, mag: 3.4, c: 'B', n: 'Segin' }
        ],
        lines: [[0, 1], [1, 2], [2, 3], [3, 4]]
    },
    {
        id: 'cygnus',
        name: 'Cygnus (Cisne)',
        stars: [
            { x: 50, y: 15, mag: 1.25, c: 'W', n: 'Deneb' },
            { x: 50, y: 45, mag: 2.2, c: 'O', n: 'Sadr' },
            { x: 20, y: 52, mag: 2.5, c: 'O', n: 'Gienah' },
            { x: 80, y: 38, mag: 2.9, c: 'B', n: 'Delta Cyg' },
            { x: 50, y: 68, mag: 3.2, c: 'W' },
            { x: 50, y: 88, mag: 3.1, c: 'Y', n: 'Albireo' }
        ],
        lines: [[0, 1], [1, 4], [4, 5], [2, 1], [1, 3]]
    },
    {
        id: 'lyra',
        name: 'Lyra',
        stars: [
            { x: 50, y: 15, mag: 0.0, c: 'B', n: 'Vega' },
            { x: 40, y: 55, mag: 3.5, c: 'B', n: 'Sheliak' },
            { x: 60, y: 55, mag: 3.2, c: 'B', n: 'Sulafat' },
            { x: 60, y: 35, mag: 4.3, c: 'R' },
            { x: 40, y: 35, mag: 4.0, c: 'W' }
        ],
        lines: [[0, 3], [3, 4], [4, 0], [4, 1], [1, 2], [2, 3]]
    },
    {
        id: 'leo',
        name: 'Leo',
        stars: [
            { x: 75, y: 75, mag: 1.35, c: 'B', n: 'Regulus' },
            { x: 15, y: 45, mag: 2.1, c: 'W', n: 'Denebola' },
            { x: 68, y: 42, mag: 2.0, c: 'Y', n: 'Algieba' },
            { x: 35, y: 40, mag: 2.6, c: 'W', n: 'Zosma' },
            { x: 38, y: 62, mag: 3.3, c: 'W', n: 'Chertan' },
            { x: 85, y: 25, mag: 3.0, c: 'Y', n: 'Algenubi' },
            { x: 73, y: 22, mag: 3.9, c: 'O', n: 'Rasalas' },
            { x: 60, y: 32, mag: 3.4, c: 'W', n: 'Adhafera' }
        ],
        lines: [[0, 2], [2, 7], [7, 6], [6, 5], [0, 4], [4, 3], [3, 1], [3, 2], [4, 1]]
    },
    {
        id: 'scorpius',
        name: 'Escorpio',
        stars: [
            { x: 40, y: 35, mag: 1.0, c: 'R', n: 'Antares' },
            { x: 20, y: 15, mag: 2.6, c: 'B', n: 'Graffias' },
            { x: 25, y: 25, mag: 2.3, c: 'B', n: 'Dschubba' },
            { x: 30, y: 35, mag: 2.9, c: 'B', n: 'Pi Sco' },
            { x: 35, y: 28, mag: 2.9, c: 'B', n: 'Alniyat' },
            { x: 48, y: 52, mag: 2.3, c: 'O', n: 'Larawag' },
            { x: 60, y: 72, mag: 1.9, c: 'Y', n: 'Sargas' },
            { x: 78, y: 60, mag: 1.6, c: 'B', n: 'Shaula' },
            { x: 82, y: 52, mag: 2.7, c: 'B', n: 'Lesath' }
        ],
        lines: [[1, 2], [2, 3], [2, 4], [4, 0], [0, 5], [5, 6], [6, 7], [7, 8]]
    },
    {
        id: 'taurus',
        name: 'Tauro',
        stars: [
            { x: 40, y: 45, mag: 0.85, c: 'O', n: 'Aldebaran' },
            { x: 75, y: 20, mag: 1.65, c: 'B', n: 'Elnath' },
            { x: 85, y: 45, mag: 3.0, c: 'B', n: 'Zeta Tau' },
            { x: 42, y: 33, mag: 3.5, c: 'Y', n: 'Ain' },
            { x: 25, y: 38, mag: 3.6, c: 'O', n: 'Hyadum I' },
            { x: 15, y: 25, mag: 2.8, c: 'B', n: 'Alcyone' }
        ],
        lines: [[4, 0], [0, 3], [3, 4], [0, 2], [3, 1], [4, 5]]
    },
    {
        id: 'gemini',
        name: 'Géminis',
        stars: [
            { x: 70, y: 15, mag: 1.6, c: 'W', n: 'Castor' },
            { x: 82, y: 20, mag: 1.1, c: 'O', n: 'Pollux' },
            { x: 35, y: 35, mag: 3.0, c: 'Y', n: 'Mebsuta' },
            { x: 20, y: 45, mag: 2.9, c: 'R', n: 'Tejat Post.' },
            { x: 28, y: 75, mag: 1.9, c: 'W', n: 'Alhena' },
            { x: 52, y: 42, mag: 3.5, c: 'W', n: 'Wasat' },
            { x: 45, y: 58, mag: 3.8, c: 'Y', n: 'Mekbuda' }
        ],
        lines: [[0, 5], [5, 6], [6, 4], [1, 2], [2, 3], [5, 2]]
    },
    {
        id: 'aquila',
        name: 'Águila',
        stars: [
            { x: 50, y: 30, mag: 0.75, c: 'W', n: 'Altair' },
            { x: 58, y: 38, mag: 3.7, c: 'Y', n: 'Alshain' },
            { x: 42, y: 22, mag: 2.7, c: 'O', n: 'Tarazed' },
            { x: 25, y: 40, mag: 3.0, c: 'W', n: 'Deneb el Okab' },
            { x: 45, y: 55, mag: 3.4, c: 'W', n: 'Delta Aql' },
            { x: 65, y: 65, mag: 3.5, c: 'Y', n: 'Almizan I' }
        ],
        lines: [[2, 0], [0, 1], [1, 4], [4, 5], [3, 0]]
    },
    {
        id: 'pegasus',
        name: 'Pegaso',
        stars: [
            { x: 30, y: 60, mag: 2.5, c: 'B', n: 'Markab' },
            { x: 30, y: 25, mag: 2.4, c: 'R', n: 'Scheat' },
            { x: 75, y: 60, mag: 2.8, c: 'B', n: 'Algenib' },
            { x: 75, y: 25, mag: 2.1, c: 'B', n: 'Alpheratz' },
            { x: 10, y: 80, mag: 2.4, c: 'O', n: 'Enif' },
            { x: 20, y: 70, mag: 3.4, c: 'B', n: 'Homam' }
        ],
        lines: [[0, 1], [1, 3], [3, 2], [2, 0], [0, 5], [5, 4]]
    },
    {
        id: 'andromeda',
        name: 'Andrómeda',
        stars: [
            { x: 12, y: 14, mag: 2.06, c: 'B', n: 'Alpheratz' },   // α And – cabeza
            { x: 28, y: 28, mag: 2.06, c: 'R', n: 'Mirach' },      // β And – cadera
            { x: 46, y: 40, mag: 2.26, c: 'O', n: 'Almach' },      // γ And – pie izquierdo
            { x: 60, y: 48, mag: 3.27, c: 'O', n: 'δ And' },
            { x: 72, y: 54, mag: 4.37, c: 'Y', n: 'ε And' },
            { x: 82, y: 60, mag: 4.07, c: 'W', n: 'ζ And' },
            { x: 90, y: 64, mag: 4.57, c: 'W', n: 'η And' },       // extremo de la cadena principal
            { x: 20, y: 46, mag: 4.67, c: 'O', n: 'θ And' },       // brazo superior (sale de Mirach)
            { x: 32, y: 56, mag: 4.27, c: 'W', n: 'ι And' },
            { x: 42, y: 66, mag: 4.37, c: 'O', n: 'κ And' },
            { x: 52, y: 74, mag: 3.87, c: 'B', n: 'λ And' },
            { x: 62, y: 80, mag: 3.97, c: 'W', n: 'μ And' },
            { x: 72, y: 84, mag: 4.87, c: 'O', n: 'ν And' },
            { x: 14, y: 58, mag: 4.77, c: 'Y', n: 'Adhil' },       // ξ And – brazo inferior izquierdo
            { x: 26, y: 70, mag: 4.97, c: 'W', n: 'ο And' },
            { x: 38, y: 80, mag: 4.37, c: 'B', n: 'Nembus' }       // 51 And – extremo del brazo
        ],
        lines: [
            // Cadena principal (cabeza → extremo)
            [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6],
            // Brazo superior (sale de Mirach, hacia la derecha y abajo)
            [1, 7], [7, 8], [8, 9], [9, 10], [10, 11], [11, 12],
            // Brazo inferior (sale de Mirach, hacia la izquierda y abajo)
            [1, 13], [13, 14], [14, 15]
        ]
    },
    {
        id: 'perseus',
        name: 'Perseo',
        stars: [
            { x: 50, y: 35, mag: 1.8, c: 'B', n: 'Mirfak' },
            { x: 65, y: 55, mag: 2.1, c: 'B', n: 'Algol' },
            { x: 45, y: 75, mag: 4.0, c: 'B', n: 'Menkib' },
            { x: 35, y: 65, mag: 2.8, c: 'B', n: 'Atik' },
            { x: 75, y: 65, mag: 3.4, c: 'R', n: 'Gorgonea T.' },
            { x: 35, y: 25, mag: 3.8, c: 'Y', n: 'Misam' }
        ],
        lines: [[5, 0], [0, 3], [3, 2], [0, 1], [1, 4]]
    },
    {
        id: 'draco',
        name: 'Dragón',
        stars: [
            { x: 50, y: 45, mag: 3.7, c: 'W', n: 'Thuban' },
            { x: 25, y: 20, mag: 2.2, c: 'O', n: 'Eltanin' },
            { x: 15, y: 30, mag: 2.8, c: 'Y', n: 'Rastaban' },
            { x: 65, y: 35, mag: 3.1, c: 'Y', n: 'Altais' },
            { x: 75, y: 55, mag: 3.1, c: 'B', n: 'Aldhibah' },
            { x: 40, y: 70, mag: 3.3, c: 'O', n: 'Edasich' }
        ],
        lines: [[1, 2], [2, 0], [0, 1], [0, 3], [3, 4], [4, 5]]
    }
];
const DRAW_KEY = 'fabiola_draw_progress_v1';
function loadDrawProgress() { try { return JSON.parse(localStorage.getItem(DRAW_KEY)) || {}; } catch (e) { return {}; } }
function saveDrawProgress(p) { try { localStorage.setItem(DRAW_KEY, JSON.stringify(p)); } catch (e) { } }

/* ════════════════ DRAW MODE v3 — COSMIC ════════════════ */
const STAR_FILL = { W: '#f5f0e8', B: '#cfe0ff', Y: '#fff4cf', O: '#ffd9a8', R: '#ffb8a0' };
const STAR_HALO = { W: '#haloW', B: '#haloB', Y: '#haloY', O: '#haloO', R: '#haloR' };
function magToCoreR(mag) { // 0.5→1.4, 2→1.0, 3.5→0.55, 4.5→0.4
    return Math.max(0.4, 1.55 - mag * 0.28);
}
let drawState = { idx: 0, drawn: [], current: null, expected: 0, _pending: null };
let _drawBgRaf = null;

function initDrawScreen() {
    const prog = loadDrawProgress();
    drawState.idx = CONSTELLATIONS.findIndex(c => !prog[c.id]); if (drawState.idx < 0) drawState.idx = 0;
    renderDrawList(); loadDrawConstellation(drawState.idx);
    startDrawBg();
}
function renderDrawList() {
    const list = document.getElementById('draw-list'); if (!list) return;
    const prog = loadDrawProgress();
    list.innerHTML = '';
    CONSTELLATIONS.forEach((c, i) => {
        const p = document.createElement('div');
        p.className = 'draw-pill' + (prog[c.id] ? ' done' : '') + (i === drawState.idx ? ' current' : '');
        p.textContent = (prog[c.id] ? '✓ ' : '') + c.name;
        p.onclick = () => { drawState.idx = i; renderDrawList(); loadDrawConstellation(i); };
        list.appendChild(p);
    });
}
function loadDrawConstellation(i) {
    const c = CONSTELLATIONS[i]; if (!c) return;
    drawState.current = c; drawState.drawn = []; drawState.expected = 0; drawState._pending = null;
    document.getElementById('draw-name').textContent = c.name;
    const prog = document.getElementById('draw-progress');
    prog.textContent = '0 / ' + c.lines.length; prog.classList.remove('done');
    const meta = document.getElementById('draw-meta'); if (meta) meta.textContent = CONSTELLATION_DESC[c.id] || '';
    const reveal = document.getElementById('draw-reveal'); if (reveal) reveal.classList.remove('show');
    const linesG = document.getElementById('draw-lines'); linesG.innerHTML = '';
    const starsG = document.getElementById('draw-stars'); starsG.innerHTML = '';
    const labelsG = document.getElementById('draw-labels'); labelsG.innerHTML = '';
    const NS = 'http://www.w3.org/2000/svg';
    c.stars.forEach((s, idx) => {
        const r = magToCoreR(s.mag);
        const fill = STAR_FILL[s.c] || STAR_FILL.W;
        const haloId = STAR_HALO[s.c] || STAR_HALO.W;
        const g = document.createElementNS(NS, 'g');
        g.setAttribute('class', 'draw-star-grp draw-twinkle');
        g.dataset.idx = idx;
        g.style.animationDelay = (idx * 0.23 % 2.7).toFixed(2) + 's';
        // halo
        const halo = document.createElementNS(NS, 'circle');
        halo.setAttribute('cx', s.x); halo.setAttribute('cy', s.y);
        halo.setAttribute('r', (r * 5).toFixed(2));
        halo.setAttribute('fill', `url(${haloId})`);
        halo.setAttribute('class', 'halo');
        g.appendChild(halo);
        // soft glow ring (always visible — gives stars depth)
        const soft = document.createElementNS(NS, 'circle');
        soft.setAttribute('cx', s.x); soft.setAttribute('cy', s.y);
        soft.setAttribute('r', (r * 2.4).toFixed(2));
        soft.setAttribute('fill', `url(${haloId})`);
        soft.setAttribute('opacity', '.55');
        g.appendChild(soft);
        // core
        const core = document.createElementNS(NS, 'circle');
        core.setAttribute('cx', s.x); core.setAttribute('cy', s.y);
        core.setAttribute('r', r.toFixed(2));
        core.setAttribute('fill', fill);
        core.setAttribute('class', 'core');
        g.appendChild(core);
        // hit area (invisible)
        const hit = document.createElementNS(NS, 'circle');
        hit.setAttribute('cx', s.x); hit.setAttribute('cy', s.y);
        hit.setAttribute('r', '4');
        hit.setAttribute('fill', 'transparent');
        g.appendChild(hit);
        g.addEventListener('click', e => { e.stopPropagation(); onStarClick(idx); });
        starsG.appendChild(g);
        // label for named bright stars (mag <= 2.5)
        if (s.n && s.mag <= 2.6) {
            const t = document.createElementNS(NS, 'text');
            t.setAttribute('x', s.x);
            t.setAttribute('y', s.y - r - 1.3);
            t.setAttribute('class', 'draw-starlabel dim');
            t.textContent = s.n;
            labelsG.appendChild(t);
        }
    });
}

function _starsEl() { return document.querySelectorAll('#draw-stars .draw-star-grp'); }
function _clearActive() { _starsEl().forEach(s => s.classList.remove('active')); hidePreview(); }
function _starGroup(i) { return document.querySelector(`#draw-stars .draw-star-grp[data-idx="${i}"]`); }

function onStarClick(idx) {
    const c = drawState.current; if (!c) return;
    if (drawState.expected >= c.lines.length) return;
    if (drawState._pending == null) {
        drawState._pending = idx;
        _starsEl().forEach(s => s.classList.toggle('active', +s.dataset.idx === idx));
        showPreviewFrom(idx);
        return;
    }
    const a = drawState._pending, b = idx;
    if (a === b) { drawState._pending = null; _clearActive(); return; }
    const remaining = c.lines.slice(drawState.expected);
    const match = remaining.find(([x, y]) => (x === a && y === b) || (x === b && y === a));
    if (match) {
        drawLineBetween(a, b);
        drawState.drawn.push([a, b]);
        drawState.expected++;
        const prog = document.getElementById('draw-progress');
        prog.textContent = drawState.expected + ' / ' + c.lines.length;
        _starGroup(a)?.classList.add('lit');
        _starGroup(b)?.classList.add('lit');
        if (drawState.expected >= c.lines.length) {
            prog.classList.add('done');
            const progStore = loadDrawProgress(); progStore[c.id] = true; saveDrawProgress(progStore);
            try { sfxClick(); } catch (e) { }
            // celebratory: light all stars + show reveal
            _starsEl().forEach(s => s.classList.add('lit'));
            const reveal = document.getElementById('draw-reveal');
            if (reveal) {
                document.getElementById('draw-reveal-name').textContent = c.name;
                reveal.classList.add('show');
                setTimeout(() => reveal.classList.remove('show'), 3200);
            }
            showToast('✦ ¡' + c.name + ' completada!');
            renderDrawList();
        }
    } else {
        try { navigator.vibrate && navigator.vibrate(40); } catch (e) { }
        showToast('✦ Esa unión no pertenece a esta constelación');
        _starGroup(a)?.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-1px)' }, { transform: 'translateX(1px)' }, { transform: 'translateX(0)' }], { duration: 240 });
    }
    drawState._pending = null;
    _clearActive();
}

function drawLineBetween(a, b) {
    const c = drawState.current;
    const NS = 'http://www.w3.org/2000/svg';
    const sa = c.stars[a], sb = c.stars[b];
    const line = document.createElementNS(NS, 'line');
    line.setAttribute('x1', sa.x); line.setAttribute('y1', sa.y);
    line.setAttribute('x2', sb.x); line.setAttribute('y2', sb.y);
    line.setAttribute('class', 'draw-line');
    document.getElementById('draw-lines').appendChild(line);
}

function showPreviewFrom(i) {
    const c = drawState.current; if (!c) return;
    const s = c.stars[i];
    const p = document.getElementById('draw-preview');
    p.setAttribute('x1', s.x); p.setAttribute('y1', s.y);
    p.setAttribute('x2', s.x); p.setAttribute('y2', s.y);
    p.style.display = 'block';
}
function hidePreview() { const p = document.getElementById('draw-preview'); if (p) p.style.display = 'none'; }

// Track pointer to update preview line + cancel-on-outside-click
(function () {
    const svg = () => document.getElementById('draw-svg');
    function ptToSvg(ev) {
        const s = svg(); if (!s) return null;
        const pt = s.createSVGPoint();
        const t = ev.touches ? ev.touches[0] : ev;
        pt.x = t.clientX; pt.y = t.clientY;
        return pt.matrixTransform(s.getScreenCTM().inverse());
    }
    document.addEventListener('pointermove', ev => {
        if (drawState._pending == null) return;
        if (!document.getElementById('draw-screen')?.classList.contains('active')) return;
        const p = document.getElementById('draw-preview'); if (!p || p.style.display === 'none') return;
        const pt = ptToSvg(ev); if (!pt) return;
        p.setAttribute('x2', pt.x); p.setAttribute('y2', pt.y);
    }, { passive: true });
    document.addEventListener('click', ev => {
        if (drawState._pending == null) return;
        if (!document.getElementById('draw-screen')?.classList.contains('active')) return;
        if (ev.target.closest('.draw-star-grp')) return;
        if (ev.target.closest('.draw-wrap')) {
            // clicked empty space — cancel selection
            drawState._pending = null; _clearActive();
        }
    });
})();

function drawHint() {
    const c = drawState.current; if (!c) return;
    if (drawState.expected >= c.lines.length) { showToast('Ya está completa'); return; }
    const [a, b] = c.lines[drawState.expected];
    const NS = 'http://www.w3.org/2000/svg';
    const sa = c.stars[a], sb = c.stars[b];
    const hint = document.createElementNS(NS, 'line');
    hint.setAttribute('x1', sa.x); hint.setAttribute('y1', sa.y);
    hint.setAttribute('x2', sb.x); hint.setAttribute('y2', sb.y);
    hint.setAttribute('class', 'draw-line hint');
    document.getElementById('draw-lines').appendChild(hint);
    [a, b].forEach(i => _starGroup(i)?.classList.add('hint'));
    setTimeout(() => {
        try { hint.remove(); } catch (e) { }
        [a, b].forEach(i => _starGroup(i)?.classList.remove('hint'));
    }, 2400);
}
function drawReset() { loadDrawConstellation(drawState.idx); }

/* ════════════════ COSMIC BG CANVAS (inside .draw-wrap) ════════════════ */
let _drawBgRO = null;
function startDrawBg() {
    const cv = document.getElementById('draw-bgcanvas'); if (!cv) return;
    // Cancelar loop y observer previos para evitar fugas al reentrar
    if (_drawBgRaf) { cancelAnimationFrame(_drawBgRaf); _drawBgRaf = null; }
    if (_drawBgRO) { try { _drawBgRO.disconnect(); } catch (e) { } _drawBgRO = null; }
    const ctx = cv.getContext('2d');
    let stars = [], dust = [], shoot = null, t0 = performance.now(), W = 0, H = 0, dpr = 1;
    function resize() {
        const r = cv.getBoundingClientRect();
        dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        W = Math.max(1, Math.floor(r.width * dpr)); H = Math.max(1, Math.floor(r.height * dpr));
        cv.width = W; cv.height = H;
        seed();
    }
    function seed() {
        const reduce = settings.reducedMotion;
        const N = reduce ? 40 : (QUALITY === 'low' ? 60 : QUALITY === 'medium' ? 110 : 160);
        stars = []; for (let i = 0; i < N; i++) {
            stars.push({
                x: Math.random() * W, y: Math.random() * H,
                r: (Math.random() * 1.2 + 0.2) * dpr,
                tw: Math.random() * 0.004 + 0.001, off: Math.random() * 6.28,
                a: Math.random() * 0.6 + 0.3
            });
        }
        const D = reduce ? 0 : (QUALITY === 'low' ? 6 : 14);
        dust = []; for (let i = 0; i < D; i++) {
            dust.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * 0.05 * dpr, vy: (Math.random() - .5) * 0.04 * dpr, r: (Math.random() * 2 + 1.2) * dpr, h: Math.random() * 60 });
        }
    }
    function spawnShoot() {
        if (settings.reducedMotion) return;
        if (Math.random() < 0.002 && !shoot) {
            shoot = { x: Math.random() * W * 0.6, y: Math.random() * H * 0.4, vx: (Math.random() * 3 + 4) * dpr, vy: (Math.random() * 1.5 + 1) * dpr, life: 1 };
        }
    }
    function frame(ts) {
        if (!document.getElementById('draw-screen')?.classList.contains('active')) { _drawBgRaf = null; return; }
        _drawBgRaf = requestAnimationFrame(frame);
        const spd = window.__animSpeed || 1;
        ctx.clearRect(0, 0, W, H);
        // soft cosmic dust (additive)
        ctx.globalCompositeOperation = 'lighter';
        for (const d of dust) {
            d.x += d.vx * spd; d.y += d.vy * spd;
            if (d.x < -20) d.x = W + 20; if (d.x > W + 20) d.x = -20;
            if (d.y < -20) d.y = H + 20; if (d.y > H + 20) d.y = -20;
            const g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r * 8);
            g.addColorStop(0, `hsla(${260 + d.h},70%,70%,0.10)`);
            g.addColorStop(1, 'hsla(260,70%,40%,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(d.x, d.y, d.r * 8, 0, 6.283); ctx.fill();
        }
        // stars
        for (const s of stars) {
            const k = Math.sin(ts * s.tw + s.off) * 0.5 + 0.5;
            const a = s.a * (0.35 + k * 0.65);
            ctx.fillStyle = `rgba(255,250,235,${a})`;
            ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
            if (s.r > 0.9 * dpr && k > 0.7) {
                ctx.fillStyle = `rgba(200,210,255,${a * 0.25})`;
                ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 3, 0, 6.283); ctx.fill();
            }
        }
        // shooting star (occasional)
        spawnShoot();
        if (shoot) {
            shoot.x += shoot.vx * spd; shoot.y += shoot.vy * spd; shoot.life -= 0.012 * spd;
            const tail = 80 * dpr;
            const grad = ctx.createLinearGradient(shoot.x, shoot.y, shoot.x - shoot.vx * 8, shoot.y - shoot.vy * 8);
            grad.addColorStop(0, `rgba(255,250,230,${Math.max(0, shoot.life)})`);
            grad.addColorStop(1, 'rgba(255,250,230,0)');
            ctx.strokeStyle = grad; ctx.lineWidth = 1.2 * dpr; ctx.beginPath();
            ctx.moveTo(shoot.x, shoot.y); ctx.lineTo(shoot.x - shoot.vx * 8, shoot.y - shoot.vy * 8); ctx.stroke();
            if (shoot.life <= 0 || shoot.x > W + tail || shoot.y > H + tail) shoot = null;
        }
        ctx.globalCompositeOperation = 'source-over';
    }
    resize();
    _drawBgRO = new ResizeObserver(resize); _drawBgRO.observe(cv);
    _drawBgRaf = requestAnimationFrame(frame);
}



/* ════════════════ SHARE CARD ════════════════ */
const SHARE_KEY = 'fabiola_share_v1';
function loadShare() { try { return JSON.parse(localStorage.getItem(SHARE_KEY)) || {}; } catch (e) { return {}; } }
function persistShare() {
    const data = {
        constId: document.getElementById('share-const').value,
        to: document.getElementById('share-to').value,
        msg: document.getElementById('share-msg').value,
        from: document.getElementById('share-from').value,
    };
    try { localStorage.setItem(SHARE_KEY, JSON.stringify(data)); } catch (e) { }
}
function initShareScreen() {
    const sel = document.getElementById('share-const');
    const prog = loadDrawProgress();
    const done = CONSTELLATIONS.filter(c => prog[c.id]);
    const hint = document.getElementById('share-const-hint');
    sel.innerHTML = '';
    if (done.length === 0) {
        // Allow all but warn
        CONSTELLATIONS.forEach(c => {
            const o = document.createElement('option'); o.value = c.id; o.textContent = c.name + ' (bloqueada)'; sel.appendChild(o);
        });
        hint.textContent = 'Aún no completas ninguna en Modo Dibujo. Puedes elegir, pero desbloquéalas para una experiencia completa.';
    } else {
        done.forEach(c => {
            const o = document.createElement('option'); o.value = c.id; o.textContent = c.name; sel.appendChild(o);
        });
        if (done.length < CONSTELLATIONS.length) {
            const optg = document.createElement('optgroup'); optg.label = '— Por desbloquear —';
            CONSTELLATIONS.filter(c => !prog[c.id]).forEach(c => {
                const o = document.createElement('option'); o.value = c.id; o.textContent = c.name + ' 🔒'; optg.appendChild(o);
            });
            sel.appendChild(optg);
        }
        hint.textContent = done.length + ' constelación(es) desbloqueada(s).';
    }
    const saved = loadShare();
    if (saved.constId && CONSTELLATIONS.find(c => c.id === saved.constId)) sel.value = saved.constId;
    document.getElementById('share-to').value = saved.to || 'Nombre del receptor';
    document.getElementById('share-msg').value = saved.msg || 'Hay estrellas que solo brillan para ti.';
    document.getElementById('share-from').value = saved.from || 'Nombre del remitente';
    renderShareCard();
}
/* Spectral color palette → [core, mid-halo, outer-halo] */
const STAR_COLORS = {
    W: ['#ffffff', '#f4ecd8', '#d4a574'], // white
    B: ['#eaf2ff', '#b8d4ff', '#5e8fd4'], // blue-white
    Y: ['#fff8d6', '#ffe9a8', '#d4a86a'], // yellow
    O: ['#ffd9a8', '#ffb070', '#c46a2d'], // orange
    R: ['#ffd0c0', '#ff8a6a', '#b8341a'], // red giant
};
function _starXY(s) { return [s.x ?? s[0], s.y ?? s[1]]; }
function _starMag(s) { return (s && typeof s.mag === 'number') ? s.mag : 2.5; }
function _starColor(s) { return STAR_COLORS[s && s.c] || STAR_COLORS.W; }

function renderShareCard() {
    persistShare();
    const canvas = document.getElementById('share-canvas'); if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    // Cosmic background — deep nebula gradient
    const grad = ctx.createRadialGradient(W / 2, H * 0.35, 50, W / 2, H * 0.5, W);
    grad.addColorStop(0, '#1a1438'); grad.addColorStop(0.5, '#0a0a22'); grad.addColorStop(1, '#04040c');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    // Nebula clouds (soft purple/blue blobs)
    let seed = 7;
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 6; i++) {
        const nx = rnd() * W, ny = rnd() * H, nr = 180 + rnd() * 280;
        const ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr);
        const hue = ['rgba(120,80,200,', 'rgba(80,120,220,', 'rgba(200,100,180,'][i % 3];
        ng.addColorStop(0, hue + '0.18)'); ng.addColorStop(1, hue + '0)');
        ctx.fillStyle = ng; ctx.beginPath(); ctx.arc(nx, ny, nr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    // Twinkling background stars
    for (let i = 0; i < 180; i++) {
        const x = rnd() * W, y = rnd() * H, r = rnd() * 1.6 + 0.3;
        ctx.fillStyle = rnd() < 0.15 ? '#bcd4ff' : '#ffffff';
        ctx.globalAlpha = 0.25 + rnd() * 0.7;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Decorative gold border
    ctx.strokeStyle = 'rgba(212,165,116,0.5)'; ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, W - 40, H - 40);
    ctx.strokeStyle = 'rgba(212,165,116,0.18)'; ctx.lineWidth = 1;
    ctx.strokeRect(36, 36, W - 72, H - 72);
    // Top label
    ctx.fillStyle = '#d4a574'; ctx.font = '300 28px Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText('✦   U N A   C O N S T E L A C I Ó N   ✦', W / 2, 90);
    // Constellation
    const sel = document.getElementById('share-const');
    const c = CONSTELLATIONS.find(x => x.id === sel.value) || CONSTELLATIONS[0];
    // Bounding box using new format
    let minX = 100, minY = 100, maxX = 0, maxY = 0;
    c.stars.forEach(s => { const [x, y] = _starXY(s); if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y; });
    const cw = maxX - minX || 1, ch = maxY - minY || 1;
    const drawW = W * 0.7, drawH = H * 0.42;
    const scale = Math.min(drawW / cw, drawH / ch);
    const offX = W / 2 - (cw * scale) / 2 - minX * scale;
    const offY = H * 0.16 + (drawH - ch * scale) / 2 - minY * scale;
    const pts = c.stars.map(s => {
        const [x, y] = _starXY(s);
        return { x: x * scale + offX, y: y * scale + offY, mag: _starMag(s), col: _starColor(s), name: s && s.n };
    });
    // Connection lines — glow pass + crisp pass
    ctx.save();
    ctx.shadowColor = 'rgba(212,165,116,0.9)'; ctx.shadowBlur = 14;
    ctx.strokeStyle = 'rgba(240,200,150,0.55)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    c.lines.forEach(([a, b]) => {
        if (!pts[a] || !pts[b]) return;
        ctx.beginPath(); ctx.moveTo(pts[a].x, pts[a].y); ctx.lineTo(pts[b].x, pts[b].y); ctx.stroke();
    });
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,235,200,0.85)'; ctx.lineWidth = 1.1; ctx.lineCap = 'round';
    c.lines.forEach(([a, b]) => {
        if (!pts[a] || !pts[b]) return;
        ctx.beginPath(); ctx.moveTo(pts[a].x, pts[a].y); ctx.lineTo(pts[b].x, pts[b].y); ctx.stroke();
    });
    // Stars: size from magnitude, color from spectral class
    pts.forEach(p => {
        // mag 0 ≈ huge, mag 4.5 ≈ tiny — map to radius 2..8 and halo 10..32
        const t = Math.max(0, Math.min(1, (4.5 - p.mag) / 4.5));
        const core = 2 + t * 6;
        const halo = 10 + t * 26;
        const [c0, c1, c2] = p.col;
        // Outer halo
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, halo);
        g.addColorStop(0, c0); g.addColorStop(0.25, hexA(c1, 0.85));
        g.addColorStop(0.55, hexA(c1, 0.35)); g.addColorStop(1, hexA(c2, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, halo, 0, Math.PI * 2); ctx.fill();
        // Bright core
        ctx.fillStyle = c0; ctx.beginPath(); ctx.arc(p.x, p.y, core, 0, Math.PI * 2); ctx.fill();
        // Diffraction spikes for the brightest stars
        if (p.mag < 2.0) {
            ctx.save();
            ctx.strokeStyle = hexA(c0, 0.7); ctx.lineWidth = 1; ctx.lineCap = 'round';
            const sp = halo * 0.95;
            ctx.beginPath();
            ctx.moveTo(p.x - sp, p.y); ctx.lineTo(p.x + sp, p.y);
            ctx.moveTo(p.x, p.y - sp); ctx.lineTo(p.x, p.y + sp);
            ctx.stroke();
            ctx.restore();
        }
    });
    // Label brightest named stars (top 3 by brightness)
    const named = pts.filter(p => p.name).sort((a, b) => a.mag - b.mag).slice(0, 3);
    ctx.fillStyle = 'rgba(232,224,216,0.7)'; ctx.font = '300 18px Georgia, serif'; ctx.textAlign = 'left';
    named.forEach(p => { ctx.fillText(p.name, p.x + 12, p.y - 10); });
    ctx.textAlign = 'center';
    // Constellation name
    ctx.fillStyle = '#f0d0a8'; ctx.font = 'italic 52px Georgia, serif';
    wrapText(ctx, c.name, W / 2, H * 0.66, W - 120, 60);
    // Dedicated name
    const to = (document.getElementById('share-to').value || '').trim();
    if (to) {
        ctx.fillStyle = '#d4a574'; ctx.font = '300 30px Georgia, serif';
        ctx.fillText('Para ' + to, W / 2, H * 0.72);
    }
    // Message
    const msg = (document.getElementById('share-msg').value || '').trim();
    ctx.fillStyle = '#e8e0d8'; ctx.font = 'italic 30px Georgia, serif';
    wrapText(ctx, '"' + msg + '"', W / 2, H * 0.80, W - 160, 40);
    // From
    const from = (document.getElementById('share-from').value || '').trim();
    if (from) {
        ctx.fillStyle = '#b8b0a8'; ctx.font = '300 26px Georgia, serif';
        ctx.fillText(from, W / 2, H * 0.93);
    }
}
/* hexA() se declara más abajo (versión única) */
function wrapText(ctx, text, x, y, maxW, lh) {
    const words = (text || '').split(/\s+/); let line = '', cy = y;
    for (const w of words) {
        const test = line ? line + ' ' + w : w;
        if (ctx.measureText(test).width > maxW && line) {
            ctx.fillText(line, x, cy); line = w; cy += lh;
        } else { line = test; }
    }
    if (line) ctx.fillText(line, x, cy);
}
function downloadShareCard() {
    const canvas = document.getElementById('share-canvas');
    const a = document.createElement('a');
    a.download = 'constelacion-fabiola.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
    try { sfxClick(); } catch (e) { }
}
async function shareShareCard() {
    const canvas = document.getElementById('share-canvas');
    canvas.toBlob(async (blob) => {
        if (!blob) { downloadShareCard(); return; }
        const file = new File([blob], 'constelacion.png', { type: 'image/png' });
        try {
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: 'Una constelación para ti', text: '✦' });
            } else { downloadShareCard(); }
        } catch (e) { downloadShareCard(); }
    });
}

/* ════════════════ THEMES / ANIM SPEED / MUSIC / FPS MONITOR ════════════════ */
const THEMES = {
    gold: { label: 'Dorado', gold: '#d4a574', bright: '#f0d0a8', soft: '#b8926a', accent: '#8bb8d8', accent2: '#d4a0b0', neb: ['#5b3a8a', '#8a3a5b', '#2a5b8a'] },
    aurora: { label: 'Aurora', gold: '#7ad9b8', bright: '#aef0d6', soft: '#5fae90', accent: '#7ab0e0', accent2: '#c08be0', neb: ['#1f5f6a', '#2a3a8a', '#1f6a4a'] },
    nebula: { label: 'Nebulosa', gold: '#d48ad0', bright: '#f0b8ec', soft: '#a06aa0', accent: '#8b9be0', accent2: '#e88aae', neb: ['#5b1a8a', '#8a1a5b', '#3a1a8a'] },
    solaris: { label: 'Solaris', gold: '#f0a060', bright: '#ffd0a0', soft: '#c07840', accent: '#e88a4a', accent2: '#d4604a', neb: ['#8a2a1a', '#a04a1a', '#5b2a1a'] },
    midnight: { label: 'Medianoche', gold: '#a0b8e0', bright: '#d0e0f8', soft: '#7088b0', accent: '#aebde0', accent2: '#8ba0d0', neb: ['#1a2a5b', '#2a1a5b', '#0f1a3a'] },
};
function applyTheme(name) {
    const t = THEMES[name] || THEMES.gold;
    const r = document.documentElement.style;
    r.setProperty('--gold', t.gold);
    r.setProperty('--gold-bright', t.bright);
    r.setProperty('--gold-soft', t.soft);
    r.setProperty('--accent', t.accent);
    r.setProperty('--accent2', t.accent2);
    r.setProperty('--nebula1', t.neb[0]); r.setProperty('--nebula2', t.neb[1]); r.setProperty('--nebula3', t.neb[2]);
    r.setProperty('--glow-gold', `0 0 24px ${hexA(t.gold, 0.45)}`);
    // regenerate nebula cache so canvas reflects theme
    nebulaeImage = null;
}
function hexA(h, a) { const m = h.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i); if (!m) return h; return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${a})`; }
function renderThemeSwatches() {
    const wrap = document.getElementById('theme-swatches'); if (!wrap) return;
    wrap.innerHTML = '';
    Object.entries(THEMES).forEach(([key, t]) => {
        const s = document.createElement('button'); s.type = 'button';
        s.className = 'swatch' + (settings.theme === key ? ' active' : '');
        s.title = t.label;
        s.style.background = `linear-gradient(135deg, ${t.bright} 0%, ${t.gold} 60%, ${t.soft} 100%)`;
        s.onclick = () => { settings.theme = key; saveSettings(); applyTheme(key); renderThemeSwatches(); try { sfxClick(); } catch (e) { } showToast('Tema: ' + t.label); };
        wrap.appendChild(s);
    });
}

// ANIM SPEED
window.__animSpeed = 1;
function applyAnimSpeed(v) {
    v = Math.max(0.3, Math.min(1.5, +v || 1));
    window.__animSpeed = v;
    const lbl = document.getElementById('anim-speed-val'); if (lbl) lbl.textContent = v.toFixed(2) + 'x';
    const sl = document.getElementById('anim-speed'); if (sl && +sl.value !== v) sl.value = v;
}
document.addEventListener('input', e => {
    if (e.target && e.target.id === 'anim-speed') {
        applyAnimSpeed(e.target.value); settings.animSpeed = window.__animSpeed; saveSettings();
    }
    if (e.target && e.target.id === 'music-vol') {
        settings.musicVol = +e.target.value; saveSettings();
        const m = document.getElementById('bgMusic'); if (m) m.volume = settings.musicVol;
        const v = document.getElementById('music-vol-val'); if (v) v.textContent = Math.round(settings.musicVol * 100) + '%';
    }
});

// MUSIC (upload + persist)
const MUSIC_KEY = 'fabiola_music_v1';
function loadMusicStore() { try { return JSON.parse(localStorage.getItem(MUSIC_KEY)) || null; } catch (e) { return null; } }
function applyStoredMusic() {
    const m = document.getElementById('bgMusic'); if (!m) return;
    const store = loadMusicStore();
    if (store && store.src) { m.src = store.src; }
    m.volume = settings.musicVol;
    const name = document.getElementById('music-name'); if (name) name.textContent = store?.name || '— sin pista —';
    const vv = document.getElementById('music-vol-val'); if (vv) vv.textContent = Math.round(settings.musicVol * 100) + '%';
    const vs = document.getElementById('music-vol'); if (vs) vs.value = settings.musicVol;
    syncMusicBtn();
}
function syncMusicBtn() { const b = document.getElementById('music-toggle'); const m = document.getElementById('bgMusic'); if (b && m) b.textContent = (!m.paused && m.src) ? '⏸' : '▶'; }
function toggleMusic() {
    const m = document.getElementById('bgMusic'); if (!m) return;
    if (!m.src) { showToast('Sube un MP3 primero'); return; }
    if (m.paused) { m.play().catch(() => showToast('No se pudo reproducir')); } else { m.pause(); }
    syncMusicBtn();
}
function clearMusic() {
    if (!confirm('¿Quitar la música guardada?')) return;
    try { localStorage.removeItem(MUSIC_KEY); } catch (e) { }
    const m = document.getElementById('bgMusic'); if (m) { m.pause(); m.removeAttribute('src'); m.load(); }
    const name = document.getElementById('music-name'); if (name) name.textContent = '— sin pista —';
    syncMusicBtn();
}
document.addEventListener('change', e => {
    if (e.target && e.target.id === 'music-upload') {
        const f = e.target.files && e.target.files[0]; if (!f) return;
        if (f.size > 3 * 1024 * 1024) { showToast('Máx 3 MB (límite de almacenamiento local)'); e.target.value = ''; return; }
        const r = new FileReader();
        r.onload = () => {
            try { localStorage.setItem(MUSIC_KEY, JSON.stringify({ src: r.result, name: f.name })); }
            catch (err) { showToast('No queda espacio local'); return; }
            applyStoredMusic();
            const m = document.getElementById('bgMusic'); if (m) m.play().catch(() => { });
            syncMusicBtn();
            showToast('✦ Música cargada');
        };
        r.readAsDataURL(f);
        e.target.value = '';
    }
});

// FPS MONITOR (auto-downgrade only when quality==='auto')
(function () {
    let frames = 0, t0 = performance.now(), lowStreak = 0;
    window.__fpsTick = (ts) => {
        frames++;
        const dur = ts - t0;
        if (dur >= 2000) {
            const fps = frames * 1000 / dur;
            frames = 0; t0 = ts;
            if (settings.quality === 'auto') {
                const target = qc().fps;
                if (fps < target * 0.65) { lowStreak++; } else { lowStreak = 0; }
                if (lowStreak >= 2) {
                    lowStreak = 0;
                    const order = ['high', 'medium', 'low']; const idx = order.indexOf(QUALITY);
                    if (idx >= 0 && idx < order.length - 1) {
                        QUALITY = order[idx + 1];
                        initBgEntities(); nebulaeImage = null;
                        showToast('Calidad reducida automáticamente para mejor rendimiento');
                    }
                }
            }
        }
    };
})();

// extend renderSettings to refresh new controls
const __origRenderSettings = renderSettings;
renderSettings = function () {
    __origRenderSettings();
    renderThemeSwatches();
    applyAnimSpeed(settings.animSpeed);
    applyStoredMusic();
};

/* ════════════════ INIT ════════════════ */
function init() {
    applyTheme(settings.theme);
    window.__animSpeed = settings.animSpeed || 1;
    startBg();
    if (settings.quality === 'auto') QUALITY = resolveQuality();
    document.getElementById('btn-mute').textContent = settings.sound ? '🔊' : '🔇';
    applyStoredMusic();
    refreshMenu();
    showTopbar(false);
    maybeShowChangelog(); // muestra changelog (v nueva) → luego welcome si aplica
}


/* ════════════════ WELCOME DIALOG ════════════════ */
/* ════════════════ CHANGELOG / NOTAS DE VERSIÓN ════════════════ */
// Incrementa este string cada vez que haya cambios para que Fabiola
// vea el aviso aunque ya haya pasado el welcome anterior.
const APP_VERSION    = '2.0';
const CHANGELOG_KEY  = 'fabiola_changelog_seen_v' + APP_VERSION;

function openChangelog() {
    const el = document.getElementById('changelog-overlay');
    if (!el) return;
    el.style.display = 'flex';
    try { sfxClick(); } catch (_) {}
}

function closeChangelog() {
    const el = document.getElementById('changelog-overlay');
    if (!el) return;
    el.style.display = 'none';
    try { localStorage.setItem(CHANGELOG_KEY, '1'); } catch (_) {}
    try { sfxClick(); } catch (_) {}
    // Después del changelog mostrar el welcome si todavía no lo vio
    maybeShowWelcome();
}

function maybeShowChangelog() {
    try { if (localStorage.getItem(CHANGELOG_KEY)) { maybeShowWelcome(); return; } } catch (_) {}
    // Primera vez que ve esta versión: mostrar changelog en lugar del welcome
    setTimeout(openChangelog, 350);
}

/* ════════════════ WELCOME DIALOG ════════════════ */
const WELCOME_KEY = 'fabiola_welcome_seen_v1';
/* ════════════════ MUSIC SELECTOR ════════════════ */
// FIX: función faltante que causaba ReferenceError al cerrar el welcome overlay
function openMusicSelector() {
    const selector = document.getElementById('music-selector-overlay');
    if (selector) selector.style.display = 'flex';
}

function openWelcome() {
    const el = document.getElementById('welcome-overlay');
    if (!el) return;
    el.style.display = 'flex';
    try { sfxClick(); } catch (e) { }
}
function closeWelcome() {
    const el = document.getElementById('welcome-overlay');
    if (!el) return;
    el.style.display = 'none';
    try { localStorage.setItem(WELCOME_KEY, '1'); } catch (e) { }
    try { sfxClick(); } catch (e) { }

    // Disparar el modal de selección de música al comenzar
    openMusicSelector();
}
function maybeShowWelcome() {
    try { if (localStorage.getItem(WELCOME_KEY)) return; } catch (e) { }
    setTimeout(openWelcome, 350);
}
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const el = document.getElementById('welcome-overlay');
        if (el && el.style.display === 'flex') closeWelcome();
    }
});
init();
/* ════════════════ SINTONIZACIÓN INICIAL SINFÓNICA ════════════════ */
/* ════════════════ SINTONIZACIÓN INICIAL SINFÓNICA ════════════════ */
const PLAYLIST = [
    { name: "Exogenesis Symphony Part 3", src: "./1.mp3" },
    { name: "Neutron Star Collision", src: "./2.mp3" },
    { name: "Roman Sky", src: "./3.mp3" },
    { name: "Starlight", src: "./4.mp3" },
    { name: "Марианская впадина", src: "./5.mp3" },
    { name: "Exist", src: "./6.mp3" }
];
let currentTrackIndex = 0;

// Se ejecuta al hacer click en una de las canciones del overlay inicial
function selectInitialSong(index) {
    const selector = document.getElementById('music-selector-overlay');
    if (selector) selector.style.display = 'none';

    // Forzar la reactivación del AudioContext por seguridad/interacción de navegador
    ensureAudio();
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    playTrack(index);
}

// Reproduce la pista indicada y sincroniza volumen y HUD
function playTrack(index) {
    const bgMusic = document.getElementById('bgMusic');
    if (!bgMusic) return;

    currentTrackIndex = index;
    const track = PLAYLIST[currentTrackIndex];

    bgMusic.src = track.src;
    bgMusic.volume = settings.musicVol !== undefined ? settings.musicVol : 0.6;

    if (settings.sound) {
        bgMusic.play().catch(err => console.log("La reproducción automática requiere interacción previa.", err));
    }

    // Sincroniza con el indicador de pista de tus ajustes (si existe el elemento)
    const nameDisplay = document.getElementById('music-name');
    if (nameDisplay) nameDisplay.textContent = track.name;
}

// Configurar la transición automática de forma circular al terminar la canción elegida
// (script.js se carga al final del body, así que registramos directamente — DOMContentLoaded ya disparó)
(function () {
    const bgMusic = document.getElementById('bgMusic');
    if (bgMusic) {
        bgMusic.addEventListener('ended', () => {
            const nextIndex = (currentTrackIndex + 1) % PLAYLIST.length;
            playTrack(nextIndex);
        });
    }
})();

/* ============================================================
   RESPONSIVE + PERFORMANCE (integrado)
   ============================================================ */
(function () {
    'use strict';
    if (window.__perfInstalled) return;
    window.__perfInstalled = true;

    var doc = document.documentElement;
    var nav = navigator;

    /* ---------- 1. Heurística de gama baja ---------- */
    function isLowEnd() {
        try {
            var mem = nav.deviceMemory || 4;
            var cores = nav.hardwareConcurrency || 4;
            var conn = nav.connection || {};
            var saveData = !!conn.saveData;
            var slowNet = /^(slow-2g|2g|3g)$/i.test(conn.effectiveType || '');
            var minSide = Math.min(innerWidth, innerHeight);
            var coarse = matchMedia('(pointer:coarse)').matches;
            var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
            return (
                mem <= 2 ||
                cores <= 4 && minSide < 500 ||
                saveData || slowNet || reduced ||
                (coarse && minSide < 380)
            );
        } catch (e) { return false; }
    }

    function applyLowEnd(reason) {
        if (doc.classList.contains('perf-low')) return;
        doc.classList.add('perf-low');
        try {
            if (window.settings && window.settings.quality === 'auto') {
                window.settings.quality = 'low';
                if (typeof window.saveSettings === 'function') window.saveSettings();
                if (typeof window.resolveQuality === 'function') {
                    window.QUALITY = window.resolveQuality();
                } else {
                    window.QUALITY = 'low';
                }
                if (typeof window.initBgEntities === 'function') window.initBgEntities();
                if (typeof window.startBg === 'function') window.startBg();
            }
        } catch (e) { }
        console.info('[perf] low-end mode enabled (' + (reason || 'heuristic') + ')');
    }

    if (isLowEnd()) applyLowEnd('initial');

    /* ---------- 2. Batería ---------- */
    if (nav.getBattery) {
        nav.getBattery().then(function (b) {
            function check() {
                if (!b.charging && b.level < 0.2) applyLowEnd('battery');
            }
            b.addEventListener('levelchange', check);
            b.addEventListener('chargingchange', check);
            check();
        }).catch(function () { });
    }

    /* ---------- 3. Cambios de red ---------- */
    if (nav.connection && nav.connection.addEventListener) {
        nav.connection.addEventListener('change', function () {
            if (nav.connection.saveData || /^(slow-2g|2g|3g)$/i.test(nav.connection.effectiveType || '')) {
                applyLowEnd('network');
            }
        });
    }

    /* ---------- 4. Pausa por inactividad ---------- */
    var IDLE_MS = 45000;
    var idleTimer = null;
    var paused = false;

    function pauseBg() {
        if (paused) return;
        paused = true;
        window.pageVisible = false;
    }
    function resumeBg() {
        if (!paused) return;
        paused = false;
        window.pageVisible = !document.hidden;
    }
    function bumpActivity() {
        resumeBg();
        clearTimeout(idleTimer);
        idleTimer = setTimeout(pauseBg, IDLE_MS);
    }
    ['pointerdown', 'keydown', 'touchstart', 'wheel', 'scroll'].forEach(function (ev) {
        addEventListener(ev, bumpActivity, { passive: true });
    });
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) pauseBg(); else bumpActivity();
    });
    bumpActivity();

    /* ---------- 5. Pausa durante scroll ---------- */
    var scrollT = null;
    addEventListener('scroll', function () {
        if (!doc.classList.contains('perf-low')) return;
        window.pageVisible = false;
        clearTimeout(scrollT);
        scrollT = setTimeout(function () {
            if (!document.hidden) window.pageVisible = true;
        }, 180);
    }, { passive: true });

    /* ---------- 6. Resize/orientación ---------- */
    var lastW = innerWidth, rotT = null;
    addEventListener('orientationchange', function () {
        clearTimeout(rotT);
        rotT = setTimeout(function () {
            if (innerWidth !== lastW) {
                lastW = innerWidth;
                if (typeof window.resizeBgCanvas === 'function') window.resizeBgCanvas();
                if (typeof window.initBgEntities === 'function') window.initBgEntities();
            }
        }, 300);
    }, { passive: true });

    /* ---------- 7. FPS watchdog ---------- */
    (function fpsWatch() {
        var frames = 0, t0 = performance.now(), bad = 0;
        window.__fpsTick = function () { frames++; };
        setInterval(function () {
            var now = performance.now();
            var fps = (frames * 1000) / (now - t0);
            frames = 0; t0 = now;
            if (fps && fps < 20) bad++; else bad = 0;
            if (bad >= 3) { applyLowEnd('fps:' + fps.toFixed(1)); bad = 0; }
        }, 1000);
    })();

    /* ---------- 8. Helpers ---------- */
    window.__perf = {
        forceLow: function () { applyLowEnd('manual'); },
        isLow: function () { return doc.classList.contains('perf-low'); },
        pause: pauseBg,
        resume: resumeBg,
    };
})();
// jsPDF ya no se carga en cada visita: se descarga bajo demanda la primera vez
// que el usuario pulsa "descargar PDF", así el peso inicial de la página baja.
let _jsPDFLoadPromise = null;
function loadJsPDF() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve();
    if (_jsPDFLoadPromise) return _jsPDFLoadPromise;
    _jsPDFLoadPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        s.onload = () => resolve();
        s.onerror = () => { _jsPDFLoadPromise = null; reject(new Error('No se pudo cargar jsPDF')); };
        document.head.appendChild(s);
    });
    return _jsPDFLoadPromise;
}
async function downloadConfessionPDF() {
    try { sfxClick(); } catch (e) {}
    const fb = document.getElementById('pdf-feedback');

    if (!(window.jspdf && window.jspdf.jsPDF)) {
        if (fb) fb.textContent = '⏳ Cargando el generador de PDF…';
        try { await loadJsPDF(); }
        catch (e) {
            if (fb) fb.textContent = '⚠ No se pudo cargar la librería PDF. Revisa tu conexión e intenta de nuevo.';
            return;
        }
    }

    // jsPDF se carga desde CDN como window.jspdf.jsPDF
    const jsPDFCtor = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
    if (!jsPDFCtor) {
        if (fb) fb.textContent = '⚠ La librería PDF aún está cargando. Intenta en un momento.';
        return;
    }

    if (fb) fb.textContent = '⏳ Generando tu carta…';

    const doc = new jsPDFCtor({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210, H = 297;
    const marginX = 22, lineH = 7.5;
    let y = 0;

    // ── Función interna para manejar el salto de página y mantener el diseño ──
    function checkPageBreak(extraSpace = 0) {
        const bottomMargin = 30; // Límite antes de tocar el borde inferior
        if (y + extraSpace > H - bottomMargin) {
            doc.addPage();
            
            // Re-dibujar Fondo oscuro elegante
            doc.setFillColor(8, 8, 20);
            doc.rect(0, 0, W, H, 'F');
            
            // Re-dibujar Borde dorado
            doc.setDrawColor(212, 165, 116);
            doc.setLineWidth(0.5);
            doc.rect(10, 10, W - 20, H - 20);
            doc.setLineWidth(0.2);
            doc.rect(12, 12, W - 24, H - 24);
            
            // Reiniciar la altura Y con un pequeño margen superior
            y = 25; 
            
            // Restaurar la fuente y color del cuerpo para seguir escribiendo
            doc.setFont('times', 'normal');
            doc.setFontSize(11.5);
            doc.setTextColor(220, 210, 195);
        }
    }

    // ── Fondo oscuro elegante (Página 1) ──
    doc.setFillColor(8, 8, 20);
    doc.rect(0, 0, W, H, 'F');

    // ── Borde dorado (Página 1) ──
    doc.setDrawColor(212, 165, 116);
    doc.setLineWidth(0.5);
    doc.rect(10, 10, W - 20, H - 20);
    doc.setLineWidth(0.2);
    doc.rect(12, 12, W - 24, H - 24);

    // ── Encabezado decorativo ──
    doc.setFont('times', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(180, 140, 90);
    doc.text('U N   V I A J E   E N T R E   C O R A Z O N E S   E S T E L A R E S', W / 2, 22, { align: 'center' });

    y = 32;
    doc.setLineWidth(0.3);
    doc.setDrawColor(212, 165, 116);
    doc.line(marginX, y, W - marginX, y);

    // ── Título ──
    y += 12;
    doc.setFont('times', 'bolditalic');
    doc.setFontSize(20);
    doc.setTextColor(240, 208, 168);
    doc.text('Carta', W / 2, y, { align: 'center' });

    // ── Subtítulo ──
    y += 8;
    doc.setFont('times', 'italic');
    doc.setFontSize(11);
    doc.setTextColor(180, 140, 90);
    doc.text('— Fase III · El Omega —', W / 2, y, { align: 'center' });

    y += 6;
    doc.setLineWidth(0.2);
    doc.line(marginX + 20, y, W - marginX - 20, y);

    // ── Saludo ──
    y += 10;
    doc.setFont('times', 'bolditalic');
    doc.setFontSize(14);
    doc.setTextColor(240, 208, 168);
    doc.text('Fabiola,', marginX, y);

    // ── Cuerpo de la carta ──
    const body = [
        '',
        'Este proyecto nació para expresar una parte de lo que siento por ti, por lo menos de forma',
        'de aquello en lo que quizas sea bueno...',
        '',
        'Este detalle hecho con el corazon, no es solo para mostrar lo que siento, tambien para pedir perdon.',
        'Ya que, despues de esto... Desconozco el rumbo cuyo vidas entre nosotros se puedan tornar.',
        'Esto claramente no mostrara ni una tercio de lo que siento, pero si es un pedazo de mi que quiero que tomes.',
        'Algo que, de seguro y de nuevo reitero, Dificilmente alguien se te pueda expresar en este contexto.',
        '',
        'Quizas has presenciado distintas formas cuyo sentimiento se te han expresado.',
        "Cartas, canciones, declaraciones formales u otro tipo de detalle espero que honesto.",
        'Pero estoy muy seguro, que como esta y otras formas en que he pensado hacer esto, no se te haran vivir.',
        '',
        "Asimismo, Despoja todo el misterio para revelar la verdad absoluta. Cuya verdad es que, Te amo",
        "Te amo de una forma que no puedo explicar sinceramente, ya que al hacer una amiga, ",
        'considerandote mi mejor amiga... quise evitar este sentimiento ya que supondria una sola verdad ',
        'En estas circunstancias... Cada momento que pase contigo, cada flor y ramo de flor hecho por mi mano, ',
        'Cada chocolate que te ofrecido, cada cuidado que te he entregado, cada noche en la que quizas ',
        'nos divertiammos, cada mensaje tarde o temprano que recibia de ti, las risas...',
        'Era un confort en un mundo en el que solo quisiera que estuviera una persona presente, tu.',
        '',
        "Fabi... Tu amistad desearia no poder perderla, ya que, aunque no es suficiente para mi... es la que",
        'he querido tener, he querido llorar, he querido amar y estar ahi para ti. Poder dar la vida por ti... ',
        'Si, quizas por fuera se observe que hacia mi persona no me basta con solo tener a dos, tres, cinco, diez',
        'cien "amigos" en mi entorno. Pero sin duda alguna, desde hace un tiempo, he deseado abandonar',
        "todas ellas, por solo tener una cuya eleccion fue hecha por mi corazon, y es la tuya.",
        '',
        '',
        'Sin duda, este sentimiento a diferencia de otras... No surgio al tener una primera o primeras impresiones',
        'hacia ti. Es mas, aun no me explico la forma en que se ha creado este sentimiento. Pero se y estoy',
        'seguro, que no es un gusto ordinario.',
        '',
        'Quiero que te tomes tu tiempo y te preguntes a ti misma "¿Como sabes tu que estas enamorada?", ',
        '"¿Que acciones, actitudes y detalles cambian en ti hacia una persona en particular? " Acaso...',
        '¿Te has enamorado alguna vez o solo tienes una percepcion de ello? Yo no puedo dar mi garantia absoluta',
        'De que realemente estoy enamorado de ti, pero si doy garantia de que a diferencia de otras personas...',
        'yo haria y actuaria de forma inusual. Y no solamente el sentimiento de querer hacerlo, ya que.',
        'Me nace, de forma inconsciente me causas un desorden y a su vez un orden en mi vida. Desorden por no',
        'saber se que hacer con este sentmiento hacia ti, y un orden cuando mi vida esta rodeada de problemas las',
        'cuales con solo un mensaje de ti, o tu presencia pueden llegar a calmar. Sin embargo, el golpe de realidad',
        'En esta historia de seguro sera dura, no correspondida o simplemente ignorada por tus preferencias',
        'personales y que realmente no puedo o podria competir para ganar quizas tu corazon.',
        '',
        'Muchas personas me han entregado sus abrazos, pero no sabes cuanto anhelo recibir alguno honesto de ',
        'parte de ti, algun "te amo" que a pesar de que lo recibi hace poco, no se sintio como uno verdedaro.',
        'Algun detalle de amor y cariño que si, quizas me lo hallas expresado en distintas formas, formas',
        'en la que tu sabras como, pero siendo honesto, no ha llegado alguno lo suficiente para quedarme ',
        'satisfecho siendo solo tu amigo. Quizas no lo vea, o simplemente es el deseo de que me puedas',
        'querer o quizas amar de una forma que solo a otras personas de manera especial tu se lo obsequias.',
        '',
        'Insisto en que desconozco como se vaya a tomar el rumbo de esto, pero sabes bien lo drastico que soy',
        'y que posiblemente ha llegado el dia que tanto te decia y que no querias ni yo tampoco deseo.',
        'Y quiero que te quede claro que no es lo que anhelo, pero tampoco quiero ni puedo darme el lujo ',
        'de estar en una cocina quemandome por el sentimiento y las acciones que hago para ti mientras ',
        "que estas muy feliz con otra persona disfrutando de lo que cocinan. Que esta claro que no esta mal",
        "Pero no es lo correcto para mi, y asi como tu cuidas tu integridad y tus responsabilidades...",
        "me has enseñado que tambien debo hacerlo por mi. ",
        
    ];

    doc.setFont('times', 'normal');
    doc.setFontSize(11.5);
    doc.setTextColor(220, 210, 195);
    y += lineH;
    body.forEach(line => {
        checkPageBreak(); // Verifica el salto antes de escribir cada línea
        doc.text(line, marginX, y);
        y += lineH;
    });

    // ── Confesión central ──
    checkPageBreak(lineH * 2); // Asegura que la confesión no quede cortada entre páginas
    doc.setFont('times', 'bolditalic');
    doc.setFontSize(14);
    doc.setTextColor(212, 165, 116);
    doc.text('Te amo, Fabiola. De una manera que no lo he hecho,en mucho tiempo ', W / 2, y, { align: 'center', maxWidth: W - marginX * 2 });
    
    y += lineH + 3;
    checkPageBreak();
    doc.setFontSize(11.5);
    doc.text('Y esta es mi verdad.', W / 2, y, { align: 'center' });

    // ── Cierre ──
    y += lineH * 2;
    checkPageBreak(lineH * 2); // Asegura que el cierre quepa completo
    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(180, 160, 130);
    doc.text('Eres una estrella que deslumbra ante los entes que te rodean.', marginX, y);
    doc.text('"Brillante, atractiva y la que observo y cuido siempre ",', marginX, y + 8);
    y += lineH + 4;

    doc.setFont('times', 'bolditalic');
    doc.setFontSize(13);
    doc.setTextColor(240, 208, 168);
    doc.text('Tu amigo, quizas mejor amigo, Yeffry.', marginX, y + 8);

    // ── Pie de página (Se dibuja solo en la última página o iterando si se desea en todas) ──
    doc.setFont('times', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 80, 50);
    doc.text('Un Viaje de Corazones Estelares.  ·  Fase III · El Omega', W / 2, H - 16, { align: 'center' });
    doc.setFontSize(7);
    doc.text('✦  ✦  ✦', W / 2, H - 11, { align: 'center' });

    // ── Guardar ──
    doc.save('carta-de-fabiola.pdf');

    if (fb) fb.textContent = '✦ Carta descargada. Que las estrellas guíen su camino.';
    try { sfxBig(); } catch (e) {}
}
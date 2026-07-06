/* ════════════════════════════════════════════════════════════════════
   ENHANCEMENTS · capa aditiva, hookea funciones existentes
   Visualización 1-6 + Estrategia Fase III (preámbulo)
   ════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  // Espera a que script.js termine de cargar (define save, settings, etc.)
  function ready(fn) {
    if (document.readyState !== 'loading') setTimeout(fn, 0);
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {

    /* ───────── helpers ───────── */
    const $ = (s) => document.querySelector(s);
    const reduced = () => (typeof settings !== 'undefined' && settings.reducedMotion) ||
      matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* (1) Atmósfera dinámica · marca data-phase en <body> */
    let _lastTintPhase = null;
    function syncPhaseAttr() {
      try {
        const p = (typeof save !== 'undefined' && save) ? Math.min(save.phase || 1, 3) : 1;
        document.body.setAttribute('data-phase', String(p));
        // calidad para CSS condicional
        const q = (typeof QUALITY !== 'undefined') ? QUALITY :
          (typeof settings !== 'undefined' ? settings.quality : 'auto');
        document.body.setAttribute('data-quality', q || 'auto');
        // Opción A, pieza 5: si cambió la fase, invalida la caché de la
        // nebulosa para que se regenere con el nuevo tinte en el próximo frame.
        if (_lastTintPhase !== null && _lastTintPhase !== p && typeof nebulaeImage !== 'undefined') {
          nebulaeImage = null;
        }
        _lastTintPhase = p;
      } catch (e) { }
    }
    syncPhaseAttr();

    /* (1) Cinematic intro · se dispara cuando se entra a una pantalla de fase */
    const PHASE_INTROS = {
      1: { eyebrow: 'FASE I', title: 'Palabras del Alma', sub: 'Un susurro entre estrellas comienza…' },
      2: { eyebrow: 'FASE II', title: 'Constelaciones de la Mente', sub: 'Lo que la lógica revela, el corazón lo abraza.' },
      3: { eyebrow: 'FASE III', title: 'El Omega', sub: 'Donde toda luz converge.' },
    };
    let lastIntroPhase = 0;
    let _introTimer = null; // FIX: guarda el ID para poder cancelar timers huérfanos
    function playPhaseIntro(phase) {
      if (!PHASE_INTROS[phase] || lastIntroPhase === phase) return;
      lastIntroPhase = phase;
      const ov = $('#phase-intro-overlay');
      if (!ov) return;
      const data = PHASE_INTROS[phase];
      $('#pi-eyebrow').textContent = data.eyebrow;
      $('#pi-title').textContent = data.title;
      $('#pi-sub').textContent = data.sub;
      ov.classList.remove('show'); void ov.offsetWidth;
      ov.classList.add('show');
      // FIX (1): cancela cualquier timer previo antes de crear uno nuevo.
      // Sin esto, si el usuario sale y vuelve rápido, el timer huérfano
      // dispara classList.remove('show') a mitad de la nueva animación.
      if (_introTimer) { clearTimeout(_introTimer); _introTimer = null; }
      // FIX (2): 3600 → 5000 para coincidir con la duración real de pi-fade (5s).
      // Con 3600ms el overlay desaparecía 400ms antes de que empezara el
      // keyframe de fade-out (80 %→100 %, 4000–5000ms), resultando en un
      // corte abrupto. Con 5000ms se deja completar la animación y el
      // overlay se retira cuando ya está en opacidad 0 (fill: forwards).
      const dur = reduced() ? 1400 : 5000;
      _introTimer = setTimeout(() => { _introTimer = null; ov.classList.remove('show'); }, dur);
    }

    /* (2) Mini-constelación de progreso en HUD */
    const PHASE_STEPS = { 1: 7, 2: 4, 3: 1 };
    function getDoneCount() {
      try {
        const p = save.phase || 1;
        if (p === 1) return (save.solvedLetters || []).filter(Boolean).length;
        if (p === 2) return (save.uploaded || []).filter(Boolean).length;
        if (p === 3) return save.phase3 ? 1 : 0;
      } catch (e) { }
      return 0;
    }
    function renderConstellation() {
      const c = $('#hud-constellation');
      if (!c || typeof save === 'undefined' || !save) return;
      const phase = Math.min(save.phase || 1, 3);
      const total = PHASE_STEPS[phase] || 3;
      const done = Math.min(getDoneCount(), total);
      // sólo re-render si cambia la firma
      const sig = phase + ':' + total + ':' + done;
      if (c.dataset.sig === sig) return;
      c.dataset.sig = sig;
      c.innerHTML = '';
      for (let i = 0; i < total; i++) {
        const d = document.createElement('span');
        d.className = 'hc-dot' + (i < done ? ' done' : (i === done ? ' current' : ''));
        c.appendChild(d);
        if (i < total - 1) {
          const l = document.createElement('span');
          l.className = 'hc-link';
          c.appendChild(l);
        }
      }
    }

    /* (2) HUD auto-hide con timeout de inactividad */
    let hideTimer = null;
    function bumpHUD() {
      const tb = $('#topbar');
      if (!tb) return;
      tb.classList.remove('auto-hidden');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        if (!document.querySelector('.modal-open, #gate-overlay.show, #phase-intro-overlay.show, #phase3-preamble.show')) {
          tb.classList.add('auto-hidden');
        }
      }, 4500);
    }
    ['mousemove', 'touchstart', 'keydown', 'click', 'scroll'].forEach(ev => {
      window.addEventListener(ev, bumpHUD, { passive: true });
    });
    bumpHUD();

    /* Wrapper de updateHUD existente */
    if (typeof window.updateHUD === 'function') {
      const orig = window.updateHUD;
      window.updateHUD = function () {
        const r = orig.apply(this, arguments);
        syncPhaseAttr();
        renderConstellation();
        return r;
      };
    }
    // Reacciona a persist() en vez de sondear cada 1200ms (evento disparado desde script.js)
    document.addEventListener('save-changed', () => { syncPhaseAttr(); renderConstellation(); });
    // Safety-net muy poco frecuente por si algo muta `save` sin pasar por persist()
    setInterval(() => { syncPhaseAttr(); renderConstellation(); }, 5000);

    /* Wrapper de showScreen para disparar intro al entrar en fase */
    if (typeof window.showScreen === 'function') {
      const origShow = window.showScreen;
      window.showScreen = function (id, after) {
        return origShow.call(this, id, function () {
          try {
            if (id === 'phase1-screen') playPhaseIntro(1);
            else if (id === 'phase2-screen') playPhaseIntro(2);
            else if (id === 'phase3-screen') playPhaseIntro(3);
            else lastIntroPhase = 0;
          } catch (e) { }
          if (typeof after === 'function') after();
        });
      };
    }

    /* (3) Feedback rico: shake + flash en error, chispas en acierto */
    function feedbackError(el) {
      if (!el) return;
      el.classList.remove('fx-shake', 'fx-error-flash');
      void el.offsetWidth;
      el.classList.add('fx-shake', 'fx-error-flash');
      setTimeout(() => el.classList.remove('fx-shake', 'fx-error-flash'), 700);
      try { if (typeof beep === 'function') beep(180, 0.18, 'sawtooth', 0.04); } catch (e) { }
    }
    function feedbackSuccess(el) {
      if (!el) return;
      el.classList.remove('fx-success-pulse');
      void el.offsetWidth;
      el.classList.add('fx-success-pulse');
      setTimeout(() => el.classList.remove('fx-success-pulse'), 900);
      // chispas
      if (reduced()) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const n = (typeof QUALITY !== 'undefined' && QUALITY === 'low') ? 6 : 14;
      for (let i = 0; i < n; i++) {
        const s = document.createElement('div');
        s.className = 'fx-spark';
        s.style.left = cx + 'px';
        s.style.top = cy + 'px';
        const a = Math.random() * Math.PI * 2;
        const d = 40 + Math.random() * 80;
        s.style.setProperty('--dx', Math.cos(a) * d + 'px');
        s.style.setProperty('--dy', Math.sin(a) * d + 'px');
        document.body.appendChild(s);
        setTimeout(() => s.remove(), 1000);
      }
    }

    // Observa inputs de las fases: si el script existente marca dataset.errored o el botón añade .correct, reaccionamos
    document.addEventListener('animationstart', () => {/* placeholder */ });
    // Hook genérico vía MutationObserver sobre inputs con dataset.errored
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.target instanceof HTMLElement) {
          if (m.attributeName === 'data-errored' && m.target.dataset.errored === '1') {
            feedbackError(m.target);
          }
          if (m.attributeName === 'class') {
            const cls = m.target.className || '';
            if (typeof cls === 'string') {
              if (/\b(correct|solved|success)\b/.test(cls) && !m.target.dataset.fxDone) {
                m.target.dataset.fxDone = '1';
                feedbackSuccess(m.target);
              }
              if (/\b(wrong|error|invalid)\b/.test(cls) && !m.target.dataset.fxErr) {
                m.target.dataset.fxErr = '1';
                feedbackError(m.target);
                setTimeout(() => { delete m.target.dataset.fxErr; }, 800);
              }
            }
          }
        }
      }
    });
    // Se observa solo el contenedor de pantallas (no todo document.body) para no
    // procesar mutaciones irrelevantes del HUD/canvas/overlays en cada frame.
    const screensRoot = document.getElementById('app') || document.body;
    mo.observe(screensRoot, { subtree: true, attributes: true, attributeFilter: ['class', 'data-errored'] });
    // expose for manual calls desde script.js si quieres
    window.fxError = feedbackError;
    window.fxSuccess = feedbackSuccess;

    /* (4) Mapa estelar como hub: dibuja líneas entre nodos y preview hover */
    function decorateMap() {
      const map = $('#map-screen');
      if (!map || !map.classList.contains('active')) return;
      const wrap = map.querySelector('.map-canvas, .map-wrap, .map-grid, .stellar-map') || map;
      const nodes = wrap.querySelectorAll('.map-node, .star-node, [data-map-node]');
      if (!nodes.length) return;
      if (getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';
      const wrapRect = wrap.getBoundingClientRect();
      // FIX: ya no se dibuja aquí una segunda capa de líneas conectoras —
      // buildMap() (script.js) ya dibuja esas mismas conexiones en #map-svg
      // con el estado real de cada fase (completada/bloqueada) y su propia
      // animación. Duplicarlas aquí solo producía trazos redundantes
      // superpuestos. Conservamos el hover-preview, que sí es aditivo.

      // hover preview
      nodes.forEach((n) => {
        n.addEventListener('mouseenter', () => {
          const title = n.getAttribute('data-title') || n.querySelector('.map-title, h3, h2')?.textContent || 'Fase';
          const meta = n.getAttribute('data-meta') ||
            (n.classList.contains('done') ? 'Completada ✓' :
              n.classList.contains('locked') ? 'Bloqueada' : 'En curso');
          let p = wrap.querySelector('.map-node-preview');
          if (!p) { p = document.createElement('div'); p.className = 'map-node-preview'; wrap.appendChild(p); }
          p.innerHTML = `<div class="mnp-title">${title}</div><div class="mnp-meta">${meta}</div>`;
          const r = n.getBoundingClientRect();
          p.style.left = (r.left - wrapRect.left + r.width / 2) + 'px';
          p.style.top = (r.top - wrapRect.top) + 'px';
          requestAnimationFrame(() => p.classList.add('show'));
        });
        n.addEventListener('mouseleave', () => {
          wrap.querySelector('.map-node-preview')?.classList.remove('show');
        });
      });

      // Voyager achievement
      try { if (typeof unlockAchievement === 'function') unlockAchievement('voyager'); } catch (e) { }
    }
    new MutationObserver(() => { if ($('#map-screen')?.classList.contains('active')) setTimeout(decorateMap, 100); })
      .observe(screensRoot, { subtree: true, attributes: true, attributeFilter: ['class'] });

    /* (4b) Opción A — constelación viva: línea que conecta los botones del menú */
    function decorateMenuStack() {
      const stack = $('.menu-stack');
      if (!stack) return;
      let svg = stack.querySelector('.menu-stack-svg');
      const btns = Array.from(stack.querySelectorAll('.btn')).filter(b => b.offsetParent !== null);
      if (btns.length < 2) { if (svg) svg.innerHTML = ''; return; }
      if (!svg) {
        svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'menu-stack-svg');
        stack.insertBefore(svg, stack.firstChild);
      }
      const svgNS = 'http://www.w3.org/2000/svg';
      const rect = stack.getBoundingClientRect();
      svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
      svg.innerHTML = '';
      const pts = btns.map(b => {
        const r = b.getBoundingClientRect();
        return { x: rect.width / 2, y: r.top - rect.top + r.height / 2, btn: b };
      });
      for (let i = 0; i < pts.length - 1; i++) {
        const line = document.createElementNS(svgNS, 'line');
        line.setAttribute('x1', pts[i].x); line.setAttribute('y1', pts[i].y);
        line.setAttribute('x2', pts[i + 1].x); line.setAttribute('y2', pts[i + 1].y);
        line.setAttribute('class', 'msl-line');
        svg.appendChild(line);
        pts[i]._lineDown = line; pts[i + 1]._lineUp = line;
      }
      pts.forEach(p => {
        const dot = document.createElementNS(svgNS, 'circle');
        dot.setAttribute('cx', p.x); dot.setAttribute('cy', p.y); dot.setAttribute('r', 3);
        dot.setAttribute('class', 'msl-dot');
        svg.appendChild(dot);
        if (p.btn._mslBound) return; // evita listeners duplicados si se vuelve a decorar
        p.btn._mslBound = true;
        const on = () => {
          dot.classList.add('lit');
          p._lineUp && p._lineUp.classList.add('lit');
          p._lineDown && p._lineDown.classList.add('lit');
        };
        const off = () => {
          dot.classList.remove('lit');
          p._lineUp && p._lineUp.classList.remove('lit');
          p._lineDown && p._lineDown.classList.remove('lit');
        };
        p.btn.addEventListener('mouseenter', on);
        p.btn.addEventListener('focus', on);
        p.btn.addEventListener('mouseleave', off);
        p.btn.addEventListener('blur', off);
      });
    }
    let _menuDecorT;
    function scheduleDecorateMenuStack() { clearTimeout(_menuDecorT); _menuDecorT = setTimeout(decorateMenuStack, 60); }
    new MutationObserver(() => { if ($('#menu-screen')?.classList.contains('active')) scheduleDecorateMenuStack(); })
      .observe(screensRoot, { subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
    window.addEventListener('resize', () => { if ($('#menu-screen')?.classList.contains('active')) scheduleDecorateMenuStack(); }, { passive: true });
    scheduleDecorateMenuStack();

    /* (6) Adaptive quality real · si FPS bajo, forzar low */
    let last = performance.now(), frames = 0, low = 0;
    function fpsLoop(t) {
      frames++;
      if (t - last >= 1000) {
        if (frames < 35 && (typeof settings === 'undefined' || settings.quality === 'auto')) {
          low++;
          if (low >= 3) { window.QUALITY = 'low'; document.body.setAttribute('data-quality', 'low'); }
        } else low = 0;
        frames = 0; last = t;
      }
      requestAnimationFrame(fpsLoop);
    }
    requestAnimationFrame(fpsLoop);

    /* ═════════ ESTRATEGIA FASE III · Preámbulo lento ═════════ */
    const preamble = $('#phase3-preamble');
    function typeLine(p) {
  return new Promise((resolve) => {
    let text = p.getAttribute('data-text') || '';

    // Si está vacío, no hacer nada
    if (!text) return resolve();

    p.textContent = '';
    if (reduced()) {
      p.textContent = text;
      return resolve();
    }

    let i = 0;
    const step = () => {
      if (i >= text.length) return resolve();
      const ch = text[i];
      const span = document.createElement('span');
      span.className = 'ch';
      // Para los espacios, usamos un &nbsp; visual, pero mejor conservar el carácter espacio
      if (ch === ' ') {
        span.innerHTML = '&nbsp;';
        span.style.whiteSpace = 'pre';
      } else {
        span.textContent = ch;
      }
      span.style.animationDelay = '0s';
      p.appendChild(span);
      i++;
      setTimeout(step, 55 + Math.random() * 35);
    };
    step();
  });
}
    async function playPhase3Preamble() {
      if (!preamble) return;
      preamble.classList.add('show');
      // baja música si existe
      const m = $('#bgMusic');
      const prevVol = m?.volume;
      if (m) { try { m.volume = Math.max(0.08, (prevVol || 0.6) * 0.25); } catch (e) { } }
      const lines = preamble.querySelectorAll('.p3p-line');
      for (const ln of lines) {
        await typeLine(ln);
        await new Promise(r => setTimeout(r, reduced() ? 200 : 900));
      }
      const btn = $('#p3p-continue');
      btn.classList.add('ready');
      btn.onclick = () => {
  preamble.classList.remove('show');
  if (m && prevVol != null) { try { m.volume = prevVol; } catch (e) { } }

  // Mostrar el gate (solicitar la clave secreta) antes de entrar a la fase 3
  if (typeof window.requestPhase3Access === 'function') {
    window.requestPhase3Access(() => {
      // Una vez que la clave sea correcta, mostrar la pantalla de fase 3
      if (typeof window.showScreen === 'function') {
        window.showScreen('phase3-screen');
        // Asegurar que se construya y se inicie la confesión
        if (typeof window.buildPhase3 === 'function') window.buildPhase3();
        if (typeof window.startConfession === 'function') window.startConfession();
      }
    });
  } else {
    // Fallback por si no existe la función (no debería ocurrir)
    if (typeof window.showScreen === 'function') window.showScreen('phase3-screen');
  }
};
    }
    // Disparar el preámbulo automáticamente cuando se desbloquea fase 3 y aún no se ha completado
    // Hook sobre cambios en save.phase
    let lastPhase = (typeof save !== 'undefined' && save) ? save.phase : 0;
    function checkPhase3Trigger() {
  try {
    if (!save) return;
    const gateActive = document.getElementById('gate-overlay')?.classList.contains('active');
    if (save.phase === 3 && lastPhase !== 3 && !save.phase3 && !gateActive) {
      lastPhase = 3;
      setTimeout(playPhase3Preamble, 1800);
    }
    lastPhase = save.phase;
  } catch (e) { }
}
    // Se dispara justo cuando script.js llama persist() (evento 'save-changed'),
    // en vez de sondear cada 600ms.
    document.addEventListener('save-changed', checkPhase3Trigger);
    checkPhase3Trigger();

    // Expose para invocar manualmente desde consola/tests
    window.playPhase3Preamble = playPhase3Preamble;
    window.playPhaseIntro = playPhaseIntro;
  });
})();
/* ============================================================
   print-the-prettiest-girl  ·  experience engine
   ============================================================ */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const home = $('screen-home');
  const stage = $('print-stage');
  const statusEl = $('status-text');
  const machine = $('machine');
  const paperWrap = $('paper-wrap');
  const paper = $('paper');
  const photoImg = paper.querySelector('img');
  const resultBlock = $('result-block');
  const printBtn = $('print-btn');
  const againBtn = $('again-btn');

  const reduced =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const PAPER_DUR = reduced ? 320 : 3800;
  const FLIP_GAP = reduced ? 120 : 650;

  let state = 'home';
  let secretTimer = null;

  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------------- tiny synth sounds (user-gesture safe) ------------- */
  const sfx = {
    ctx: null,
    ensure() {
      if (this.ctx) return true;
      try {
        const C = window.AudioContext || window.webkitAudioContext;
        if (!C) return false;
        this.ctx = new C();
      } catch (e) {
        return false;
      }
      return true;
    },
    resume() {
      if (this.ctx && this.ctx.state === 'suspended') {
        try { this.ctx.resume(); } catch (e) {}
      }
    },
    tone(freq, at, dur, type = 'sine', vol = 0.05, glide = 0) {
      const c = this.ctx;
      if (!c) return;
      try {
        const t0 = c.currentTime + at;
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, t0);
        if (glide) {
          o.frequency.exponentialRampToValueAtTime(
            Math.max(30, freq + glide),
            t0 + dur
          );
        }
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g);
        g.connect(c.destination);
        o.start(t0);
        o.stop(t0 + dur + 0.06);
      } catch (e) {}
    },
    click() {
      if (!this.ensure()) return;
      this.resume();
      this.tone(210, 0, 0.12, 'triangle', 0.055, -95); // soft "thock"
    },
    whirr() {
      if (!this.ensure()) return;
      this.resume();
      this.tone(120, 0, 0.5, 'sine', 0.02, -30);
      for (let i = 0; i < 7; i += 1) {
        // faint mechanical whir ticks
        this.tone(150 + i * 9, 0.22 + i * 0.2, 0.1, 'sine', 0.016);
      }
    },
    finish() {
      if (!this.ensure()) return;
      this.resume();
      this.tone(659.25, 0, 0.2, 'sine', 0.06);
      this.tone(880, 0.14, 0.22, 'sine', 0.055);
      this.tone(1318.51, 0.3, 0.5, 'sine', 0.05, 90);
    },
  };

  /* ---------------- floating background particles ---------------- */
  function spawnFloats() {
    const host = $('floats');
    if (!host) return;
    const glyphs = ['💗', '💕', '🌸', '✨', '🩷', '✿', '🌷', '💫'];
    const count = Math.min(18, Math.max(8, Math.floor(innerWidth / 80) + 8));
    for (let i = 0; i < count; i += 1) {
      const s = document.createElement('span');
      s.className = 'float-item';
      s.setAttribute('aria-hidden', 'true');
      s.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
      s.style.left = `${(1 + Math.random() * 98).toFixed(1)}%`;
      s.style.fontSize = `${(10 + Math.random() * 16).toFixed(0)}px`;
      s.style.animationDuration = `${(12 + Math.random() * 16).toFixed(1)}s`;
      s.style.animationDelay = `${(-Math.random() * 22).toFixed(1)}s`;
      s.style.setProperty('--s', (0.7 + Math.random() * 0.9).toFixed(2));
      s.style.setProperty('--o', (0.22 + Math.random() * 0.4).toFixed(2));
      s.style.setProperty(
        '--sw',
        `${Math.round(Math.random() * 160 - 80)}px`
      );
      host.appendChild(s);
    }
  }

  /* ---------------- paper metrics (fit the real photo) ---------------- */
  function updatePaperMetrics() {
    // measurement needs a laid-out (visible) stage and a decoded image
    if (stage.hidden || !photoImg || !photoImg.complete) return;
    const h = paper.offsetHeight;
    if (h > 60) {
      document.documentElement.style.setProperty('--paper-h', `${h}px`);
    }
  }

  /* ---------------- status helper ---------------- */
  function setStatus(text) {
    statusEl.classList.remove('say');
    void statusEl.offsetWidth; // restart transition
    statusEl.textContent = text || '';
    if (text) statusEl.classList.add('say');
  }

  function hideStatus() {
    setStatus('');
    statusEl.classList.add('hidden');
  }

  /* ---------------- celebration burst ---------------- */
  function createBurst() {
    const emojis = ['💗', '💕', '✨', '✿', '🩷', '💖', '🌷', '💫'];
    const n = 15 + Math.floor(Math.random() * 5);
    const fragments = [];
    for (let i = 0; i < n; i += 1) {
      const s = document.createElement('span');
      s.className = 'burst';
      s.setAttribute('aria-hidden', 'true');
      s.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      const angle = Math.random() * Math.PI * 2;
      const dist = 90 + Math.random() * 200;
      const ty = Math.sin(angle) * dist - 40;
      const tx = Math.cos(angle) * dist;
      s.style.top = '58%';
      s.style.left = '50%';
      s.style.fontSize = `${(0.9 + Math.random() * 1.1).toFixed(2)}rem`;
      s.style.setProperty('--tx', `${tx.toFixed(0)}px`);
      s.style.setProperty('--ty', `${ty.toFixed(0)}px`);
      s.style.setProperty('--s', (0.9 + Math.random() * 0.9).toFixed(2));
      machine.appendChild(s);
      fragments.push(s);
    }

    // soft white ring "pop"
    const ring = document.createElement('span');
    ring.className = 'burst ring';
    ring.setAttribute('aria-hidden', 'true');
    ring.innerHTML =
      '<svg viewBox="0 0 100 100" width="120" height="120"><circle cx="50" cy="50" r="40" fill="none" stroke="#fff" stroke-opacity="0.8" stroke-width="3"/></svg>';
    ring.style.top = '58%';
    ring.style.left = '50%';
    machine.appendChild(ring);
    fragments.push(ring);

    window.setTimeout(() => {
      fragments.forEach((f) => f.remove());
    }, 1700);
  }

  /* ---------------- print flow ---------------- */
  async function startPrint() {
    if (state !== 'home') return;
    state = 'printing';

    sfx.click();
    home.classList.add('is-hiding');
    document.body.classList.add('is-dim');

    await delay(430);

    home.hidden = true;
    stage.hidden = false;
    void stage.offsetWidth; // let the fade-in transition run
    stage.classList.add('show');
    statusEl.classList.remove('hidden');

    updatePaperMetrics();

    setStatus('Finding the prettiest girl… 💕');
    await delay(1000);

    setStatus('Preparing the print… 🌷');
    await delay(1350);

    setStatus('Printing beauty… ✨');
    machine.classList.add('printing');
    sfx.whirr();
    void paperWrap.offsetHeight; // restart CSS animation reliably
    await delay(PAPER_DUR + FLIP_GAP);

    finishPrint();
  }

  function finishPrint() {
    if (state !== 'printing') return;

    machine.classList.remove('printing');
    machine.classList.add('done');
    machine.classList.add('is-clickable');
    // keep the revealed card visible even if the CSS animation is interrupted
    const cssH = getComputedStyle(document.documentElement)
      .getPropertyValue('--paper-h')
      .trim();
    paperWrap.style.height = paper.offsetHeight
      ? `${paper.offsetHeight}px`
      : (cssH || '340px');

    hideStatus();

    window.setTimeout(createBurst, 180);
    window.setTimeout(() => sfx.finish(), 480);

    window.setTimeout(() => {
      resultBlock.hidden = false;
      void resultBlock.offsetWidth; // let the reveal transition run
      resultBlock.classList.add('show');
      state = 'complete';
    }, 750);
  }

  async function printAgain() {
    if (state !== 'complete') return;

    // collapse everything back into the printer
    machine.classList.remove('done');
    machine.classList.remove('is-clickable');
    machine.classList.remove('secret-visible');
    paperWrap.style.height = '0px';
    resultBlock.classList.remove('show');
    resultBlock.hidden = true;
    machine.querySelectorAll('.burst').forEach((f) => f.remove());

    state = 'home';
    startPrint();
  }

  /* ---------------- secret hover / tap note ---------------- */
  function toggleSecret() {
    if (state !== 'complete') return;
    const show = !machine.classList.contains('secret-visible');
    machine.classList.toggle('secret-visible', show);
    if (secretTimer) window.clearTimeout(secretTimer);
    if (show) {
      secretTimer = window.setTimeout(
        () => machine.classList.remove('secret-visible'),
        2600
      );
    }
  }

  /* ---------------- wiring ---------------- */
  printBtn.addEventListener('click', () => {
    printBtn.classList.add('is-pressed');
    window.setTimeout(() => printBtn.classList.remove('is-pressed'), 500);
    sfx.resume();
    startPrint();
  });

  againBtn.addEventListener('click', () => {
    againBtn.classList.add('is-pressed');
    window.setTimeout(() => againBtn.classList.remove('is-pressed'), 500);
    sfx.resume();
    printAgain();
  });

  machine.addEventListener('click', toggleSecret);

  // resume audio on any first interaction (autoplay-safe)
  window.addEventListener('pointerdown', () => sfx.resume(), { once: true });

  // re-measure once the real photo has decoded (and if it was swapped in)
  if (photoImg) {
    photoImg.addEventListener('load', updatePaperMetrics);
    if (photoImg.complete) updatePaperMetrics();
  }
  window.addEventListener('resize', updatePaperMetrics);

  spawnFloats();
})();
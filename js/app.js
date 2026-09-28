/* Stoxed — app shell, progress system and lesson player */
(function () {
  'use strict';

  const { units, lessons } = window.STOX_COURSE;
  const Chart = window.StoxChart;
  const ICONS = window.STOX_ICONS;

  const byId = Object.fromEntries(lessons.map(l => [l.id, l]));
  const ORDER = units.flatMap(u => u.lessons.map(id => byId[id]));

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel, root) => (root || document).querySelector(sel);

  /* ---------- DOM helper ---------- */
  function h(tag, props, ...kids) {
    const e = document.createElement(tag);
    if (props) for (const k in props) {
      const v = props[k];
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    kids.flat(Infinity).forEach(c => {
      if (c == null || c === false) return;
      e.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
    });
    return e;
  }
  const icon = (name, cls) => h('span', { class: 'ico ' + (cls || ''), html: ICONS[name] || '' });
  const shuffle = a => {
    const r = a.slice();
    for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
    return r;
  };
  const restart = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

  /* ---------- persistent state ---------- */
  const KEY = 'stoxed:v1';
  const MAX_HEARTS = 5;
  const HEART_MS = 5 * 60 * 1000;
  const REFILL_COST = 30;
  const defaults = () => ({ xp: 0, hearts: MAX_HEARTS, heartTs: Date.now(), streak: 0, lastDay: null, done: {}, xpDays: {}, sound: true, goal: 30 });

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return Object.assign(defaults(), raw ? JSON.parse(raw) : {});
    } catch (e) { return defaults(); }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ } }
  let S = load();

  const dayKey = d => {
    d = d || new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return dayKey(d); };

  function syncHearts() {
    if (S.hearts >= MAX_HEARTS) { S.hearts = MAX_HEARTS; S.heartTs = Date.now(); return; }
    const gained = Math.floor((Date.now() - S.heartTs) / HEART_MS);
    if (gained > 0) {
      S.hearts = Math.min(MAX_HEARTS, S.hearts + gained);
      S.heartTs = S.hearts === MAX_HEARTS ? Date.now() : S.heartTs + gained * HEART_MS;
      save();
    }
  }
  const nextHeartIn = () => (S.hearts >= MAX_HEARTS ? 0 : Math.max(0, HEART_MS - (Date.now() - S.heartTs)));
  const mmss = ms => { const t = Math.ceil(ms / 1000); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
  const liveStreak = () => (S.lastDay === dayKey() || S.lastDay === daysAgo(1) ? S.streak : 0);
  const isUnlocked = idx => idx === 0 || !!S.done[ORDER[idx - 1].id];

  function loseHeart() {
    syncHearts();
    if (S.hearts === MAX_HEARTS) S.heartTs = Date.now();
    S.hearts = Math.max(0, S.hearts - 1);
    save();
  }

  /* ---------- sound ---------- */
  let actx = null;
  function tone(notes, type, gain) {
    if (!S.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = actx.currentTime + 0.01;
      notes.forEach(([f, at, dur]) => {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = type || 'sine';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0 + at);
        g.gain.exponentialRampToValueAtTime(gain || 0.06, t0 + at + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
        o.connect(g).connect(actx.destination);
        o.start(t0 + at);
        o.stop(t0 + at + dur + 0.05);
      });
    } catch (e) { /* audio unavailable */ }
  }
  const sfx = {
    tap: () => tone([[1320, 0, 0.05]], 'sine', 0.025),
    ok: () => tone([[784, 0, 0.12], [1175, 0.09, 0.24]], 'sine', 0.06),
    bad: () => tone([[233, 0, 0.16], [185, 0.11, 0.26]], 'triangle', 0.07),
    match: () => tone([[988, 0, 0.09]], 'sine', 0.04),
    win: () => tone([[523, 0, 0.16], [659, 0.12, 0.16], [784, 0.24, 0.16], [1047, 0.36, 0.5]], 'sine', 0.06),
    unlock: () => tone([[880, 0, 0.1], [1319, 0.09, 0.35]], 'sine', 0.05),
  };

  /* ---------- small animations ---------- */
  function countUp(el, from, to, dur) {
    if (!el) return;
    if (reduced || from === to) { el.textContent = to; return; }
    const t0 = performance.now();
    const step = now => {
      const t = Math.min(1, (now - t0) / (dur || 900));
      el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function floatText(anchor, text, cls) {
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const f = h('div', { class: 'float-txt ' + (cls || '') }, text);
    f.style.left = r.left + r.width / 2 + 'px';
    f.style.top = r.top + 'px';
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 1400);
  }

  function confetti() {
    if (reduced) return;
    const c = h('canvas', { class: 'confetti', 'aria-hidden': 'true' });
    document.body.appendChild(c);
    const ctx = c.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const Wd = window.innerWidth, Hd = window.innerHeight;
    c.width = Wd * dpr; c.height = Hd * dpr;
    ctx.scale(dpr, dpr);
    const cols = ['#16B67F', '#2F6BFF', '#FFB21E', '#FF3B5C', '#7C5CFF', '#14B8C8'];
    const P = Array.from({ length: 150 }, () => ({
      x: Wd / 2 + (Math.random() - 0.5) * 160, y: Hd * 0.3,
      vx: (Math.random() - 0.5) * 15, vy: -Math.random() * 15 - 5,
      r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
      w: 6 + Math.random() * 6, hgt: 8 + Math.random() * 8, c: cols[(Math.random() * cols.length) | 0],
    }));
    const t0 = performance.now();
    (function frame(now) {
      const t = now - t0;
      ctx.clearRect(0, 0, Wd, Hd);
      P.forEach(p => {
        p.vy += 0.38; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.globalAlpha = Math.max(0, 1 - t / 2800);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.hgt / 2, p.w, p.hgt * Math.cos(p.r * 2));
        ctx.restore();
      });
      if (t < 2800) requestAnimationFrame(frame); else c.remove();
    })(t0);
  }

  /* ---------- modal ---------- */
  function modal({ art, title, body, actions, dismissable = true }) {
    const bd = h('div', { class: 'modal-bd' });
    const close = () => { bd.classList.remove('in'); setTimeout(() => bd.remove(), 260); };
    const card = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      art ? h('div', { class: 'modal-art' }, art) : null,
      h('h3', null, title),
      body ? h('p', { class: 'modal-body' }, body) : null,
      h('div', { class: 'modal-actions' }, actions.map(a => h('button', {
        class: 'btn ' + (a.kind || 'btn-primary') + ' btn-block',
        onclick: () => { close(); a.onClick && a.onClick(); },
      }, a.label))));
    bd.appendChild(card);
    if (dismissable) bd.addEventListener('click', e => { if (e.target === bd) close(); });
    document.body.appendChild(bd);
    requestAnimationFrame(() => bd.classList.add('in'));
    setTimeout(() => { const b = card.querySelector('.btn'); b && b.focus(); }, 60);
    return { close, card };
  }

  /* =========================================================
   * HOME
   * ========================================================= */
  let pending = null; // animations to play on return to the path
  let heartTimer = null;
  const OFFS = [0, 56, 84, 56, 0, -56, -84, -56];

  function logo() {
    return h('span', { class: 'logo', html: '<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="url(#lg)"/><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1FD18F"/><stop offset="1" stop-color="#0E9F6E"/></linearGradient></defs><path d="M10 9v3M10 21v2M22 7v3M22 19v3" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".7"/><rect x="7.5" y="12" width="5" height="9" rx="1.3" fill="#fff" opacity=".75"/><rect x="19.5" y="10" width="5" height="9" rx="1.3" fill="#fff"/></svg>' });
  }

  function header() {
    return h('header', { class: 'topbar' },
      h('div', { class: 'topbar-in' },
        h('div', { class: 'brand' }, logo(), h('span', { class: 'wordmark' }, 'Stoxed')),
        h('div', { class: 'stats' },
          h('div', { class: 'stat streak' + (liveStreak() ? ' lit' : ''), id: 'st-streak', title: 'Day streak' }, icon('flame'), h('span', { id: 'streakv' }, liveStreak())),
          h('div', { class: 'stat xp', id: 'st-xp', title: 'Total XP' }, icon('bolt'), h('span', { id: 'xpv' }, S.xp)),
          h('div', { class: 'stat hearts', id: 'st-hearts', title: 'Hearts' }, icon('heart'), h('span', { id: 'heartv' }, S.hearts)),
          h('button', {
            class: 'icon-btn', id: 'snd', 'aria-label': 'Toggle sound', 'aria-pressed': String(S.sound),
            onclick: e => {
              S.sound = !S.sound; save();
              const b = e.currentTarget;
              b.replaceChildren(icon(S.sound ? 'sound' : 'mute'));
              b.setAttribute('aria-pressed', String(S.sound));
              sfx.tap();
            },
          }, icon(S.sound ? 'sound' : 'mute')))));
  }

  function renderHome() {
    syncHearts();
    clearInterval(heartTimer);
    document.removeEventListener('click', closePops);
    const app = $('#app');
    app.className = 'screen-home';
    const main = h('main', { class: 'home' }, buildPath(), buildSide());
    app.replaceChildren(header(), main);
    document.addEventListener('click', closePops);
    heartTimer = setInterval(tickHearts, 1000);
    runHomeAnims();
  }

  function tickHearts() {
    const before = S.hearts;
    syncHearts();
    const t = $('#heart-timer');
    if (t) t.textContent = S.hearts >= MAX_HEARTS ? 'Hearts are full' : `Next heart in ${mmss(nextHeartIn())}`;
    if (S.hearts !== before) {
      const v = $('#heartv'); if (v) v.textContent = S.hearts;
      const row = $('#heart-row'); if (row) row.replaceWith(heartRow());
    }
  }

  function buildPath() {
    const sec = h('section', { class: 'path', 'aria-label': 'Learning path' });
    let k = 0;
    units.forEach((u, ui) => {
      const doneCount = u.lessons.filter(id => S.done[id]).length;
      sec.appendChild(h('div', { class: `unit tone-${u.tone}` },
        h('div', { class: 'unit-txt' },
          h('div', { class: 'unit-kicker' }, `Unit ${ui + 1} · ${doneCount}/${u.lessons.length} complete`),
          h('h2', null, u.title),
          h('p', null, u.desc)),
        h('div', { class: 'unit-ico' }, icon(u.icon))));
      const list = h('div', { class: 'nodes' });
      u.lessons.forEach(id => { list.appendChild(nodeEl(byId[id], k, u)); k++; });
      sec.appendChild(list);
    });
    const allDone = ORDER.every(l => S.done[l.id]);
    sec.appendChild(h('div', { class: 'nodes' },
      h('div', { class: 'node-wrap trophy ' + (allDone ? 'done' : 'locked'), style: `--x:${OFFS[k % 8]}px` },
        h('button', {
          class: 'node', 'aria-label': 'Course trophy',
          onclick: e => {
            e.stopPropagation();
            modal({
              art: icon('trophy', 'big gold'),
              title: allDone ? 'Course complete!' : 'The Stoxed trophy',
              body: allDone
                ? `You finished every lesson with ${S.xp} XP. Replay any lesson to sharpen your skills.`
                : 'Finish every lesson on the path to earn it.',
              actions: [{ label: 'Nice' }],
            });
          },
        }, h('span', { class: 'node-face' }, icon('trophy'))),
        h('div', { class: 'node-label' }, 'Trophy'))));
    return sec;
  }

  function nodeEl(L, idx, u) {
    const done = !!S.done[L.id];
    const state = done ? 'done' : isUnlocked(idx) ? 'current' : 'locked';
    const unlocking = pending && pending.unlocked === L.id;
    const perfect = done && S.done[L.id].best === 100;
    const wrap = h('div', {
      class: `node-wrap ${state} tone-${u.tone}${unlocking ? ' unlocking' : ''}`,
      style: `--x:${OFFS[idx % 8]}px`, 'data-id': L.id,
    });
    if (state === 'current') wrap.appendChild(h('div', { class: 'start-bubble' }, idx === 0 && !S.xp ? 'Start here' : 'Start'));
    wrap.appendChild(h('button', {
      class: 'node',
      'aria-label': `${L.title}, ${state === 'locked' ? 'locked' : state === 'done' ? 'completed' : 'up next'}`,
      onclick: e => { e.stopPropagation(); togglePop(wrap, L, state); },
    },
    state === 'current' ? h('span', { class: 'node-ring' }) : null,
    h('span', { class: 'node-face' }, icon(state === 'locked' ? 'lock' : L.icon)),
    unlocking ? h('span', { class: 'node-lock-fall' }, icon('lock')) : null,
    done ? h('span', { class: 'node-badge' + (perfect ? ' gold' : '') }, icon(perfect ? 'star' : 'check')) : null));
    wrap.appendChild(h('div', { class: 'node-label' }, L.title));
    return wrap;
  }

  function closePops() {
    document.querySelectorAll('.popover').forEach(p => {
      p.classList.remove('in');
      p.parentElement.classList.remove('open');
      setTimeout(() => p.remove(), 180);
    });
  }

  function togglePop(wrap, L, state) {
    const had = wrap.querySelector('.popover');
    closePops();
    if (had) return;
    sfx.tap();
    const graded = L.steps.filter(s => s.type !== 'learn').length;
    const rec = S.done[L.id];
    const pop = h('div', { class: `popover ${state}`, onclick: e => e.stopPropagation() },
      h('div', { class: 'pop-title' }, L.title),
      h('p', { class: 'pop-sub' }, state === 'locked' ? 'Finish the previous lesson to unlock this one.' : L.desc),
      state !== 'locked' ? h('div', { class: 'pop-meta' },
        h('span', null, `${L.steps.length - graded} concepts`), h('span', null, `${graded} exercises`),
        rec ? h('span', null, `Best ${rec.best}%`) : null) : null,
      state !== 'locked'
        ? h('button', { class: 'btn btn-primary btn-block', onclick: () => startLesson(L) },
          state === 'done' ? 'Practice · +5 XP' : 'Start lesson · +15 XP')
        : h('button', { class: 'btn btn-ghost btn-block', disabled: true }, icon('lock'), ' Locked'));
    wrap.appendChild(pop);
    wrap.classList.add('open');
    requestAnimationFrame(() => pop.classList.add('in'));
    const r = pop.getBoundingClientRect();
    if (r.bottom > window.innerHeight - 12) window.scrollBy({ top: r.bottom - window.innerHeight + 24, behavior: reduced ? 'auto' : 'smooth' });
  }

  function heartRow() {
    return h('div', { class: 'heart-row', id: 'heart-row' },
      Array.from({ length: MAX_HEARTS }, (_, i) => icon('heart', i < S.hearts ? 'on' : 'off')));
  }

  function buildSide() {
    const today = S.xpDays[dayKey()] || 0;
    const pct = Math.min(1, today / S.goal);
    const R = 30, C = 2 * Math.PI * R;
    const doneN = ORDER.filter(l => S.done[l.id]).length;
    const week = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return { label: 'SMTWTFS'[d.getDay()], on: !!S.xpDays[dayKey(d)], today: i === 6 };
    });

    const ring = h('div', {
      class: 'goal-ring',
      html: `<svg viewBox="0 0 72 72" aria-hidden="true"><circle cx="36" cy="36" r="${R}" class="trk"/><circle cx="36" cy="36" r="${R}" class="val" stroke-dasharray="${C}" stroke-dashoffset="${C}" data-off="${C * (1 - pct)}"/></svg>`,
    }, h('span', { class: 'goal-ico' }, icon(pct >= 1 ? 'check' : 'target')));

    return h('aside', { class: 'side' },
      h('div', { class: 'card streak-card' + (liveStreak() ? ' lit' : '') },
        h('div', { class: 'card-row' },
          h('div', { class: 'big-flame', id: 'big-flame' }, icon('flame')),
          h('div', null,
            h('div', { class: 'card-big' }, liveStreak(), h('small', null, liveStreak() === 1 ? ' day streak' : ' day streak')),
            h('div', { class: 'card-sub' }, S.lastDay === dayKey() ? 'You’ve practiced today. Nice.' : 'Finish a lesson today to keep it alive.'))),
        h('div', { class: 'week' }, week.map(d => h('div', { class: 'wd' + (d.on ? ' on' : '') + (d.today ? ' today' : '') }, h('span', { class: 'dot' }, d.on ? icon('check') : null), h('span', null, d.label))))),

      h('div', { class: 'card goal-card' },
        h('div', { class: 'card-row' }, ring,
          h('div', null,
            h('div', { class: 'card-title' }, 'Daily goal'),
            h('div', { class: 'card-big' }, h('span', { id: 'goalv' }, today), h('small', null, ` / ${S.goal} XP`)),
            h('div', { class: 'card-sub' }, pct >= 1 ? 'Goal smashed. See you tomorrow!' : `${S.goal - today} XP to go today`)))),

      h('div', { class: 'card' },
        h('div', { class: 'card-title' }, 'Course progress'),
        h('div', { class: 'meter' }, h('div', { class: 'meter-fill', style: `width:${(doneN / ORDER.length) * 100}%` })),
        h('div', { class: 'card-sub' }, `${doneN} of ${ORDER.length} lessons complete`)),

      h('div', { class: 'card' },
        h('div', { class: 'card-title' }, 'Hearts'),
        heartRow(),
        h('div', { class: 'card-sub', id: 'heart-timer' }, S.hearts >= MAX_HEARTS ? 'Hearts are full' : `Next heart in ${mmss(nextHeartIn())}`)),

      h('button', {
        class: 'link-btn', onclick: () => modal({
          title: 'Reset all progress?',
          body: 'This clears your XP, streak and completed lessons on this device.',
          actions: [
            { label: 'Reset progress', kind: 'btn-danger', onClick: () => { S = defaults(); save(); renderHome(); } },
            { label: 'Cancel', kind: 'btn-ghost' },
          ],
        }),
      }, 'Reset progress'));
  }

  function runHomeAnims() {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const val = $('.goal-ring .val');
      if (val) val.style.strokeDashoffset = val.dataset.off;
    }));
    const p = pending;
    pending = null;
    if (!p) {
      const cur = $('.node-wrap.current');
      if (cur && cur.getBoundingClientRect().top > window.innerHeight * 0.7) cur.scrollIntoView({ block: 'center' });
      return;
    }
    const xpv = $('#xpv');
    countUp(xpv, p.xpFrom, S.xp, 1100);
    floatText($('#st-xp'), `+${p.xpGain} XP`, 'gold');
    const gv = $('#goalv');
    if (gv) countUp(gv, Math.max(0, (S.xpDays[dayKey()] || 0) - p.xpGain), S.xpDays[dayKey()] || 0, 1100);
    if (p.streakUp) {
      restart($('#st-streak'), 'ignite');
      const bf = $('#big-flame'); if (bf) restart(bf, 'ignite');
    }
    if (p.unlocked) {
      const node = $(`.node-wrap[data-id="${p.unlocked}"]`);
      if (node) {
        node.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
        setTimeout(sfx.unlock, 650);
      }
    }
  }

  /* =========================================================
   * LESSON PLAYER
   * ========================================================= */
  let LS = null;

  const KICKER = {
    mc: 'Choose the answer', tf: 'True or false?', fill: 'Fill in the blanks', label: 'Label the chart',
    pick: 'Read the chart', match: 'Match the pairs', num: 'Run the numbers',
  };
  const PRAISE = ['Nicely done!', 'Great read!', 'Spot on!', 'Exactly right!', 'You nailed it!', 'Sharp eye!', 'Correct!'];

  function startLesson(L) {
    syncHearts();
    closePops();
    if (S.hearts <= 0) { outOfHearts(false); return; }
    clearInterval(heartTimer);
    document.removeEventListener('click', closePops);
    LS = {
      L, practice: !!S.done[L.id],
      queue: L.steps.map((s, i) => ({ s, id: i, retry: false })),
      done: 0, total: L.steps.length,
      graded: L.steps.filter(s => s.type !== 'learn').length,
      firstOk: 0, combo: 0, t0: Date.now(), q: null, phase: 'answer',
    };
    const app = $('#app');
    app.className = 'screen-lesson';
    app.replaceChildren(h('div', { class: 'lesson' },
      h('div', { class: 'ltop' },
        h('button', { class: 'icon-btn', 'aria-label': 'Quit lesson', onclick: confirmQuit }, icon('x')),
        h('div', { class: 'lbar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0' },
          h('div', { class: 'lbar-fill' }, h('span', { class: 'lbar-shine' })),
          h('div', { class: 'lbar-combo' })),
        h('div', { class: 'lhearts', id: 'lhearts', 'aria-label': 'Hearts left' }, icon('heart'), h('span', { id: 'lheartv' }, S.hearts))),
      h('div', { class: 'lstage', id: 'stage' }),
      h('footer', { class: 'lfoot', id: 'foot' })));
    window.scrollTo(0, 0);
    nextStep();
  }

  function updateBar() {
    const pct = (LS.done / LS.total) * 100;
    const bar = $('.lbar');
    $('.lbar-fill').style.width = Math.max(pct, 2) + '%';
    bar.setAttribute('aria-valuenow', Math.round(pct));
    bar.classList.toggle('hot', LS.combo >= 3);
    const combo = $('.lbar-combo');
    if (LS.combo >= 3) {
      combo.textContent = `${LS.combo} in a row`;
      restart(combo, 'show');
    } else combo.classList.remove('show');
  }

  function nextStep() {
    if (!LS.queue.length) { finishLesson(); return; }
    const item = LS.queue.shift();
    LS.cur = item;
    LS.phase = 'answer';
    const s = item.s;
    const step = h('div', { class: 'step' });
    if (s.type === 'learn') {
      LS.q = null;
      step.appendChild(renderLearn(s));
    } else {
      step.appendChild(h('div', { class: 'q-kicker' + (item.retry ? ' retry' : '') },
        item.retry ? [icon('retry'), 'Previous mistake'] : KICKER[s.type]));
      step.appendChild(h('h2', { class: 'q-prompt' }, s.prompt));
      LS.q = RENDER[s.type](s, { setReady, complete: onResult });
      step.appendChild(LS.q.el);
    }
    const stage = $('#stage');
    stage.replaceChildren(step);
    stage.scrollTop = 0;
    requestAnimationFrame(() => step.classList.add('in'));
    setFoot(s.type === 'learn' ? 'learn' : LS.q.auto ? 'auto' : 'check');
    updateBar();
  }

  function setReady(v) {
    const b = $('#primary');
    if (b && LS.phase === 'answer') b.disabled = !v;
  }

  function setFoot(mode, res) {
    const foot = $('#foot');
    foot.className = 'lfoot';
    if (mode === 'learn') {
      foot.replaceChildren(h('div', { class: 'foot-in' }, h('div', { class: 'foot-note' }),
        h('button', { class: 'btn btn-primary', id: 'primary', onclick: () => { LS.done++; sfx.tap(); nextStep(); } }, 'Continue')));
    } else if (mode === 'check') {
      foot.replaceChildren(h('div', { class: 'foot-in' }, h('div', { class: 'foot-note' }),
        h('button', { class: 'btn btn-primary', id: 'primary', disabled: true, onclick: () => { if (LS.phase === 'answer') onResult(LS.q.check()); } }, 'Check')));
    } else if (mode === 'auto') {
      foot.replaceChildren(h('div', { class: 'foot-in' }, h('div', { class: 'foot-note' }, 'Tap one item on each side to make a pair')));
    } else {
      const ok = res.ok;
      foot.classList.add(ok ? 'ok' : 'bad');
      foot.replaceChildren(h('div', { class: 'foot-in' },
        h('div', { class: 'fb', role: 'status', 'aria-live': 'polite' },
          h('div', { class: 'fb-ico' }, icon(ok ? 'check' : 'x')),
          h('div', { class: 'fb-txt' },
            h('div', { class: 'fb-title' }, ok ? (res.mistakes ? 'Matched them all!' : PRAISE[(Math.random() * PRAISE.length) | 0]) : 'Not quite'),
            !ok && res.answer ? h('div', { class: 'fb-ans' }, h('b', null, 'Answer: '), res.answer) : null,
            LS.cur.s.explain ? h('p', { class: 'fb-exp' }, LS.cur.s.explain) : null)),
        h('button', { class: 'btn ' + (ok ? 'btn-primary' : 'btn-danger'), id: 'primary', onclick: afterResult }, 'Continue')));
      requestAnimationFrame(() => foot.classList.add('show'));
    }
  }

  function onResult(r) {
    if (LS.phase !== 'answer') return;
    LS.phase = 'result';
    if (LS.q.lock) LS.q.lock();
    if (r.ok) {
      LS.done++;
      if (!LS.cur.retry && !r.mistakes) LS.firstOk++;
      LS.combo = r.mistakes ? 0 : LS.combo + 1;
      sfx.ok();
      updateBar();
      restart($('.lbar'), 'pulse');
    } else {
      LS.combo = 0;
      sfx.bad();
      loseHeart();
      const lh = $('#lhearts');
      $('#lheartv').textContent = S.hearts;
      restart(lh, 'hit');
      LS.queue.push({ s: LS.cur.s, id: LS.cur.id, retry: true });
      updateBar();
    }
    setFoot('result', r);
  }

  function afterResult() {
    if (S.hearts <= 0) { outOfHearts(true); return; }
    nextStep();
  }

  function confirmQuit() {
    modal({
      art: h('div', { class: 'modal-emoji' }, '🥺'),
      title: 'Leave this lesson?',
      body: 'You’ll lose your progress in this lesson.',
      actions: [
        { label: 'Keep learning' },
        { label: 'End lesson', kind: 'btn-ghost danger-txt', onClick: () => { LS = null; renderHome(); } },
      ],
    });
  }

  function outOfHearts(inLesson) {
    const actions = [];
    if (S.xp >= REFILL_COST) {
      actions.push({
        label: `Refill hearts · ${REFILL_COST} XP`,
        onClick: () => {
          S.xp -= REFILL_COST; S.hearts = MAX_HEARTS; S.heartTs = Date.now(); save();
          if (inLesson) { $('#lheartv').textContent = S.hearts; nextStep(); } else renderHome();
        },
      });
    }
    actions.push({
      label: inLesson ? 'End lesson' : 'Back to path',
      kind: actions.length ? 'btn-ghost' : 'btn-primary',
      onClick: () => { LS = null; renderHome(); },
    });
    modal({
      dismissable: false,
      art: h('div', { class: 'heart-art' }, icon('heart')),
      title: 'You’re out of hearts',
      body: `Hearts refill one every ${HEART_MS / 60000} minutes. Next heart in ${mmss(nextHeartIn())}.`,
      actions,
    });
  }

  function finishLesson() {
    const L = LS.L;
    const acc = LS.graded ? Math.round((LS.firstOk / LS.graded) * 100) : 100;
    const perfect = acc === 100;
    const xp = (LS.practice ? 5 : 15) + (perfect ? 5 : 0);
    const secs = Math.round((Date.now() - LS.t0) / 1000);
    const today = dayKey();
    const xpFrom = S.xp;
    S.xp += xp;
    S.xpDays[today] = (S.xpDays[today] || 0) + xp;
    let streakUp = false;
    if (S.lastDay !== today) {
      S.streak = S.lastDay === daysAgo(1) ? S.streak + 1 : 1;
      S.lastDay = today;
      streakUp = true;
    }
    const firstTime = !S.done[L.id];
    const prev = S.done[L.id] || { best: 0, times: 0 };
    S.done[L.id] = { best: Math.max(prev.best, acc), times: prev.times + 1 };
    save();
    const idx = ORDER.indexOf(L);
    const next = firstTime ? ORDER[idx + 1] : null;
    pending = { xpFrom, xpGain: xp, unlocked: next ? next.id : null, streakUp };
    renderResults({ L, xp, acc, secs, streakUp, perfect, courseDone: firstTime && !next });
  }

  function renderResults(r) {
    LS = null;
    sfx.win();
    confetti();
    const app = $('#app');
    app.className = 'screen-results';
    const tile = (cls, label, ico, valEl) => h('div', { class: 'tile ' + cls }, h('div', { class: 'tile-h' }, label), h('div', { class: 'tile-v' }, icon(ico), valEl));
    const xpEl = h('span', null, '0');
    const accEl = h('span', null, '0');
    const t = `${Math.floor(r.secs / 60)}:${String(r.secs % 60).padStart(2, '0')}`;
    const panel = h('div', { class: 'results' },
      h('div', { class: 'res-art', html: resultArt() }),
      h('h1', null, r.courseDone ? 'Course complete!' : r.perfect ? 'Perfect lesson!' : 'Lesson complete!'),
      h('p', { class: 'res-sub' }, r.courseDone ? 'You’ve worked through every lesson on the path. You’re officially Stoxed.' : `You finished “${r.L.title}”.`),
      h('div', { class: 'tiles' },
        tile('gold', 'XP earned', 'bolt', xpEl),
        tile('green', r.perfect ? 'Perfect' : 'Accuracy', 'target', h('span', null, accEl, '%')),
        tile('blue', 'Time', 'clock', h('span', null, t))),
      r.streakUp ? h('div', { class: 'res-streak' }, icon('flame'), h('span', null, h('b', null, `${liveStreak()} day streak`), liveStreak() > 1 ? ' — keep it going!' : ' — you started a streak!')) : null,
      h('button', { class: 'btn btn-primary btn-wide', id: 'primary', onclick: renderHome }, 'Continue'));
    app.replaceChildren(panel);
    window.scrollTo(0, 0);
    setTimeout(() => { countUp(xpEl, 0, r.xp, 800); countUp(accEl, 0, r.acc, 1000); }, 450);
  }

  function resultArt() {
    return `<svg viewBox="0 0 160 120" aria-hidden="true">
      <defs><linearGradient id="ra" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--bull)" stop-opacity=".35"/><stop offset="1" stop-color="var(--bull)" stop-opacity="0"/></linearGradient></defs>
      <circle cx="80" cy="60" r="56" fill="var(--bull-soft)"/>
      <path class="ra-area" d="M28 92 L50 78 L64 84 L84 58 L98 64 L128 30 L128 100 L28 100Z" fill="url(#ra)"/>
      <path class="ra-line" d="M28 92 L50 78 L64 84 L84 58 L98 64 L128 30" fill="none" stroke="var(--bull)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/>
      <circle class="ra-dot" cx="128" cy="30" r="8" fill="var(--bull)"/>
      <circle class="ra-dot" cx="128" cy="30" r="3.5" fill="#fff"/>
    </svg>`;
  }

  /* =========================================================
   * QUESTION RENDERERS
   * ========================================================= */
  function chartCard(cfg) {
    const api = Chart.render(cfg);
    return h('div', { class: 'chart-card' }, api.el);
  }

  function renderLearn(s) {
    return h('div', { class: 'learn' },
      h('div', { class: 'learn-kicker' }, icon('spark'), 'New concept'),
      h('h2', { class: 'learn-title' }, s.title),
      h('div', { class: 'learn-body', html: s.body }),
      s.chart ? chartCard(s.chart) : null,
      s.formula ? h('div', { class: 'formula', html: s.formula }) : null,
      s.points ? h('ul', { class: 'learn-points' }, s.points.map(p => h('li', { html: p }))) : null,
      s.tip ? h('div', { class: 'tip' }, icon('bulb'), h('span', { html: s.tip })) : null);
  }

  const RENDER = {};

  function choice(s, ctx, options, answerIdx) {
    const el = h('div', { class: 'q q-choice' });
    if (s.chart) el.appendChild(chartCard(s.chart));
    const order = s.shuffle === false ? options.map((_, i) => i) : shuffle(options.map((_, i) => i));
    let sel = -1, locked = false;
    const btns = order.map((oi, k) => h('button', { class: 'opt', onclick: () => pick(k) },
      h('span', { class: 'opt-key' }, k + 1), h('span', { class: 'opt-txt' }, options[oi])));
    el.appendChild(h('div', { class: 'opts' + (options.length === 2 ? ' two' : '') }, btns));
    function pick(k) {
      if (locked || k < 0 || k >= btns.length) return;
      sel = k;
      btns.forEach((b, j) => b.classList.toggle('sel', j === k));
      restart(btns[k], 'press');
      sfx.tap();
      ctx.setReady(true);
    }
    return {
      el,
      key: n => pick(n - 1),
      lock() { locked = true; el.classList.add('locked'); },
      check() {
        const ok = order[sel] === answerIdx;
        btns[sel].classList.add(ok ? 'right' : 'wrong');
        if (!ok) btns[order.indexOf(answerIdx)].classList.add('reveal');
        return { ok, answer: options[answerIdx] };
      },
    };
  }
  RENDER.mc = (s, ctx) => choice(s, ctx, s.options, s.answer);
  RENDER.tf = (s, ctx) => choice(Object.assign({}, s, { shuffle: false }), ctx, ['True', 'False'], s.answer ? 0 : 1);

  RENDER.fill = (s, ctx) => {
    const parts = s.text.split('___');
    const slots = Array(parts.length - 1).fill(-1);
    let locked = false;
    const chips = s.bank.map((w, i) => h('button', { class: 'chip', onclick: () => tapChip(i) }, w));
    const slotEls = [];
    const sentence = h('p', { class: 'sentence' });
    parts.forEach((p, i) => {
      sentence.appendChild(document.createTextNode(p));
      if (i < slots.length) {
        const se = h('button', { class: 'slot', 'aria-label': `Blank ${i + 1}`, onclick: () => tapSlot(i) });
        slotEls.push(se);
        sentence.appendChild(se);
      }
    });
    const bank = h('div', { class: 'bank' }, shuffle(chips.map((_, i) => i)).map(i => h('span', { class: 'chip-hold' }, chips[i])));
    function paint() {
      slotEls.forEach((se, k) => {
        const i = slots[k];
        se.textContent = i < 0 ? '' : s.bank[i];
        se.classList.toggle('filled', i >= 0);
      });
      ctx.setReady(slots.every(v => v >= 0));
    }
    function tapChip(i) {
      if (locked || chips[i].classList.contains('used')) return;
      const k = slots.indexOf(-1);
      if (k < 0) return;
      slots[k] = i;
      chips[i].classList.add('used');
      paint();
      restart(slotEls[k], 'pop');
      sfx.tap();
    }
    function tapSlot(k) {
      if (locked || slots[k] < 0) return;
      chips[slots[k]].classList.remove('used');
      slots[k] = -1;
      paint();
    }
    const norm = v => String(v).trim().toLowerCase();
    return {
      el: h('div', { class: 'q q-fill' }, h('div', { class: 'card sentence-card' }, sentence), bank),
      lock() { locked = true; },
      check() {
        let ok = true;
        slotEls.forEach((se, k) => {
          const good = norm(s.bank[slots[k]]) === norm(s.answer[k]);
          se.classList.add(good ? 'right' : 'wrong');
          ok = ok && good;
        });
        let full = parts[0];
        s.answer.forEach((a, k) => { full += a + parts[k + 1]; });
        return { ok, answer: full };
      },
    };
  };

  RENDER.num = (s, ctx) => {
    const parse = v => {
      const t = String(v).replace(/[,$%\s]/g, '');
      return t === '' || isNaN(+t) ? null : +t;
    };
    const input = h('input', { class: 'num-in', inputmode: 'decimal', autocomplete: 'off', placeholder: '0', 'aria-label': 'Your answer' });
    input.addEventListener('input', () => ctx.setReady(parse(input.value) != null));
    const wrap = h('label', { class: 'num-wrap' },
      s.prefix ? h('span', { class: 'num-aff' }, s.prefix) : null, input,
      s.suffix ? h('span', { class: 'num-aff' }, s.suffix) : null);
    const el = h('div', { class: 'q q-num' },
      s.chart ? chartCard(s.chart) : null,
      s.given ? h('div', { class: 'ticket' }, s.given.map(([k, v]) => h('div', { class: 'ticket-row' }, h('span', null, k), h('b', null, v)))) : null,
      wrap);
    setTimeout(() => input.focus({ preventScroll: true }), 350);
    const fmtAns = `${s.prefix || ''}${s.answer.toLocaleString()}${s.suffix ? (s.suffix === '%' ? '%' : ' ' + s.suffix) : ''}`;
    return {
      el,
      lock() { input.disabled = true; },
      check() {
        const v = parse(input.value);
        const tol = s.tol != null ? s.tol : Math.max(0.001, Math.abs(s.answer) * 0.005);
        const ok = v != null && Math.abs(v - s.answer) <= tol;
        wrap.classList.add(ok ? 'right' : 'wrong');
        return { ok, answer: fmtAns };
      },
    };
  };

  RENDER.pick = (s, ctx) => {
    let sel = -1;
    const api = Chart.render(Object.assign({}, s.chart, { pick: i => { sel = i; sfx.tap(); ctx.setReady(true); } }));
    const el = h('div', { class: 'q q-pick' },
      h('div', { class: 'chart-card' }, api.el,
        h('div', { class: 'chart-hint' }, icon('tap'), 'Tap a candle to select it')));
    return {
      el,
      lock() { api.lock(); },
      check() {
        const ok = Math.abs(sel - s.answer) <= (s.tol || 0);
        api.mark(sel, ok ? 'ok' : 'bad');
        if (!ok) api.mark(s.answer, 'ok reveal');
        return { ok, answer: 'The highlighted candle' };
      },
    };
  };

  RENDER.label = (s, ctx) => {
    const api = Chart.render(s.chart);
    const labels = shuffle(s.targets.map(t => t.label).concat(s.extra || []));
    const placed = new Array(s.targets.length).fill(null);
    let selected = null, locked = false;

    const drops = s.targets.map((t, ti) => {
      const ax = api.X(t.i), ay = api.Y(t.p);
      const tx = ax + (t.dx || 0), ty = ay + (t.dy || 0);
      api.leader(ax, ay, tx, ty);
      const d = h('button', {
        class: 'drop', 'aria-label': `Drop zone ${ti + 1}`,
        style: `left:${(tx / api.W) * 100}%;top:${(ty / api.H) * 100}%`,
        onclick: () => tapDrop(ti),
      }, h('span', null, '?'));
      api.layer.appendChild(d);
      return d;
    });

    const chips = labels.map(lb => {
      const c = h('button', { class: 'chip lchip', 'data-label': lb }, lb);
      bindDrag(c, lb);
      return c;
    });
    const chipFor = lb => chips.find(c => c.dataset.label === lb);

    function paint() {
      drops.forEach((d, ti) => {
        d.classList.toggle('filled', placed[ti] != null);
        d.firstChild.textContent = placed[ti] != null ? placed[ti] : '?';
      });
      chips.forEach(c => {
        c.classList.toggle('used', placed.includes(c.dataset.label));
        c.classList.toggle('sel', selected === c.dataset.label);
      });
      drops.forEach(d => d.classList.toggle('armed', selected != null));
      ctx.setReady(placed.every(p => p != null));
    }
    function place(ti, lb) {
      const prevAt = placed.indexOf(lb);
      if (prevAt >= 0) placed[prevAt] = null;
      placed[ti] = lb;
      selected = null;
      paint();
      restart(drops[ti], 'pop');
      sfx.tap();
    }
    function tapDrop(ti) {
      if (locked) return;
      if (selected != null) place(ti, selected);
      else if (placed[ti] != null) { placed[ti] = null; paint(); }
    }
    function hitDrop(x, y) {
      let best = -1, bd = Infinity;
      drops.forEach((d, i) => {
        const r = d.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const inside = x > r.left - 22 && x < r.right + 22 && y > r.top - 22 && y < r.bottom + 22;
        const dist = Math.hypot(x - cx, y - cy);
        if (inside && dist < bd) { bd = dist; best = i; }
      });
      return best;
    }
    function bindDrag(chip, lb) {
      let start = null, ghost = null, over = -1;
      chip.addEventListener('pointerdown', e => {
        if (locked || chip.classList.contains('used')) return;
        start = { x: e.clientX, y: e.clientY, id: e.pointerId };
        chip.setPointerCapture(e.pointerId);
      });
      chip.addEventListener('pointermove', e => {
        if (!start) return;
        if (!ghost && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) {
          const r = chip.getBoundingClientRect();
          ghost = chip.cloneNode(true);
          ghost.className = 'chip lchip ghost';
          ghost.style.width = r.width + 'px';
          document.body.appendChild(ghost);
          chip.classList.add('dragging');
          selected = null;
          paint();
        }
        if (ghost) {
          ghost.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%) scale(1.06) rotate(-2deg)`;
          const hit = hitDrop(e.clientX, e.clientY);
          if (hit !== over) { drops.forEach((d, i) => d.classList.toggle('over', i === hit)); over = hit; }
        }
      });
      const end = e => {
        if (!start) return;
        if (ghost) {
          const hit = hitDrop(e.clientX, e.clientY);
          ghost.remove(); ghost = null;
          chip.classList.remove('dragging');
          drops.forEach(d => d.classList.remove('over'));
          if (hit >= 0 && e.type === 'pointerup') place(hit, lb);
        } else if (e.type === 'pointerup') {
          selected = selected === lb ? null : lb;
          paint();
          sfx.tap();
        }
        start = null; over = -1;
      };
      chip.addEventListener('pointerup', end);
      chip.addEventListener('pointercancel', end);
      chip.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault(); e.stopPropagation();
          selected = selected === lb ? null : lb; paint();
        }
      });
    }

    const el = h('div', { class: 'q q-label' },
      h('div', { class: 'chart-card' }, api.el),
      h('div', { class: 'bank' }, chips.map(c => h('span', { class: 'chip-hold' }, c))),
      h('div', { class: 'hint-line' }, icon('tap'), 'Drag a label onto the chart — or tap a label, then tap a spot'));
    return {
      el,
      lock() { locked = true; selected = null; drops.forEach(d => d.classList.remove('armed')); el.classList.add('locked'); },
      check() {
        let ok = true;
        drops.forEach((d, ti) => {
          const good = placed[ti] === s.targets[ti].label;
          ok = ok && good;
          d.classList.add(good ? 'right' : 'wrong');
          if (!good) setTimeout(() => {
            d.classList.remove('wrong');
            d.classList.add('fixed');
            d.firstChild.textContent = s.targets[ti].label;
          }, 900);
        });
        return { ok, answer: 'The correct labels are now shown on the chart.' };
      },
    };
  };

  RENDER.match = (s, ctx) => {
    const n = s.pairs.length;
    let selL = -1, selR = -1, mistakes = 0, matched = 0, busy = false, locked = false;
    const left = shuffle(s.pairs.map((_, i) => i)).map(i => ({ i, b: h('button', { class: 'mt', onclick: () => tap('L', i) }, s.pairs[i][0]) }));
    const right = shuffle(s.pairs.map((_, i) => i)).map(i => ({ i, b: h('button', { class: 'mt', onclick: () => tap('R', i) }, s.pairs[i][1]) }));
    const btn = (side, i) => (side === 'L' ? left : right).find(x => x.i === i).b;
    function tap(side, i) {
      if (locked || busy) return;
      const b = btn(side, i);
      if (b.classList.contains('done')) return;
      if (side === 'L') selL = selL === i ? -1 : i; else selR = selR === i ? -1 : i;
      left.forEach(x => x.b.classList.toggle('sel', x.i === selL));
      right.forEach(x => x.b.classList.toggle('sel', x.i === selR));
      sfx.tap();
      if (selL < 0 || selR < 0) return;
      const bl = btn('L', selL), br = btn('R', selR);
      busy = true;
      if (selL === selR) {
        [bl, br].forEach(x => { x.classList.remove('sel'); x.classList.add('good'); });
        sfx.match();
        matched++;
        setTimeout(() => { [bl, br].forEach(x => { x.classList.remove('good'); x.classList.add('done'); x.disabled = true; }); busy = false; }, 380);
        if (matched === n) setTimeout(() => ctx.complete({ ok: true, mistakes }), 520);
      } else {
        mistakes++;
        [bl, br].forEach(x => { x.classList.remove('sel'); restart(x, 'bad'); });
        setTimeout(() => { [bl, br].forEach(x => x.classList.remove('bad')); busy = false; }, 520);
      }
      selL = selR = -1;
    }
    return {
      el: h('div', { class: 'q q-match' },
        h('div', { class: 'match-col' }, left.map(x => x.b)),
        h('div', { class: 'match-col' }, right.map(x => x.b))),
      auto: true,
      lock() { locked = true; },
    };
  };

  /* ---------- keyboard ---------- */
  document.addEventListener('keydown', e => {
    if ($('.modal-bd')) return;
    const app = $('#app');
    if (e.key === 'Enter') {
      const t = e.target;
      if (t && t.tagName === 'BUTTON') return; // native activation handles it
      const b = $('#primary');
      if (b && !b.disabled && (app.classList.contains('screen-lesson') || app.classList.contains('screen-results'))) {
        e.preventDefault();
        b.click();
      }
    } else if (app.classList.contains('screen-lesson') && LS) {
      if (e.key === 'Escape') confirmQuit();
      else if (/^[1-9]$/.test(e.key) && LS.phase === 'answer' && LS.q && LS.q.key && e.target.tagName !== 'INPUT') LS.q.key(+e.key);
    }
  });

  // Read-only hook used by the automated playthrough test.
  window.__stoxed = { step: () => (LS && LS.cur ? LS.cur.s : null) };

  renderHome();
})();

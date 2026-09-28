/* Stoxed chart engine — a tiny, dependency-free SVG candlestick renderer.
 * Deterministic data generation (seeded) so every learner sees the same charts,
 * plus the indicator math (SMA, EMA, RSI, MACD) used by the lessons. */
(function (global) {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';

  function svg(tag, attrs, parent) {
    const el = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) if (attrs[k] != null) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  }

  /* ---------- data ---------- */

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // Sum of four uniforms, rescaled: approximately N(0, 1)
  const gauss = r => (r() + r() + r() + r() - 2) * 1.732;

  /** Build OHLCV candles that follow a path of [index, price] waypoints. */
  function gen(pts, opt) {
    const { seed = 7, vol = 1, wick = 0.7, vbase = 1000, gap = 0.12 } = opt || {};
    const r = rng(seed);
    const n = pts[pts.length - 1][0] + 1;
    const path = new Array(n);
    for (let k = 0; k < pts.length - 1; k++) {
      const [i0, p0] = pts[k], [i1, p1] = pts[k + 1];
      for (let i = i0; i <= i1; i++) path[i] = p0 + (p1 - p0) * ((i - i0) / (i1 - i0 || 1));
    }
    const out = [];
    let prev = path[0];
    for (let i = 0; i < n; i++) {
      const o = prev + gauss(r) * vol * gap;
      const c = path[i] + gauss(r) * vol * 0.55;
      const h = Math.max(o, c) + Math.abs(gauss(r)) * vol * wick;
      const l = Math.min(o, c) - Math.abs(gauss(r)) * vol * wick;
      const v = vbase * (0.65 + r() * 0.7) * (1 + Math.min(2, Math.abs(c - o) / vol) * 0.35);
      out.push({ o, h, l, c, v });
      prev = c;
    }
    return out;
  }

  /** Overwrite specific candles ({index: {o,h,l,c,v}}) and keep the next open continuous. */
  function patch(candles, map) {
    for (const k in map) {
      const i = +k, p = map[k], cd = candles[i];
      Object.assign(cd, p);
      cd.h = Math.max(cd.h, cd.o, cd.c);
      cd.l = Math.min(cd.l, cd.o, cd.c);
      const nx = candles[i + 1];
      if (nx && p.c != null) {
        nx.o = cd.c;
        nx.h = Math.max(nx.h, nx.o);
        nx.l = Math.min(nx.l, nx.o);
      }
    }
    return candles;
  }

  const closes = cs => cs.map(c => c.c);

  function sma(a, n) {
    const out = Array(a.length).fill(null);
    let s = 0;
    for (let i = 0; i < a.length; i++) {
      s += a[i];
      if (i >= n) s -= a[i - n];
      if (i >= n - 1) out[i] = s / n;
    }
    return out;
  }

  function ema(a, n) {
    const out = Array(a.length).fill(null);
    const start = a.findIndex(v => v != null);
    if (start < 0) return out;
    const k = 2 / (n + 1);
    let s = 0, prev = null;
    for (let i = start; i < a.length; i++) {
      if (prev == null) {
        s += a[i];
        if (i === start + n - 1) prev = s / n; else continue;
      } else prev = a[i] * k + prev * (1 - k);
      out[i] = prev;
    }
    return out;
  }

  /** Wilder's RSI */
  function rsi(a, n = 14) {
    const out = Array(a.length).fill(null);
    let g = 0, l = 0;
    const val = () => (l === 0 ? 100 : 100 - 100 / (1 + g / l));
    for (let i = 1; i < a.length; i++) {
      const d = a[i] - a[i - 1];
      const up = Math.max(d, 0), dn = Math.max(-d, 0);
      if (i <= n) {
        g += up; l += dn;
        if (i === n) { g /= n; l /= n; out[i] = val(); }
      } else {
        g = (g * (n - 1) + up) / n;
        l = (l * (n - 1) + dn) / n;
        out[i] = val();
      }
    }
    return out;
  }

  function macd(a, f = 12, s = 26, sig = 9) {
    const ef = ema(a, f), es = ema(a, s);
    const m = a.map((_, i) => (ef[i] != null && es[i] != null ? ef[i] - es[i] : null));
    const sg = ema(m, sig);
    const hist = m.map((v, i) => (v != null && sg[i] != null ? v - sg[i] : null));
    return { macd: m, signal: sg, hist };
  }

  /* ---------- rendering ---------- */

  function niceStep(span, count) {
    const raw = span / count;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const f = raw / mag;
    return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag;
  }
  const fmt = (v, step) => (step < 1 ? v.toFixed(1) : String(Math.round(v)));
  const textW = (s, size = 11) => s.length * size * 0.6 + 14;

  function pill(parent, x, y, text, tone, anchor) {
    const w = textW(text);
    const x0 = anchor === 'end' ? x - w : anchor === 'middle' ? x - w / 2 : x;
    const g = svg('g', { class: 'pill t-' + (tone || 'neutral') }, parent);
    svg('rect', { x: x0, y: y - 10, width: w, height: 20, rx: 10 }, g);
    const t = svg('text', { x: x0 + w / 2, y: y + 4, 'text-anchor': 'middle' }, g);
    t.textContent = text;
    return g;
  }

  function pathD(values, X, Y) {
    let d = '', pen = false;
    values.forEach((v, i) => {
      if (v == null) { pen = false; return; }
      d += (pen ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1);
      pen = true;
    });
    return d;
  }

  /**
   * cfg: { candles, height, width, axis, volume, candleMax, padTop, padBottom,
   *        overlays:[{values,tone,label}], hlines:[{p,tone,label,i0,i1,dash,axisTag}],
   *        lines:[{a:[i,p],b:[i,p],tone,dash}], boxes:[{i0,i1,p0,p1,tone,label}],
   *        notes:[{i,p,text,dx,dy,tone}], sub:{type:'rsi',values}|{type:'macd',macd,signal,hist},
   *        pick: fn(i), alt }
   */
  function render(cfg) {
    const W = cfg.width || 640;
    const mainH = cfg.height || 300;
    const sub = cfg.sub || null;
    const subH = sub ? cfg.subHeight || 110 : 0;
    const gapH = sub ? 18 : 0;
    const H = mainH + gapH + subH;
    const cs = cfg.candles, n = cs.length;
    const axis = cfg.axis !== false;
    const pad = { l: 12, r: axis ? 58 : 12, t: 16, b: 12 };

    let lo = Infinity, hi = -Infinity;
    const eat = p => { if (p != null && isFinite(p)) { lo = Math.min(lo, p); hi = Math.max(hi, p); } };
    cs.forEach(c => { eat(c.h); eat(c.l); });
    (cfg.overlays || []).forEach(o => o.values.forEach(eat));
    (cfg.hlines || []).forEach(l => eat(l.p));
    (cfg.boxes || []).forEach(b => { eat(b.p0); eat(b.p1); });
    (cfg.lines || []).forEach(l => { eat(l.a[1]); eat(l.b[1]); });
    const span = hi - lo || 1;
    lo -= span * (cfg.padBottom != null ? cfg.padBottom : 0.08);
    hi += span * (cfg.padTop != null ? cfg.padTop : 0.08);

    const volH = cfg.volume ? (mainH - pad.t - pad.b) * 0.22 : 0;
    const pT = pad.t, pB = mainH - pad.b - (cfg.volume ? volH + 8 : 0);
    const pL = pad.l, pR = W - pad.r;
    const slot = (pR - pL) / n;
    const X = i => pL + slot * (i + 0.5);
    const Y = p => pB - ((p - lo) / (hi - lo)) * (pB - pT);
    const cw = Math.min(cfg.candleMax || 18, Math.max(1.5, slot * 0.62));

    const root = svg('svg', {
      viewBox: `0 0 ${W} ${H}`, class: 'chart-svg', role: 'img',
      'aria-label': cfg.alt || 'Candlestick price chart',
    });

    // grid + price axis
    const grid = svg('g', { class: 'grid' }, root);
    const step = niceStep(hi - lo, 4);
    for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) {
      const y = Y(t);
      if (y < pT - 1 || y > pB + 1) continue;
      svg('line', { x1: pL, x2: pR, y1: y, y2: y, class: 'gl' }, grid);
      if (axis) svg('text', { x: pR + 10, y: y + 4, class: 'ax' }, grid).textContent = fmt(t, step);
    }

    // shaded boxes (risk / reward zones)
    (cfg.boxes || []).forEach(b => {
      const x0 = X(b.i0) - slot / 2, x1 = X(b.i1) + slot / 2;
      const y0 = Y(Math.max(b.p0, b.p1)), y1 = Y(Math.min(b.p0, b.p1));
      svg('rect', { x: x0, y: y0, width: x1 - x0, height: y1 - y0, class: 'bx t-' + (b.tone || 'accent') }, root);
      if (b.label) svg('text', { x: x0 + 8, y: y0 + 16, class: 'bx-label t-' + (b.tone || 'accent') }, root).textContent = b.label;
    });

    // column highlights sit under the candles
    const colLayer = svg('g', { class: 'cols' }, root);

    // volume
    if (cfg.volume) {
      const vmax = Math.max(...cs.map(c => c.v || 0)) || 1;
      const vg = svg('g', { class: 'vol' }, root);
      const base = mainH - pad.b;
      cs.forEach((c, i) => {
        const hh = ((c.v || 0) / vmax) * volH;
        svg('rect', {
          x: X(i) - cw / 2, y: base - hh, width: cw, height: Math.max(0.5, hh),
          rx: Math.min(1.5, cw / 4), class: c.c >= c.o ? 'up' : 'dn',
        }, vg);
      });
      if (axis) svg('text', { x: pR + 10, y: base - volH / 2 + 4, class: 'ax' }, vg).textContent = 'Vol';
    }

    // candles
    const cg = svg('g', { class: 'candles' + (cfg.animate === false ? '' : ' anim') }, root);
    const wickW = cw > 30 ? 2.4 : cw > 12 ? 1.6 : 1.2;
    cs.forEach((c, i) => {
      const up = c.c >= c.o;
      const k = svg('g', { class: 'cd ' + (up ? 'up' : 'dn'), style: `animation-delay:${Math.min(i * 14, 650)}ms` }, cg);
      svg('line', { x1: X(i), x2: X(i), y1: Y(c.h), y2: Y(c.l), class: 'wk', 'stroke-width': wickW }, k);
      const top = Y(Math.max(c.o, c.c)), bot = Y(Math.min(c.o, c.c));
      svg('rect', {
        x: X(i) - cw / 2, y: top, width: cw, height: Math.max(1.2, bot - top),
        rx: Math.min(3, cw * 0.16), class: 'bd',
      }, k);
    });

    // indicator overlays
    (cfg.overlays || []).forEach(o => {
      svg('path', { d: pathD(o.values, X, Y), class: 'ov draw t-' + (o.tone || 'accent'), pathLength: 1 }, root);
    });

    // trendlines
    (cfg.lines || []).forEach(l => {
      svg('line', {
        x1: X(l.a[0]), y1: Y(l.a[1]), x2: X(l.b[0]), y2: Y(l.b[1]),
        class: 'tl t-' + (l.tone || 'accent') + (l.dash ? ' dash' : ' draw'), pathLength: 1,
      }, root);
    });

    // horizontal levels
    const tags = svg('g', { class: 'tags' });
    (cfg.hlines || []).forEach(l => {
      const y = Y(l.p);
      const x0 = l.i0 != null ? X(l.i0) - slot / 2 : pL;
      const x1 = l.i1 != null ? X(l.i1) + slot / 2 : pR;
      svg('line', { x1: x0, x2: x1, y1: y, y2: y, class: 'hl t-' + (l.tone || 'neutral') + (l.dash === false ? '' : ' dash') }, root);
      if (l.label) pill(tags, l.labelRight ? x1 - 6 : x0 + 6, y - 14, l.label, l.tone, l.labelRight ? 'end' : 'start');
      if (axis && l.axisTag !== false) {
        const g = svg('g', { class: 'pill axis-tag t-' + (l.tone || 'neutral') }, tags);
        svg('rect', { x: pR + 3, y: y - 10, width: W - pR - 5, height: 20, rx: 6 }, g);
        svg('text', { x: pR + 3 + (W - pR - 5) / 2, y: y + 4, 'text-anchor': 'middle' }, g).textContent = fmt(l.p, step < 1 ? 0.5 : 1);
      }
    });

    // sub panel
    if (sub) {
      const top = mainH + gapH, bot = H - 6;
      svg('line', { x1: pL, x2: pR, y1: mainH + gapH / 2 - 2, y2: mainH + gapH / 2 - 2, class: 'sep' }, root);
      if (sub.type === 'rsi') {
        const Yr = v => bot - (v / 100) * (bot - top);
        svg('rect', { x: pL, y: Yr(70), width: pR - pL, height: Yr(30) - Yr(70), class: 'band' }, root);
        [30, 70].forEach(v => {
          svg('line', { x1: pL, x2: pR, y1: Yr(v), y2: Yr(v), class: 'gl dash' }, root);
          if (axis) svg('text', { x: pR + 10, y: Yr(v) + 4, class: 'ax' }, root).textContent = v;
        });
        svg('path', { d: pathD(sub.values, X, Yr), class: 'ov draw t-violet', pathLength: 1 }, root);
        svg('text', { x: pL + 4, y: top + 12, class: 'subt' }, root).textContent = 'RSI 14';
      } else if (sub.type === 'macd') {
        const all = [...sub.macd, ...sub.signal, ...sub.hist].filter(v => v != null);
        const m = Math.max(...all.map(Math.abs)) * 1.15 || 1;
        const mid = (top + bot) / 2;
        const Ym = v => mid - (v / m) * ((bot - top) / 2);
        svg('line', { x1: pL, x2: pR, y1: mid, y2: mid, class: 'gl' }, root);
        const hg = svg('g', { class: 'vol hist' }, root);
        sub.hist.forEach((v, i) => {
          if (v == null) return;
          const y0 = Ym(Math.max(v, 0)), y1 = Ym(Math.min(v, 0));
          svg('rect', { x: X(i) - cw * 0.4, y: y0, width: cw * 0.8, height: Math.max(0.5, y1 - y0), class: v >= 0 ? 'up' : 'dn' }, hg);
        });
        svg('path', { d: pathD(sub.macd, X, Ym), class: 'ov draw t-accent', pathLength: 1 }, root);
        svg('path', { d: pathD(sub.signal, X, Ym), class: 'ov draw t-orange', pathLength: 1 }, root);
        svg('text', { x: pL + 4, y: top + 12, class: 'subt' }, root).textContent = 'MACD 12·26·9';
        if (axis) svg('text', { x: pR + 10, y: mid + 4, class: 'ax' }, root).textContent = '0';
      }
    }

    root.appendChild(tags);

    // notes with leader lines
    const annot = svg('g', { class: 'annot' }, root);
    (cfg.notes || []).forEach(nt => {
      const ax = X(nt.i), ay = Y(nt.p);
      const tx = ax + (nt.dx || 0), ty = ay + (nt.dy == null ? -26 : nt.dy);
      svg('line', { x1: ax, y1: ay, x2: tx, y2: ty, class: 'leader' }, annot);
      svg('circle', { cx: ax, cy: ay, r: 3, class: 'anchor' }, annot);
      pill(annot, tx, ty, nt.text, nt.tone || 'ink', nt.dx > 0 ? 'start' : nt.dx < 0 ? 'end' : 'middle');
    });

    const wrap = document.createElement('div');
    wrap.className = 'chart';
    wrap.appendChild(root);
    const layer = document.createElement('div');
    layer.className = 'chart-layer';
    wrap.appendChild(layer);

    const legend = [...(cfg.overlays || []).filter(o => o.label), ...(cfg.legend || [])];
    if (legend.length) {
      const lg = document.createElement('div');
      lg.className = 'chart-legend';
      legend.forEach(o => {
        const s = document.createElement('span');
        s.className = 'lg t-' + (o.tone || 'accent');
        s.textContent = o.label;
        lg.appendChild(s);
      });
      wrap.appendChild(lg);
    }

    const api = { el: wrap, layer, root, X, Y, W, H, slot, n };

    api.leader = (ax, ay, tx, ty) => {
      svg('line', { x1: ax, y1: ay, x2: tx, y2: ty, class: 'leader' }, annot);
      svg('circle', { cx: ax, cy: ay, r: 3.5, class: 'anchor' }, annot);
    };

    // candle picking
    let locked = false, selected = -1;
    const hov = svg('rect', { class: 'col-hover', y: 2, height: H - 4, width: slot, x: -999, rx: 6 }, colLayer);
    const sel = svg('rect', { class: 'col-sel', y: 2, height: H - 4, width: slot, x: -999, rx: 6 }, colLayer);
    api.select = i => {
      if (locked || i < 0 || i >= n) return;
      selected = i;
      sel.setAttribute('x', X(i) - slot / 2);
      cg.querySelectorAll('.cd').forEach((c, j) => c.classList.toggle('picked', j === i));
      if (cfg.pick) cfg.pick(i);
    };
    api.lock = () => { locked = true; hov.setAttribute('x', -999); wrap.classList.add('locked'); };
    api.mark = (i, kind) => {
      svg('rect', { class: 'col-mark ' + kind, y: 2, height: H - 4, width: slot, x: X(i) - slot / 2, rx: 6 }, colLayer);
      sel.setAttribute('x', -999);
    };
    if (cfg.pick) {
      wrap.classList.add('pick');
      const hits = svg('g', { class: 'hits' }, root);
      for (let i = 0; i < n; i++) {
        const r = svg('rect', { x: X(i) - slot / 2, y: 0, width: slot, height: H, fill: 'transparent' }, hits);
        r.addEventListener('pointerenter', () => { if (!locked) hov.setAttribute('x', X(i) - slot / 2); });
        r.addEventListener('click', () => api.select(i));
      }
      hits.addEventListener('pointerleave', () => hov.setAttribute('x', -999));
      root.setAttribute('tabindex', '0');
      root.addEventListener('keydown', e => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const d = e.key === 'ArrowRight' ? 1 : -1;
          api.select(selected < 0 ? (d > 0 ? 0 : n - 1) : Math.max(0, Math.min(n - 1, selected + d)));
        }
      });
    }

    return api;
  }

  global.StoxChart = { gen, patch, closes, sma, ema, rsi, macd, render, svg };
})(window);

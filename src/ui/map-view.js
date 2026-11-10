// SVG map view: static base layers (outline, optional hints) + overlay drawn from a map model.
// Marker sizes are given in screen pixels and converted to viewBox units on every resize.

import { s } from './dom.js';

// Screen-pixel sizes. labelBaseline: share of the font size that moves the text baseline onto the point.
const SIZE = {
  ring: 7, ringStroke: 2.2, dot: 4.5, dotStroke: 1.8, dash: [2.6, 2.1],
  focus: 16, focusStroke: 2.6,
  label: 22, labelGap: 21, labelBaseline: 0.32, halo: 4,
  check: 7, checkStroke: 2.2, checkHalo: 5,
};

// Pen loop: starts early and overshoots for a hand-drawn look, with a gentle wobble and a wider than tall shape
const PEN = { fromDeg: -30, toDeg: 370, stepDeg: 12, wobble: 0.07, wobbleWaves: 3, wobblePhase: 0.6, drift: 0.04, stretchX: 1.08 };

// Fallback map width before layout (typical phone)
const DEFAULT_WIDTH_PX = 360;

export function penLoopPath(cx, cy, r) {
  const points = [];
  for (let deg = PEN.fromDeg; deg <= PEN.toDeg; deg += PEN.stepDeg) {
    const t = (deg * Math.PI) / 180;
    const wobble = 1 + PEN.wobble * Math.sin(PEN.wobbleWaves * t + PEN.wobblePhase) + PEN.drift * (deg / 360);
    points.push(`${(cx + r * wobble * Math.cos(t) * PEN.stretchX).toFixed(1)} ${(cy + r * wobble * Math.sin(t)).toFixed(1)}`);
  }
  return `M${points[0]}L${points.slice(1).join(' ')}`;
}

// Learning rings are dashed and learning dots hollow, so progress never relies on colour alone
export function markerShape(m, k) {
  const cls = `marker marker-${m.marker} tone-${m.tone}`;
  if (m.marker === 'dot') return s('circle', { class: cls, cx: m.x, cy: m.y, r: SIZE.dot * k, 'stroke-width': SIZE.dotStroke * k });
  const dash = m.tone === 'learning' ? SIZE.dash.map((d) => d * k).join(' ') : null;
  return s('circle', { class: cls, cx: m.x, cy: m.y, r: SIZE.ring * k, 'stroke-width': SIZE.ringStroke * k, 'stroke-dasharray': dash });
}

// Tick mark at the upper right of a mastered marker
export function checkBadge(m, k) {
  const r = (m.marker === 'ring' ? SIZE.ring : SIZE.dot) * k;
  const c = SIZE.check * k;
  const [x, y] = [m.x + r * 0.8, m.y - r * 0.8];
  const d = `M${x} ${y - c * 0.05}l${c * 0.35} ${c * 0.35}l${c * 0.65} ${-c * 0.8}`;
  return s('g', { class: 'map-check' }, [
    s('path', { class: 'is-halo', d, 'stroke-width': SIZE.checkHalo * k }),
    s('path', { d, 'stroke-width': SIZE.checkStroke * k }),
  ]);
}

function focusLoop(focus, k, animate) {
  return s('path', {
    class: `map-focus${animate ? ' is-drawing' : ''}`, d: penLoopPath(focus.x, focus.y, SIZE.focus * k),
    'stroke-width': SIZE.focusStroke * k, pathLength: 100,
  });
}

// The preferred side, unless the measured label box would leave the map
export function fitSide(anchor, box, width) {
  if (!box || (box.x >= 0 && box.x + box.width <= width)) return anchor;
  return anchor === 'end' ? 'start' : 'end';
}

function placeLabel(text, l, anchor, k) {
  const dx = (anchor === 'end' ? -1 : 1) * SIZE.labelGap * k;
  text.setAttribute('x', l.x + dx);
  text.setAttribute('text-anchor', anchor);
}

// Labels must be in the document to be measured, so they are placed after being appended
function drawLabel(overlay, l, k, width) {
  const text = s('text', {
    class: `map-label tone-${l.tone}`, y: l.y + SIZE.label * SIZE.labelBaseline * k,
    'font-size': SIZE.label * k, 'stroke-width': SIZE.halo * k,
  }, l.text);
  placeLabel(text, l, l.anchor, k);
  overlay.append(text);
  const side = fitSide(l.anchor, text.getBBox?.(), width);
  if (side !== l.anchor) placeLabel(text, l, side, k);
}

function drawOverlay(overlay, model, k, width, animateFocus) {
  overlay.replaceChildren();
  for (const m of model.markers) {
    overlay.append(markerShape(m, k));
    if (m.tone === 'mastered') overlay.append(checkBadge(m, k));
  }
  if (model.focus) overlay.append(focusLoop(model.focus, k, animateFocus));
  model.labels.forEach((l) => drawLabel(overlay, l, k, width));
}

// Small standalone marker for the legend, drawn exactly like on the map
export function markerSwatch(marker, tone) {
  const m = { x: 12, y: 12, marker, tone };
  return s('svg', { class: 'swatch', viewBox: '0 0 26 22', 'aria-hidden': 'true' },
    [markerShape(m, 1), tone === 'mastered' && checkBadge(m, 1)]);
}

// Tap position in viewBox units
function svgPoint(svg, event) {
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  const local = point.matrixTransform(svg.getScreenCTM().inverse());
  return { x: local.x, y: local.y };
}

export function createMapView(pack) {
  const [, , width, height] = pack.viewBox;
  const hints = s('path', { class: 'map-hints', d: pack.hints ?? '' });
  const overlay = s('g', { class: 'map-overlay' });
  const svg = s('svg', {
    class: 'map-svg', viewBox: pack.viewBox.join(' '), role: 'img',
    'aria-label': pack.title, preserveAspectRatio: 'xMidYMid meet',
  }, [hints, s('path', { class: 'map-outline', d: pack.outline }), overlay]);

  let model = null;
  let lastFocusId = null;
  let tapHandler = null;
  const unitsPerPx = () => width / (svg.getBoundingClientRect().width || DEFAULT_WIDTH_PX);

  // The pen loop animates only when the focused item changes
  function redraw() {
    if (!model) return overlay.replaceChildren();
    drawOverlay(overlay, model, unitsPerPx(), width, model.focus && model.focus.id !== lastFocusId);
    lastFocusId = model.focus?.id ?? null;
  }

  svg.addEventListener('click', (event) => tapHandler?.(svgPoint(svg, event), unitsPerPx()));
  if (typeof ResizeObserver === 'function') new ResizeObserver(redraw).observe(svg);

  return {
    element: svg,
    aspect: width / height,
    update(next) {
      model = next;
      redraw();
    },
    setHints(visible) {
      hints.classList.toggle('is-visible', visible);
    },
    onTap(handler) {
      tapHandler = handler;
      svg.classList.toggle('is-tappable', Boolean(handler));
    },
  };
}

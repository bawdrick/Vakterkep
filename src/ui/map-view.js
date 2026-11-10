// SVG map view: static base layers (outline, optional hints) + overlay drawn from a map model.
// Marker sizes are given in screen pixels and converted to viewBox units on every resize.

import { s } from './dom.js';

const SIZE = { ring: 7, ringStroke: 2.2, dot: 4.5, focus: 16, label: 22, labelGap: 21, halo: 4 };

// Hand-drawn pen loop around a point: slightly wobbly, overshooting the start
function penLoopPath(cx, cy, r) {
  const points = [];
  for (let deg = -30; deg <= 370; deg += 12) {
    const t = (deg * Math.PI) / 180;
    const wobble = 1 + 0.07 * Math.sin(3 * t + 0.6) + 0.04 * (deg / 360);
    points.push(`${(cx + r * wobble * Math.cos(t) * 1.08).toFixed(1)} ${(cy + r * wobble * Math.sin(t)).toFixed(1)}`);
  }
  return `M${points[0]}L${points.slice(1).join(' ')}`;
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

  const unitsPerPx = () => width / (svg.getBoundingClientRect().width || 360);

  function drawMarker(m, k) {
    const cls = `marker marker-${m.marker} tone-${m.tone}`;
    return m.marker === 'ring'
      ? s('circle', { class: cls, cx: m.x, cy: m.y, r: SIZE.ring * k, 'stroke-width': SIZE.ringStroke * k })
      : s('circle', { class: cls, cx: m.x, cy: m.y, r: SIZE.dot * k });
  }

  function placeLabel(text, l, anchor, k) {
    const dx = (anchor === 'end' ? -1 : 1) * SIZE.labelGap * k;
    text.setAttribute('x', l.x + dx);
    text.setAttribute('text-anchor', anchor);
  }

  // Draws a label beside its point; flips sides if it would leave the map
  function drawLabel(l, k) {
    const text = s('text', {
      class: `map-label tone-${l.tone}`, y: l.y + SIZE.label * 0.32 * k,
      'font-size': SIZE.label * k, 'stroke-width': SIZE.halo * k,
    }, l.text);
    placeLabel(text, l, l.anchor, k);
    overlay.append(text);
    const box = text.getBBox?.();
    if (box && (box.x < 0 || box.x + box.width > width)) placeLabel(text, l, l.anchor === 'end' ? 'start' : 'end', k);
  }

  function redraw() {
    overlay.replaceChildren();
    if (!model) return;
    const k = unitsPerPx();
    overlay.append(...model.markers.map((m) => drawMarker(m, k)));

    // Pen loop animates only when the focused item changes
    if (model.focus) {
      const animate = model.focus.id !== lastFocusId;
      overlay.append(s('path', {
        class: `map-focus${animate ? ' is-drawing' : ''}`, d: penLoopPath(model.focus.x, model.focus.y, SIZE.focus * k),
        'stroke-width': 2.6 * k, pathLength: 100,
      }));
    }
    lastFocusId = model.focus?.id ?? null;
    model.labels.forEach((l) => drawLabel(l, k));
  }

  // Tap position in viewBox units, plus the current px->units factor
  svg.addEventListener('click', (event) => {
    if (!tapHandler) return;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const local = point.matrixTransform(svg.getScreenCTM().inverse());
    tapHandler({ x: local.x, y: local.y }, unitsPerPx());
  });

  const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(redraw) : null;
  resizeObserver?.observe(svg);

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

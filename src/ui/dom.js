// Minimal DOM helpers: element creation with attributes, children and listeners, plus focus keeping.

const SVG_NS = 'http://www.w3.org/2000/svg';

function apply(node, attrs = {}, children = []) {
  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value == null) continue;
    if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'text') node.textContent = value;
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of [children].flat()) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

export const h = (tag, attrs, children) => apply(document.createElement(tag), attrs, children);
export const s = (tag, attrs, children) => apply(document.createElementNS(SVG_NS, tag), attrs, children);

// Full re-renders replace the focused node. Controls carry a stable data-key; screens mark a
// data-autofocus default. focusedKey: null if focus is outside root, '' if the control has no key.
export function focusedKey(root) {
  const active = root.ownerDocument.activeElement;
  if (!active || active === root.ownerDocument.body || !root.contains(active)) return null;
  return active.closest('[data-key]')?.getAttribute('data-key') ?? '';
}

// Focus the same control again, or the screen default when it is gone or disabled
export function restoreFocus(root, key) {
  if (key === null) return;
  const same = [...root.querySelectorAll('[data-key]')].find((el) => el.getAttribute('data-key') === key);
  const target = same && !same.disabled ? same : root.querySelector('[data-autofocus]:not([disabled])');
  target?.focus({ preventScroll: true });
}

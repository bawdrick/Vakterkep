// Minimal DOM helpers: element creation with attributes, children and listeners.

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

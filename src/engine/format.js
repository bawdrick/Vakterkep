// Template filling for user-facing texts: 'Hol van {name}?' + { name: 'Pécs' }.

export function fillTemplate(template, values) {
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in values ? String(values[key]) : match));
}

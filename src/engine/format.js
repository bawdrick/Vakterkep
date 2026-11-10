// Formatting for user-facing texts: templates ('Hol van {name}?' + { name: 'Pécs' }) and percentages.

export function fillTemplate(template, values) {
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in values ? String(values[key]) : match));
}

// Whole-number percentage for progress meters; 0 when there is nothing to count
export function percent(part, total) {
  return total ? Math.round((part / total) * 100) : 0;
}

// Quiz keyboard shortcuts as a pure mapping: key + session state -> [action name, argument] or null.

const isDigit = (key) => /^[1-9]$/.test(key);

export function keyCommand(session, { key, altKey, ctrlKey, metaKey, onButton }) {
  if (!session || altKey || ctrlKey || metaKey) return null;
  const { mode, phase } = session;
  if (key === 'Escape') return ['home'];

  // A focused button handles its own Space/Enter
  if (key === ' ' || key === 'Enter') {
    if (onButton) return null;
    if (mode === 'recall' && phase === 'ask') return ['reveal'];
    return phase === 'result' ? ['next'] : null;
  }
  if (mode === 'recall' && phase === 'revealed' && (key === 'ArrowLeft' || key === 'ArrowRight')) {
    return ['grade', key === 'ArrowRight'];
  }
  if (mode === 'choice' && phase === 'ask' && isDigit(key)) {
    const id = session.choices[Number(key) - 1];
    return id ? ['choose', id] : null;
  }
  return null;
}

// Structural validation of a map pack; shared by the build pipeline, tests and the app.

export const SCHEMA_VERSION = 1;
export const MODES = ['recall', 'choice', 'locate'];

const isNonEmptyString = (v) => typeof v === 'string' && v.length > 0;
const isFiniteNumber = (v) => typeof v === 'number' && Number.isFinite(v);

export function validatePack(pack) {
  const errors = [];
  const fail = (msg) => errors.push(`${pack?.id ?? '?'}: ${msg}`);

  // Header and map layers
  if (pack?.schemaVersion !== SCHEMA_VERSION) fail(`schemaVersion must be ${SCHEMA_VERSION}`);
  for (const key of ['id', 'title', 'lang', 'outline']) if (!isNonEmptyString(pack?.[key])) fail(`missing ${key}`);
  if (!Array.isArray(pack?.viewBox) || pack.viewBox.length !== 4) fail('viewBox must have 4 numbers');
  if (errors.length) return errors;

  // Kinds with prompts for every mode
  for (const [kindId, kind] of Object.entries(pack.kinds ?? {})) {
    if (!isNonEmptyString(kind.label)) fail(`kind ${kindId}: missing label`);
    if (!['ring', 'dot'].includes(kind.marker)) fail(`kind ${kindId}: marker must be ring or dot`);
    for (const mode of MODES) if (!isNonEmptyString(kind.prompts?.[mode])) fail(`kind ${kindId}: missing prompt ${mode}`);
  }

  // Items inside the viewBox with unique ids and known kinds
  const [, , width, height] = pack.viewBox;
  const ids = new Set();
  for (const item of pack.items ?? []) {
    if (ids.has(item.id)) fail(`duplicate item id ${item.id}`);
    ids.add(item.id);
    if (!pack.kinds?.[item.kind]) fail(`item ${item.id}: unknown kind ${item.kind}`);
    if (!isNonEmptyString(item.name)) fail(`item ${item.id}: missing name`);
    if (!isFiniteNumber(item.x) || !isFiniteNumber(item.y)) fail(`item ${item.id}: bad coordinates`);
    else if (item.x < 0 || item.y < 0 || item.x > width || item.y > height) fail(`item ${item.id}: outside viewBox`);
  }

  // Decks reference existing kinds and are not empty
  const items = pack.items ?? [];
  if (!items.length) fail('no items');
  for (const deck of pack.decks ?? []) {
    if (!deck.kinds?.length || deck.kinds.some((k) => !pack.kinds?.[k])) fail(`deck ${deck.id}: bad kinds`);
    else if (!items.some((item) => deck.kinds.includes(item.kind))) fail(`deck ${deck.id}: no items`);
  }
  if (!pack.decks?.length) fail('no decks');
  return errors;
}

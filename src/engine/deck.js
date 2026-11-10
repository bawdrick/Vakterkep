// Deck helpers: resolve which pack items belong to a deck.

export function findDeck(pack, deckId) {
  return pack.decks.find((deck) => deck.id === deckId) ?? pack.decks[0];
}

export function deckItems(pack, deck) {
  return pack.items.filter((item) => deck.kinds.includes(item.kind));
}

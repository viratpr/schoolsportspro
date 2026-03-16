const SPORT_SYMBOLS: Record<string, string> = {
  cricket: '🏏',
  football: '⚽',
  kabaddi: '🤼',
  volleyball: '🏐',
  basketball: '🏀',
  badminton: '🏸',
  tennis: '🎾',
  athletics: '🏃',
  'track and field': '🏃',
  swimming: '🏊',
  kho: '🏃',
  hockey: '🏑',
  chess: '♟️',
};

export function getSportSymbol(name: string): string {
  const key = name.trim().toLowerCase();
  if (SPORT_SYMBOLS[key]) return SPORT_SYMBOLS[key];
  const match = Object.keys(SPORT_SYMBOLS).find((k) => key.includes(k));
  return match ? SPORT_SYMBOLS[match] : '🏅';
}

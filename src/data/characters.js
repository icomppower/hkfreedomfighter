// Playable characters. Cosmetic only — every character shares 龍仔 Dragon's
// stats, move list and weapon mechanics; the `key` simply selects which
// procedurally-generated sprite skin (`<key>_*` textures / `<key>-*` anims)
// the player wears. The chosen key lives in the global registry for the
// session so it survives stage transitions, continues and restarts.

export const CHARACTERS = [
  { key: 'keung', zh: '龍仔', en: 'DRAGON', blurb: '前線勇士 · 黑衣黃帽' },
  { key: 'amy', zh: '小美', en: 'AMY', blurb: '粉紅戰裙 · 馬尾飄逸' },
];

export function charLabel(key) {
  const c = CHARACTERS.find((x) => x.key === key) || CHARACTERS[0];
  return `${c.zh} ${c.en}`;
}

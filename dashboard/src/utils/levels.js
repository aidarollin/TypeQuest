export function xpForLevel(level) {
  if (level <= 1) return 0;
  return Math.floor(50 * Math.pow(level, 1.5));
}

export function levelForXp(xp) {
  let level = 1;
  while (level < 50 && xp >= xpForLevel(level + 1)) level++;
  return level;
}

const LEVEL_TITLES = [
  [50, "Grand Wordlord"],
  [40, "Master Author"],
  [30, "Author"],
  [20, "Chronicler"],
  [10, "Wordsmith"],
  [5,  "Drafter"],
  [1,  "Apprentice Scribe"]
];

export function titleForLevel(level) {
  for (const [threshold, title] of LEVEL_TITLES) {
    if (level >= threshold) return title;
  }
  return "Apprentice Scribe";
}

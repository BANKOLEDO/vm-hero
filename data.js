// Character data
const VOX = {
  keyleth: {
    weapon: "Staff of the Tempest",
    quote: "I am an archdruid of the Air Ashari… I am also afraid of heights. Slightly.",
  },
  vax: {
    weapon: "The entwined daggers of the Matron",
    quote: "I am the hand of fate. The scythe of the Matron.",
  },
  vex: {
    weapon: "Fenthras, the Bow of the Fey",
    quote: "Darling, aim for the heart. It's polite.",
  },
  percy: {
    weapon: "The Pepperbox — & a very long list",
    quote: "I don't need vengeance. I keep a ledger instead.",
  },
  grog: {
    weapon: "The Bloodaxe (and fists, and fists)",
    quote: "I would like to rage!",
  },
  pike: {
    weapon: "Dawnbreaker, mace of the Everlight",
    quote: "Heals first, smites second, hugs after.",
  },
  scanlan: {
    weapon: "Mythcarver, sword of bardgery",
    quote: "I have a song for every occasion. I am legally required to sing it.",
  },
  trinket: {
    weapon: "Bear hug",
    quote: "Awoooo. (Translation: good beans.)",
  },
};

export const FALLBACK = {
  weapon: "a signed writ and a stern look",
  quote: "I would like to rage.",
};

export const CHARACTERS = new Proxy(VOX, {
  get(target, key) {
    return target[key] ?? FALLBACK;
  },
});


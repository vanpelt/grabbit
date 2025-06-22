import { CATEGORIES, ItemCategory } from "./shoppingCategories";

const UNKNOWN_CATEGORY = CATEGORIES.find((c) => c.id === "unknown")!;

// This database is intentionally kept separate to allow for a distinct
// keyword-based classification system that can be used as a fast first-pass
// before falling back to the more advanced embedding-based model.
const ITEM_DATABASE: Record<string, string[]> = {
  // 🛒 GROCERY STORE - ALL FOOD & BASIC HOUSEHOLD
  eggs: ["grocery"],
  milk: ["grocery"],
  chicken: ["grocery"],
  beef: ["grocery"],
  pork: ["grocery"],
  fish: ["grocery"],
  salmon: ["grocery"],
  tuna: ["grocery"],
  cheese: ["grocery"],
  butter: ["grocery"],
  yogurt: ["grocery"],
  bread: ["grocery"],
  lettuce: ["grocery"],
  tomatoes: ["grocery"],
  onions: ["grocery"],
  garlic: ["grocery"],
  potatoes: ["grocery"],
  carrots: ["grocery"],
  broccoli: ["grocery"],
  spinach: ["grocery"],
  apples: ["grocery"],
  bananas: ["grocery"],
  oranges: ["grocery"],
  grapes: ["grocery"],
  rice: ["grocery"],
  pasta: ["grocery"],
  cereal: ["grocery"],
  oatmeal: ["grocery"],
  coffee: ["grocery"],
  tea: ["grocery"],
  sugar: ["grocery"],
  salt: ["grocery"],
  pepper: ["grocery"],
  oil: ["grocery"],
  "cooking oil": ["grocery"],
  flour: ["grocery"],
  beans: ["grocery"],
  soup: ["grocery"],
  snacks: ["grocery"],
  chips: ["grocery"],
  crackers: ["grocery"],
  juice: ["grocery"],
  soda: ["grocery"],
  water: ["grocery"],
  "ice cream": ["grocery"],
  "frozen meals": ["grocery"],

  // Basic Household (Grocery)
  "paper towels": ["grocery"],
  "toilet paper": ["grocery"],
  "trash bags": ["grocery"],
  "aluminum foil": ["grocery"],
  "plastic wrap": ["grocery"],
  "ziplock bags": ["grocery"],
  "dish soap": ["grocery"],

  // 💊 PHARMACY - HEALTH & PERSONAL CARE
  toothpaste: ["pharmacy"],
  toothbrush: ["pharmacy"],
  mouthwash: ["pharmacy"],
  shampoo: ["pharmacy"],
  conditioner: ["pharmacy"],
  soap: ["pharmacy"],
  "body wash": ["pharmacy"],
  deodorant: ["pharmacy"],
  "nail clippers": ["pharmacy"],
  "band-aids": ["pharmacy"],
  aspirin: ["pharmacy"],
  vitamins: ["pharmacy"],
  sunscreen: ["pharmacy"],
  "hand sanitizer": ["pharmacy"],
  lotion: ["pharmacy"],
  "contact solution": ["pharmacy"],
  diapers: ["pharmacy"],
  "baby formula": ["pharmacy"],

  // 🛠️ HARDWARE STORE - TOOLS & HOME IMPROVEMENT
  batteries: ["hardware"],
  "light bulbs": ["hardware"],
  flashlight: ["hardware"],
  screws: ["hardware"],
  nails: ["hardware"],
  hammer: ["hardware"],
  screwdriver: ["hardware"],
  drill: ["hardware"],
  paint: ["hardware"],
  "duct tape": ["hardware"],
  "super glue": ["hardware"],
  plunger: ["hardware"],
  broom: ["hardware"],
  shovel: ["hardware"],
  rake: ["hardware"],
  "extension cord": ["hardware"],
  "light switch": ["hardware"],
  sandpaper: ["hardware"],

  // ⛽ SERVICE STATION - GAS & FUEL (Service only)
  gas: ["service"],
  "gas for lawnmower": ["service"],
  "gas for car": ["service"],
  "gas for snowblower": ["service"],
  "lawn mower gas": ["service"],
  "mower gas": ["service"],
  fuel: ["service"],
  "car wash": ["service"],
  "windshield washer fluid": ["service"],
  "oil change": ["service"],
  "air for tires": ["service"],

  // ✅ MULTI-CATEGORY ITEMS (Available at both Hardware & Service)
  propane: ["hardware", "service"],
  "propane tank": ["hardware", "service"],
  "propane tanks": ["hardware", "service"],
  "motor oil": ["hardware", "service"],
  "engine oil": ["hardware", "service"],
  "2-cycle oil": ["hardware", "service"],
  "chainsaw oil": ["hardware", "service"],

  // 🏬 DEPARTMENT STORE - CLOTHING & HOME GOODS
  socks: ["department"],
  underwear: ["department"],
  "t-shirt": ["department"],
  shirt: ["department"],
  pants: ["department"],
  jeans: ["department"],
  shorts: ["department"],
  "pair of shorts": ["department"],
  dress: ["department"],
  skirt: ["department"],
  jacket: ["department"],
  sweater: ["department"],
  shoes: ["department"],
  sneakers: ["department"],
  boots: ["department"],
  sandals: ["department"],
  belt: ["department"],
  hat: ["department"],
  gloves: ["department"],
  scarf: ["department"],

  // Home Goods
  towels: ["department"],
  "bath towels": ["department"],
  sheets: ["department"],
  "bed sheets": ["department"],
  pillows: ["department"],
  blanket: ["department"],
  "shower curtain": ["department"],
  curtains: ["department"],
  "picture frame": ["department"],
  candles: ["department"],
  "birthday candles": ["department"],

  // 🐶 PET STORE - PET SUPPLIES
  "dog food": ["pet"],
  "cat food": ["pet"],
  "cat litter": ["pet"],
  "dog treats": ["pet"],
  "cat treats": ["pet"],
  "pet toys": ["pet"],
  "dog leash": ["pet"],
  "pet bed": ["pet"],

  // 📱 ELECTRONICS STORE - TECH & GADGETS
  "phone charger": ["electronics"],
  charger: ["electronics"],
  headphones: ["electronics"],
  "usb cable": ["electronics"],
  mouse: ["electronics"],
  keyboard: ["electronics"],
  "phone case": ["electronics"],
  "screen protector": ["electronics"],
  "memory card": ["electronics"],

  // 🎸 MUSIC STORE - INSTRUMENTS & ACCESSORIES
  // String Instruments
  "guitar picks": ["music"],
  picks: ["music"],
  "guitar strings": ["music"],
  "bass strings": ["music"],
  "violin strings": ["music"],
  "acoustic strings": ["music"],
  "electric strings": ["music"],
  strings: ["music"],
  capo: ["music"],
  "guitar strap": ["music"],
  tuner: ["music"],
  "guitar tuner": ["music"],
  slide: ["music"],
  "guitar slide": ["music"],
  "string winder": ["music"],
  "cleaning cloth": ["music"],
  "guitar polish": ["music"],
  "fretboard conditioner": ["music"],
  "gig bag": ["music"],
  "guitar case": ["music"],
  "hard case": ["music"],
  humidifier: ["music"],
  "guitar humidifier": ["music"],
  "picks holder": ["music"],
  "fingerboard tape": ["music"],

  // Percussion / Drums
  "drum sticks": ["music"],
  drumsticks: ["music"],
  sticks: ["music"],
  "drum heads": ["music"],
  "drum key": ["music"],
  "cymbal polish": ["music"],
  "practice pad": ["music"],
  "stick bag": ["music"],
  moongel: ["music"],
  dampeners: ["music"],
  "kick pedal": ["music"],
  "snare wires": ["music"],
  "replacement felts": ["music"],
  "hi-hat clutch": ["music"],
  brushes: ["music"],
  mallets: ["music"],

  // Keyboards / Pianos
  "sustain pedal": ["music"],
  "power adapter": ["music"],
  "keyboard stand": ["music"],
  "piano bench": ["music"],
  bench: ["music"],
  "dust cover": ["music"],
  "keyboard cover": ["music"],
  "sheet music stand": ["music"],
  "midi cable": ["music"],
  "expression pedal": ["music"],

  // Wind Instruments
  reeds: ["music"],
  "clarinet reeds": ["music"],
  "saxophone reeds": ["music"],
  "cork grease": ["music"],
  "valve oil": ["music"],
  "slide cream": ["music"],
  swabs: ["music"],
  "cleaning kit": ["music"],
  "mouthpiece cushions": ["music"],
  ligature: ["music"],
  "reed case": ["music"],
  metronome: ["music"],
  "neck strap": ["music"],

  // Sheet Music & Education
  "sheet music": ["music"],
  songbooks: ["music"],
  "music theory books": ["music"],
  "practice journal": ["music"],
  "manuscript paper": ["music"],
  flashcards: ["music"],
  "music flashcards": ["music"],

  // Live Performance & Recording
  microphone: ["music"],
  "xlr cables": ["music"],
  "audio interface": ["music"],
  "mic stand": ["music"],
  "pop filter": ["music"],
  "soundproof foam": ["music"],
  "studio headphones": ["music"],
  "in-ear monitors": ["music"],
  "power strip": ["music"],
  "stage tuner": ["music"],
  "pa cables": ["music"],
  adapters: ["music"],

  // Miscellaneous & Essentials
  earplugs: ["music"],
  "musician earplugs": ["music"],
  "instrument cable": ["music"],
  "guitar cable": ["music"],
  "patch cables": ["music"],
  "music stand light": ["music"],
  "instrument tags": ["music"],
  "clip-on tuner": ["music"],
  "hand exerciser": ["music"],

  // Multi-category items (Music + Electronics)
  "midi interface": ["music", "electronics"],
  "audio cables": ["music", "electronics"],
  "recording equipment": ["music", "electronics"],
};

/**
 * A fast, keyword-based item classifier.
 *
 * This function uses a pre-defined database of keywords to categorize an item.
 * It's designed to be a quick first-pass filter before potentially using a more
 * computationally expensive method like sentence embeddings.
 *
 * The logic includes:
 * 1. An exact match check for the best performance.
 * 2. A partial match check with a scoring system that prioritizes longer, more
 *    specific keywords.
 *
 * @param itemName The name of the item to categorize.
 * @returns An object containing the primary and all possible categories. If no
 *          match is found, it returns the "Unknown" category.
 */
export function keywordCategorize(itemName: string): {
  primaryCategory: ItemCategory;
  allCategories: ItemCategory[];
} {
  const lowerName = itemName.toLowerCase().trim();

  if (!lowerName) {
    return {
      primaryCategory: UNKNOWN_CATEGORY,
      allCategories: [UNKNOWN_CATEGORY],
    };
  }

  // 1. Check for an exact match in the database first for best performance.
  const exactMatchCategoryIds = ITEM_DATABASE[lowerName];
  if (exactMatchCategoryIds) {
    const categories = exactMatchCategoryIds
      .map((id) => CATEGORIES.find((cat) => cat.id === id))
      .filter(Boolean) as ItemCategory[];

    if (categories.length > 0) {
      return {
        primaryCategory: categories[0],
        allCategories: categories,
      };
    }
  }

  // 2. If no exact match, perform partial matching with scoring.
  // Longer keyword matches are given a higher score.
  const categoryScores: Record<string, number> = {};
  for (const [keyword, categoryIds] of Object.entries(ITEM_DATABASE)) {
    if (lowerName.includes(keyword)) {
      const score = keyword.length; // Longer keywords are more specific
      for (const catId of categoryIds) {
        categoryScores[catId] = (categoryScores[catId] || 0) + score;
      }
    }
  }

  if (Object.keys(categoryScores).length > 0) {
    // Sort categories by score in descending order
    const sortedCategoryIds = Object.keys(categoryScores).sort(
      (a, b) => categoryScores[b] - categoryScores[a]
    );

    const categories = sortedCategoryIds
      .map((id) => CATEGORIES.find((cat) => cat.id === id))
      .filter(Boolean) as ItemCategory[];

    if (categories.length > 0) {
      return {
        primaryCategory: categories[0], // The one with the highest score
        allCategories: categories, // All matched categories, sorted by score
      };
    }
  }

  // 3. If no keywords matched, return the "Unknown" category.
  return {
    primaryCategory: UNKNOWN_CATEGORY,
    allCategories: [UNKNOWN_CATEGORY],
  };
}

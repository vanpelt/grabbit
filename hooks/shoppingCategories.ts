export interface ItemCategory {
  id: string;
  name: string;
  emoji: string;
  stores: string[];
}

export const CATEGORIES: ItemCategory[] = [
  {
    id: "grocery",
    name: "Grocery Store",
    emoji: "🛒",
    stores: ["Safeway", "Kroger", "Whole Foods", "Aldi", "Walmart", "Costco"],
  },
  {
    id: "pharmacy",
    name: "Pharmacy",
    emoji: "💊",
    stores: ["CVS", "Walgreens", "Rite Aid", "Target Pharmacy"],
  },
  {
    id: "hardware",
    name: "Hardware Store",
    emoji: "🛠️",
    stores: ["Home Depot", "Lowe's", "Ace Hardware"],
  },
  {
    id: "department",
    name: "Department Store",
    emoji: "🏬",
    stores: ["Target", "Kohl's", "Macy's", "JCPenney"],
  },
  {
    id: "pet",
    name: "Pet Store",
    emoji: "🐶",
    stores: ["Petco", "PetSmart"],
  },
  {
    id: "electronics",
    name: "Electronics Store",
    emoji: "📱",
    stores: ["Best Buy", "Apple Store"],
  },
  {
    id: "service",
    name: "Service Station",
    emoji: "⛽",
    stores: ["Gas Station", "Shell", "Chevron", "Exxon", "BP", "Mobil"],
  },
  {
    id: "music",
    name: "Music Store",
    emoji: "🎸",
    stores: ["Guitar Center", "Sam Ash", "Music & Arts", "Local Music Shop"],
  },
  {
    id: "bookstore",
    name: "Bookstore",
    emoji: "📚",
    stores: ["Barnes & Noble", "Powell's Books", "Books-A-Million"],
  },
  {
    id: "unknown",
    name: "Unknown",
    emoji: "❓",
    stores: [],
  },
];

export interface ShoppingItem {
  id: string;
  name: string;
  primaryCategory: ItemCategory;
  completed: boolean;
  createdAt: Date;
}

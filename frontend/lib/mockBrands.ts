export interface Brand {
  id: number;
  name: string;
  symbol: string;
  logo: string;
  pointsPerToken: number;
  category: "airline" | "hotel" | "retail";
}

export const MOCK_BRANDS: Brand[] = [
  { id: 0, name: "IndiGo Miles",      symbol: "IGM", logo: "#0052CC", pointsPerToken: 100, category: "airline" },
  { id: 1, name: "Air India Points",  symbol: "AIP", logo: "#E63946", pointsPerToken: 100, category: "airline" },
  { id: 2, name: "OYO Rewards",       symbol: "OYO", logo: "#FF6B35", pointsPerToken: 50,  category: "hotel"   },
  { id: 3, name: "Taj InnerCircle",   symbol: "TAJ", logo: "#2D6A4F", pointsPerToken: 50,  category: "hotel"   },
  { id: 4, name: "Flipkart SuperCoins", symbol: "FKC", logo: "#FFB703", pointsPerToken: 10, category: "retail" },
  { id: 5, name: "Tata Neu Points",   symbol: "NEU", logo: "#8338EC", pointsPerToken: 10,  category: "retail"  },
];

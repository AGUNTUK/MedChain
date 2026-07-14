import { Product } from "../types";

// Common Bangladeshi pharmaceutical brand & generic name spelling mistakes dictionary
const COMMON_SPELLING_VARIATIONS: Record<string, string> = {
  // Brand name corrections
  "napaa": "napa",
  "npa": "napa",
  "neppa": "napa",
  "ac": "ace",
  "acee": "ace",
  "pantorid": "pantocid",
  "pantodac": "pantocid",
  "pantoprazol": "pantoprazole",
  "omeprazol": "omeprazole",
  "omeprazolee": "omeprazole",
  "seclo": "seclo",
  "secglo": "seclo",
  "giona": "giona",
  "geona": "giona",
  "ezylax": "easylax",

  // Generic name corrections
  "paracitamol": "paracetamol",
  "paracetemol": "paracetamol",
  "paracetol": "paracetamol",
  "paracitamel": "paracetamol",
  "omeprasole": "omeprazole",
  "pantoprasol": "pantoprazole",
  "budesonid": "budesonide",
  "montelucast": "montelukast",
  "montelucast sodium": "montelukast sodium",
  "cefuroxem": "cefuroxime",
  "cefuroxim": "cefuroime",
  "azithromicin": "azithromycin",
  "azithromycine": "azithromycin",
  "fexo": "fexofenadine",
  "fexofenedine": "fexofenadine",
  "esomprazole": "esomeprazole",
  "esomeprazol": "esomeprazole"
};

/**
 * Computes standard Levenshtein distance between two strings
 * to calculate editing cost (typo tolerance validation).
 */
export function getLevenshteinDistance(a: string, b: string): number {
  const tmp: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    tmp[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    tmp[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1, // deletion
        tmp[i][j - 1] + 1, // insertion
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1) // substitution
      );
    }
  }
  return tmp[a.length][b.length];
}

/**
 * Checks if a search token is fuzzy-matched against a target string
 * with appropriate typo tolerance threshold.
 */
export function isFuzzyMatch(token: string, target: string): boolean {
  if (target.includes(token)) return true;
  if (token.length < 3) return false;

  // Word-by-word comparison
  const targetWords = target.split(/[\s,.-]+/);
  for (const word of targetWords) {
    if (word.startsWith(token)) return true;

    // Calculate maximum edit distance allowed (1 for short words, 2 for longer ones)
    const maxDistance = token.length <= 5 ? 1 : 2;
    if (Math.abs(word.length - token.length) <= maxDistance) {
      const distance = getLevenshteinDistance(token, word);
      if (distance <= maxDistance) {
        return true;
      }
    }
  }

  return false;
}

export interface SearchResult {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
  suggestions: string[];
  originalQuery: string;
  correctedQuery?: string;
}

/**
 * High-performance, weighted search scorer & engine
 * Tailored for 10,000+ medicine records
 */
export function performSearch(
  allProducts: any[],
  query: string,
  options: {
    category?: string;
    filter?: "deals" | "frequent" | "low_stock";
    page?: number;
    pageSize?: number;
  } = {}
): SearchResult {
  const page = options.page || 1;
  const pageSize = options.pageSize || 10;
  const originalQuery = query;
  let correctedQuery: string | undefined;

  let searchTokens: string[] = [];
  const suggestionsSet = new Set<string>();

  // 1. Resolve query-level spelling corrections & suggestions
  if (query.trim()) {
    const rawQuery = query.toLowerCase().trim();
    let normalizedWords = rawQuery.split(/\s+/);
    let correctedWords = normalizedWords.map(word => {
      // Check if word has a known common variation
      if (COMMON_SPELLING_VARIATIONS[word]) {
        suggestionsSet.add(COMMON_SPELLING_VARIATIONS[word]);
        return COMMON_SPELLING_VARIATIONS[word];
      }

      // Or find nearest word from known medical terminology if distance is small
      for (const key of Object.keys(COMMON_SPELLING_VARIATIONS)) {
        if (getLevenshteinDistance(word, key) <= 1) {
          suggestionsSet.add(COMMON_SPELLING_VARIATIONS[key]);
          return COMMON_SPELLING_VARIATIONS[key];
        }
      }
      return word;
    });

    const candidateCorrection = correctedWords.join(" ");
    if (candidateCorrection !== rawQuery) {
      correctedQuery = candidateCorrection;
      searchTokens = correctedWords;
    } else {
      searchTokens = normalizedWords;
    }
  }

  // 2. Perform Category Filtering first
  let list = [...allProducts];
  if (options.category && options.category !== "All") {
    list = list.filter(p => p.category.toLowerCase() === options.category!.toLowerCase());
  }

  // 3. Score and Filter based on Search Tokens
  interface ScoredProduct {
    product: Product;
    score: number;
  }

  let scoredList: ScoredProduct[] = [];

  if (searchTokens.length > 0) {
    list.forEach(p => {
      let score = 0;
      const brandLower = p.name.toLowerCase();
      const genericLower = p.genericName.toLowerCase();
      const companyLower = p.company.toLowerCase();
      const categoryLower = p.category.toLowerCase();
      const strengthLower = p.strength.toLowerCase();
      const packLower = p.packSize.toLowerCase();

      let matchedTokens = 0;

      searchTokens.forEach(token => {
        let tokenMatched = false;

        // Exact Matches (Highest Priority)
        if (brandLower === token) {
          score += 100;
          tokenMatched = true;
        } else if (brandLower.split(/\s+/).includes(token)) {
          score += 80;
          tokenMatched = true;
        } else if (brandLower.startsWith(token)) {
          score += 60;
          tokenMatched = true;
        }

        if (genericLower === token) {
          score += 90;
          tokenMatched = true;
        } else if (genericLower.includes(token)) {
          score += 50;
          tokenMatched = true;
        }

        if (companyLower === token || companyLower.startsWith(token)) {
          score += 40;
          tokenMatched = true;
        }

        if (strengthLower.replace(/\s/g, "") === token.replace(/\s/g, "")) {
          score += 30;
          tokenMatched = true;
        } else if (strengthLower.includes(token)) {
          score += 15;
          tokenMatched = true;
        }

        if (packLower.includes(token)) {
          score += 10;
          tokenMatched = true;
        }

        // Fuzzy edit-distance match if no exact match
        if (!tokenMatched) {
          const brandWords = brandLower.split(/[\s,.-]+/);
          brandWords.forEach(word => {
            if (word.length >= 3) {
              const dist = getLevenshteinDistance(token, word);
              if (dist <= 1) {
                score += 30;
                tokenMatched = true;
              } else if (dist <= 2 && token.length >= 6) {
                score += 15;
                tokenMatched = true;
              }
            }
          });

          const genericWords = genericLower.split(/[\s,.-]+/);
          genericWords.forEach(word => {
            if (word.length >= 3) {
              const dist = getLevenshteinDistance(token, word);
              if (dist <= 1) {
                score += 25;
                tokenMatched = true;
              }
            }
          });
        }

        if (tokenMatched) {
          matchedTokens++;
        }
      });

      // Include in result if all tokens or at least some query criteria match
      if (score > 0 && matchedTokens >= Math.ceil(searchTokens.length * 0.5)) {
        // Boost score slightly for exact multi-token substring matches
        const joinedTokens = searchTokens.join(" ");
        if (brandLower.includes(joinedTokens)) score += 50;
        if (genericLower.includes(joinedTokens)) score += 40;

        scoredList.push({ product: p, score });
      }
    });

    // Sort by weighted relevance score
    scoredList.sort((a, b) => b.score - a.score);
    list = scoredList.map(s => s.product);
  }

  // 4. Sort Filters
  if (options.filter === "deals") {
    // Keep high matches first, but sub-sort matches by discount percentage
    list = list.sort((a, b) => b.discountPercentage - a.discountPercentage);
  } else if (options.filter === "frequent") {
    list = list.sort((a, b) => b.soldStock - a.soldStock);
  } else if (options.filter === "low_stock") {
    list = list.filter(p => p.availableStock <= 150);
  }

  // 5. Generate spelling suggestions from dataset if none or very few results found
  if (list.length === 0 && query.trim().length >= 3) {
    const qLower = query.toLowerCase().trim();
    allProducts.forEach(p => {
      if (getLevenshteinDistance(qLower, p.name.toLowerCase().substring(0, qLower.length + 1)) <= 1) {
        suggestionsSet.add(p.name);
      }
      if (getLevenshteinDistance(qLower, p.genericName.toLowerCase().substring(0, qLower.length + 1)) <= 1) {
        suggestionsSet.add(p.genericName);
      }
    });
  }

  const suggestions = Array.from(suggestionsSet).slice(0, 4);

  // 6. Pagination Split
  const total = list.length;
  const pages = Math.ceil(total / pageSize);
  const startIndex = (page - 1) * pageSize;
  const paginatedProducts = list.slice(startIndex, startIndex + pageSize);

  return {
    products: paginatedProducts,
    total,
    page,
    pageSize,
    pages,
    suggestions,
    originalQuery,
    correctedQuery
  };
}

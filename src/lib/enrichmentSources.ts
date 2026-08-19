export const ENRICHMENT_SOURCES = {
  medex: {
    name: "Medex (medex.com.bd)",
    mapUrl: "https://medex.com.bd/brands",
    mapFilter: (url: string) => url.includes('/brands/') && !url.endsWith('/brands'),
    promptTemplate: "Extract the current Maximum Retail Price (MRP) in BDT as a number if possible. Also extract the best product package image URL (starting with http) if available. The product is {PRODUCT_NAME}."
  },
  osudpotro: {
    name: "Osudpotro (osudpotro.com)",
    mapUrl: "https://osudpotro.com",
    mapFilter: (url: string) => {
      try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(p => p.length > 0);
        if (pathParts.length !== 1) return false; // Must be root-level slug
        const slug = pathParts[0];
        if (slug === 'category' || slug === 'blog' || slug === 'search' || slug === 'assets' || slug.endsWith('.pdf')) return false;
        return true;
      } catch {
        return false;
      }
    },
    promptTemplate: "Extract the current Maximum Retail Price (MRP) in BDT as a number if possible. Also extract the best product package image URL (starting with http) if available. The product is {PRODUCT_NAME}."
  }
};

export type EnrichmentSourceKey = keyof typeof ENRICHMENT_SOURCES;

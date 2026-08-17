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
      if (url.includes('/category/') || url.includes('/blog') || url.includes('/search') || url.includes('/assets/') || url.includes('pdf')) return false;
      if (url === 'https://osudpotro.com' || url === 'https://osudpotro.com/') return false;
      return true;
    },
    promptTemplate: "Extract the current Maximum Retail Price (MRP) in BDT as a number if possible. Also extract the best product package image URL (starting with http) if available. The product is {PRODUCT_NAME}."
  }
};

export type EnrichmentSourceKey = keyof typeof ENRICHMENT_SOURCES;

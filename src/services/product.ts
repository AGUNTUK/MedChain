import { Product } from "../types";

// In-memory catalog cache for client-side fast navigation
const clientCatalogCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 60000; // 60 seconds TTL

/**
 * MediChain Product Catalog Service
 * 
 * Handles search, filters, category routing, and favorites/bookmark operations.
 */
export const productService = {
  /**
   * Clears the client-side catalog cache. Call after create/edit/delete operations.
   */
  clearCache(): void {
    clientCatalogCache.clear();
  },

  /**
   * Fetches the B2B wholesale product catalog with optional query, category, or deals filter parameters.
   */
  async getProducts(params?: { search?: string; category?: string; filter?: "deals" | "frequent" | "low_stock"; page?: number; limit?: number }): Promise<Product[]> {
    try {
      const q = new URLSearchParams();
      if (params?.search) q.append("search", params.search);
      if (params?.category) q.append("category", params.category);
      if (params?.filter) q.append("filter", params.filter);
      
      // Always enforce pagination limits to prevent payload overflow
      q.append("page", (params?.page || 1).toString());
      q.append("limit", (params?.limit || 50).toString());

      const queryStr = q.toString() ? `?${q.toString()}` : "";
      const cacheKey = `getProducts_${queryStr}`;
      
      const cached = clientCatalogCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.data;
      }

      const res = await fetch(`/api/products${queryStr}`);
      if (!res.ok) {
        return [];
      }
      
      const data = await res.json();
      const result = Array.isArray(data) ? data : (data.products || []);
      clientCatalogCache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } catch (err) {
      console.warn("Failed to fetch products API:", err);
      return [];
    }
  },

  /**
   * Fetches the distinct product categories from the catalog.
   */
  async getCategories(): Promise<string[]> {
    try {
      const cacheKey = "getCategories";
      const cached = clientCatalogCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS * 5) {
        return cached.data;
      }

      const res = await fetch("/api/categories");
      if (!res.ok) {
        return [];
      }
      const data = await res.json();
      clientCatalogCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (err) {
      console.warn("Failed to fetch product categories API:", err);
      return [];
    }
  },

  /**
   * Fetches the B2B wholesale product catalog with full pagination, scoring, and spelling corrections.
   */
  async getProductsPaginated(params: {
    search?: string;
    category?: string;
    filter?: "deals" | "frequent" | "low_stock";
    page?: number;
    limit?: number;
  }): Promise<{
    products: Product[];
    total: number;
    page: number;
    pageSize: number;
    pages: number;
    suggestions: string[];
    originalQuery: string;
    correctedQuery?: string;
  }> {
    try {
      const q = new URLSearchParams();
      if (params.search) q.append("search", params.search);
      if (params.category) q.append("category", params.category);
      if (params.filter) q.append("filter", params.filter);
      if (params.page) q.append("page", params.page.toString());
      if (params.limit) q.append("limit", params.limit.toString());
      q.append("paginate", "true");

      const queryStr = q.toString();
      const cacheKey = `getProductsPaginated_${queryStr}`;
      const cached = clientCatalogCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.data;
      }

      const res = await fetch(`/api/products?${queryStr}`);
      if (!res.ok) {
        throw new Error("Failed to fetch paginated product list from MediChain catalog.");
      }
      const data = await res.json();
      clientCatalogCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (err) {
      console.warn("Failed to fetch paginated products API:", err);
      return {
        products: [],
        total: 0,
        page: 1,
        pageSize: params.limit || 50,
        pages: 0,
        suggestions: [],
        originalQuery: params.search || "",
      };
    }
  },

  /**
   * Toggles a product in the user's pharmacy's list of favorites/frequent procurements.
   */
  async toggleFavourite(productId: string): Promise<{ isFavourite: boolean }> {
    const res = await fetch("/api/favourites/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });

    if (!res.ok) {
      throw new Error("Failed to update favorite status.");
    }

    return res.json();
  },

  /**
   * Gets only the IDs of the user's current favorite products.
   */
  async getFavouritesIds(): Promise<string[]> {
    try {
      const res = await fetch("/api/favourites/ids");
      if (!res.ok) {
        return [];
      }
      return await res.json();
    } catch (err) {
      console.warn("Failed to fetch favorite product IDs:", err);
      return [];
    }
  },

  /**
   * Retrieves full product objects of all bookmarked products.
   */
  async getFavourites(): Promise<Product[]> {
    const res = await fetch("/api/favourites");
    if (!res.ok) {
      throw new Error("Failed to fetch favorite products.");
    }
    return res.json();
  },

  /**
   * [ADMIN ACTION] Triggers a global 5% price drop across the platform for a simulated price-drop.
   */
  async triggerAdminPriceDrop(): Promise<{ success: boolean }> {
    const res = await fetch("/api/admin/trigger-price-drop", { method: "POST" });
    if (!res.ok) {
      throw new Error("Failed to trigger price drop admin action.");
    }
    return res.json();
  },

  /**
   * [ADMIN ACTION] Publishes a high-priority flash procurement offer from major companies like Incepta/Beximco.
   */
  async triggerAdminNewOffer(): Promise<{ success: boolean }> {
    const res = await fetch("/api/admin/trigger-new-offer", { method: "POST" });
    if (!res.ok) {
      throw new Error("Failed to trigger flash offer admin action.");
    }
    return res.json();
  },

  /**
   * [ADMIN ACTION] Updates a product via PATCH API for in-place catalog changes.
   */
  async updateProductPatch(id: string, updates: Partial<Product>): Promise<{ success: boolean; product: Product }> {
    const res = await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to update product via PATCH.");
    }

    this.clearCache();
    return res.json();
  },
};

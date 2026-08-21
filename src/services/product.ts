import { Product } from "../types";
import { apiCache } from "../lib/apiCache";

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
    apiCache.clear();
  },

  /**
   * Fetches the B2B wholesale product catalog with optional query, category, or deals filter parameters.
   */
  async getProducts(params?: { search?: string; category?: string; filter?: "deals" | "frequent" | "low_stock"; page?: number; limit?: number }): Promise<Product[]> {
    const q = new URLSearchParams();
    if (params?.search) q.append("search", params.search);
    if (params?.category) q.append("category", params.category);
    if (params?.filter) q.append("filter", params.filter);
    
    // Always enforce pagination limits to prevent payload overflow
    q.append("page", (params?.page || 1).toString());
    q.append("limit", (params?.limit || 50).toString());

    const queryStr = q.toString() ? `?${q.toString()}` : "";
    const cacheKey = `products_${queryStr}`;

    return apiCache.swr(cacheKey, async () => {
      const res = await fetch(`/api/products${queryStr}`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : (data.products || []);
    });
  },

  /**
   * Fetches the distinct product categories from the catalog.
   */
  async getCategories(): Promise<string[]> {
    return apiCache.swr("categories", async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) return [];
      return res.json();
    });
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
    const q = new URLSearchParams();
    if (params.search) q.append("search", params.search);
    if (params.category) q.append("category", params.category);
    if (params.filter) q.append("filter", params.filter);
    if (params.page) q.append("page", params.page.toString());
    if (params.limit) q.append("limit", params.limit.toString());
    q.append("paginate", "true");

    const queryStr = q.toString();
    const cacheKey = `products_paginated_${queryStr}`;

    return apiCache.swr(cacheKey, async () => {
      const res = await fetch(`/api/products?${queryStr}`);
      if (!res.ok) {
        throw new Error("Failed to fetch paginated product list from MediChain catalog.");
      }
      return res.json();
    });
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

import { Product } from "../types";

/**
 * MediChain Product Catalog Service
 * 
 * Handles search, filters, category routing, and favorites/bookmark operations.
 */
export const productService = {
  /**
   * Fetches the B2B wholesale product catalog with optional query, category, or deals filter parameters.
   */
  async getProducts(params?: { search?: string; category?: string; filter?: "deals" | "frequent" | "low_stock" }): Promise<Product[]> {
    const q = new URLSearchParams();
    if (params?.search) q.append("search", params.search);
    if (params?.category) q.append("category", params.category);
    if (params?.filter) q.append("filter", params.filter);

    const queryStr = q.toString() ? `?${q.toString()}` : "";
    const res = await fetch(`/api/products${queryStr}`);
    if (!res.ok) {
      throw new Error("Failed to fetch product list from MediChain catalog.");
    }
    return res.json();
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

    const res = await fetch(`/api/products?${q.toString()}`);
    if (!res.ok) {
      throw new Error("Failed to fetch paginated product list from MediChain catalog.");
    }
    return res.json();
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
    const res = await fetch("/api/favourites/ids");
    if (!res.ok) {
      throw new Error("Failed to fetch favorite product IDs.");
    }
    return res.json();
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
};

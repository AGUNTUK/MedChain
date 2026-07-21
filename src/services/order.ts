import { Order, OrderStatus } from "../types";

/**
 * MediChain Orders & B2B Cart Procurement Service
 * 
 * Manages active order workflows, real-time item reservations, re-ordering, and returns.
 */
export const orderService = {
  /**
   * Retrieves full procurement order history for the authenticated pharmacy.
   */
  async getOrders(): Promise<Order[]> {
    try {
      const res = await fetch("/api/orders");
      const contentType = res.headers.get("content-type");
      if (!res.ok || !contentType || !contentType.includes("application/json")) {
        console.warn("Orders history request failed or returned invalid format.");
        return [];
      }
      return await res.json();
    } catch (err) {
      console.error("Failed to load order history:", err);
      return [];
    }
  },

  /**
   * Fetches detailed information about a single order by its ID.
   */
  async getOrderById(orderId: string): Promise<Order> {
    const res = await fetch(`/api/orders/${orderId}`);
    if (!res.ok) {
      throw new Error("Failed to load details for this order.");
    }
    return res.json();
  },

  /**
   * Places a new procurement order based on the pharmacy's active shopping cart items.
   */
  async createOrder(orderData: { paymentMethod: string; notes?: string }): Promise<any> {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to finalize checkout and place order.");
    }

    return response.json();
  },

  /**
   * Retrieves the current items, subtotal, and savings in the user's active shopping cart.
   */
  async getCart(): Promise<{ items: any[]; totalAmount: number; totalSavings: number; totalMrp: number }> {
    const res = await fetch("/api/cart");
    if (!res.ok) {
      throw new Error("Failed to load your procurement cart.");
    }
    return res.json();
  },

  /**
   * Adds a product and quantity to the active cart.
   */
  async addToCart(productId: string, quantity: number): Promise<{ success: boolean }> {
    const res = await fetch("/api/cart/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to add item to cart.");
    }

    return res.json();
  },

  /**
   * Updates the exact quantity of a product currently in the cart.
   */
  async updateCartItem(productId: string, quantity: number): Promise<{ success: boolean }> {
    const res = await fetch("/api/cart/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to update item quantity in cart.");
    }

    return res.json();
  },

  /**
   * Deletes a product from the active cart.
   */
  async removeFromCart(productId: string): Promise<{ success: boolean }> {
    const res = await fetch("/api/cart/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to remove item from cart.");
    }

    return res.json();
  },

  /**
   * Clones a previous order and updates the cart with all its items for instant re-ordering.
   */
  async reorder(orderId: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/orders/${orderId}/reorder`, {
      method: "POST",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to duplicate this order into your cart.");
    }

    return res.json();
  },

  /**
   * Initiates a return request for products in a delivered order.
   */
  async requestReturn(orderId: string, returnReason: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/orders/${orderId}/return`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: returnReason }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to file return request.");
    }

    return res.json();
  },

  /**
   * Downloads the invoice for a given order.
   */
  async downloadInvoice(orderId: string): Promise<{ success: boolean; invoiceUrl: string; orderDetails: any }> {
    const res = await fetch(`/api/orders/${orderId}/invoice`);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to download invoice.");
    }

    return res.json();
  },

  /**
   * Cancels a pending or confirmed order before it is processed.
   */
  async cancelOrder(orderId: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/orders/${orderId}/cancel`, {
      method: "POST",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to cancel order.");
    }

    return res.json();
  },

  /**
   * [ADMIN/STAFF ACTION] Updates the delivery/processing status of an active order.
   */
  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<{ success: boolean }> {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to update order status.");
    }

    return res.json();
  },

  /**
   * [DEPOT STAFF ACTION] Assigns a delivery rider to a packed order and dispatches it.
   */
  async assignDelivery(orderId: string, assignedRiderId: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/depot/orders/${orderId}/assign-delivery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedRiderId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to assign delivery rider.");
    }

    return res.json();
  },

  /**
   * [ADMIN/STAFF ACTION] Approves a pending product return and clears credit/accounts.
   */
  async approveReturn(orderId: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/orders/${orderId}/approve-return`, {
      method: "POST",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to approve return request.");
    }

    return res.json();
  },
};

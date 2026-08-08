/**
 * MediChain Payment & B2B Analytics Service
 * 
 * Manages accounts receivable metrics, outstanding credits, billing logs, and historical procurement trends.
 */
export const paymentService = {
  /**
   * Processes a digital payment via bKash, Nagad, or SSLCommerz PGW.
   */
  async processGatewayPayment(payload: {
    orderId: string;
    paymentMethod: "bKash" | "Nagad" | "SSLCommerz" | "Cash on Delivery";
    walletNumber?: string;
    pin?: string;
    amount?: number;
    transactionId?: string;
  }): Promise<{
    success: boolean;
    message: string;
    transactionId: string;
    orderId: string;
    status: string;
  }> {
    const res = await fetch("/api/payments/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Payment gateway authorization failed.");
    }

    return res.json();
  },

  /**
   * Retrieves high-level spending analytics, total procurement value, credit line utilization, and credit limits.
   */
  async getAnalytics(): Promise<{
    totalPurchase: number;
    activeCredit: number;
    dueAmount: number;
    ordersTrend: Array<{ date: string; amount: number }>;
  }> {
    const res = await fetch("/api/analytics");
    if (!res.ok) {
      throw new Error("Failed to load your pharmacy's financial ledger.");
    }
    return res.json();
  },
};


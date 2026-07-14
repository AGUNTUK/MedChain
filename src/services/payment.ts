/**
 * MediChain Payment & B2B Analytics Service
 * 
 * Manages accounts receivable metrics, outstanding credits, billing logs, and historical procurement trends.
 */
export const paymentService = {
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

import { Pharmacy } from "../types";

/**
 * MediChain Pharmacy Profile Service
 * 
 * Manages official physical drug trade licenses, addresses, contact information,
 * and tracks the pharmacy's B2B credit parameters.
 */
export const profileService = {
  /**
   * Retrieves the physical trade profile and credit metrics for the current pharmacy owner.
   */
  async getPharmacyProfile(): Promise<Pharmacy | null> {
    try {
      const res = await fetch("/api/pharmacy/profile");
      if (res.status === 401 || res.status === 404) {
        return null;
      }
      if (!res.ok) {
        return null;
      }
      return await res.json();
    } catch (err) {
      console.warn("Failed to load pharmacy profile details (network error):", err);
      return null;
    }
  },

  /**
   * Updates or registers the pharmacy verification credentials and profile details.
   */
  async updatePharmacyProfile(profileData: Partial<Pharmacy>): Promise<{ success: boolean; pharmacy: Pharmacy }> {
    const response = await fetch("/api/pharmacy/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profileData),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to update pharmacy verification profile.");
    }

    return response.json();
  },
};

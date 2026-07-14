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
    const res = await fetch("/api/pharmacy/profile");
    if (res.status === 401 || res.status === 404) {
      return null;
    }
    if (!res.ok) {
      throw new Error("Failed to load pharmacy profile details.");
    }
    return res.json();
  },

  /**
   * Updates or registers the pharmacy verification credentials.
   */
  async updatePharmacyProfile(profileData: {
    pharmacyName: string;
    ownerName: string;
    phone: string;
    address: string;
    city: string;
    licenseNo: string;
  }): Promise<{ success: boolean; pharmacy: Pharmacy }> {
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

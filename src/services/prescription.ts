import { Product } from "../types";

export interface ScannedMedicine {
  extractedName: string;
  extractedStrength: string | null;
  extractedQuantity: number;
  matchedProduct: Product | null;
}

export const prescriptionService = {
  /**
   * Uploads an image of a prescription for optical scanning via Gemini API
   */
  async scanPrescription(imageBase64: string): Promise<{ success: boolean; items: ScannedMedicine[] }> {
    const res = await fetch("/api/prescription/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64 }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to process prescription image.");
    }
    return res.json();
  }
};

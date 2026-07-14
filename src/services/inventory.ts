import { Prescription } from "../types";

/**
 * MediChain Inventory & Batch Procurement Service
 * 
 * Manages specialized B2B inventory pipelines such as optical prescriptions matching and stock tracking.
 */
export const inventoryService = {
  /**
   * Uploads an image of a handwritten or printed prescription in base64 format to the MediChain server.
   * Uses the Gemini AI backend to extract medicine matches and suggest quantities.
   */
  async uploadPrescription(imageBase64: string, storageUrl?: string): Promise<any> {
    const res = await fetch("/api/prescription/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64, storageUrl }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to upload and analyze prescription.");
    }

    return res.json();
  },
};

import { isSupabaseConfigured } from "../lib/supabaseClient";

/**
 * MediChain Authentication Service
 * 
 * Supports dual-mode execution (local backend session proxy and handles potential Supabase integrations).
 */
export const authService = {
  /**
   * Sends an OTP verification request to the given mobile number.
   */
  async sendOtp(phone: string): Promise<{ success: boolean; message?: string }> {
    const response = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to send OTP verification code.");
    }

    return response.json();
  },

  /**
   * Verifies the OTP verification code for the given phone.
   */
  async verifyOtp(phone: string, otp: string): Promise<{ success: boolean; needsSetup: boolean; error?: string }> {
    const response = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, otp }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || "Invalid OTP code. Please try again.");
    }

    return response.json();
  },

  /**
   * Clears the user session and logs them out.
   */
  async logout(): Promise<void> {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Failed to clear authenticated session.");
    }
  },
};

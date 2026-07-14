import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

/**
 * MediChain Authentication Service
 * 
 * Supports dual-mode execution:
 * 1. Supabase Email/Password authentication & Database Synchronization.
 * 2. Local offline fallback login/signup proxy for local sandbox.
 */
export const authService = {
  /**
   * Signs up a new user with email/password and saves their profile in the Supabase users table (or falls back).
   */
  async signUp(email: string, password: string, name: string, role: string): Promise<{ success: boolean; user: any; needsSetup: boolean }> {
    if (isSupabaseConfigured) {
      // 1. Supabase Auth Sign Up
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        throw new Error(authError.message);
      }

      const user = authData.user;
      if (!user) {
        throw new Error("Failed to register user via Supabase.");
      }

      // 2. Insert into Supabase `users` table
      try {
        const { error: dbError } = await supabase
          .from("users")
          .upsert({
            id: user.id,
            email: email,
            name: name,
            role: role,
          });

        if (dbError) {
          console.warn("Could not insert user profile to Supabase database:", dbError.message);
        }
      } catch (dbErr) {
        console.warn("Failed database insert error:", dbErr);
      }

      // 3. Synchronize session with backend Express DB
      const response = await fetch("/api/auth/sync-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          email,
          name,
          role,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to synchronize authenticated session with server.");
      }

      return response.json();
    } else {
      // Offline fallback signup
      const response = await fetch("/api/auth/local-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, role }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed local offline registration.");
      }

      return response.json();
    }
  },

  /**
   * Logs in a user using email/password via Supabase (or falls back).
   */
  async login(email: string, password: string): Promise<{ success: boolean; user: any; needsSetup: boolean }> {
    if (isSupabaseConfigured) {
      // 1. Supabase Auth Login
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw new Error(authError.message);
      }

      const user = authData.user;
      if (!user) {
        throw new Error("Failed to login via Supabase.");
      }

      // 2. Fetch profile from Supabase users table
      let name = "Pharmacy Owner";
      let role = "Pharmacy Owner";
      
      try {
        const { data: profile, error: dbError } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();

        if (!dbError && profile) {
          name = profile.name || name;
          role = profile.role || role;
        }
      } catch (dbErr) {
        console.warn("Failed database read error:", dbErr);
      }

      // 3. Synchronize session with backend Express DB
      const response = await fetch("/api/auth/sync-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          email,
          name,
          role,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to synchronize authenticated session with server.");
      }

      return response.json();
    } else {
      // Offline fallback login
      const response = await fetch("/api/auth/local-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed local offline login.");
      }

      return response.json();
    }
  },

  /**
   * Logs out the user from Supabase and clears the local session.
   */
  async logout(): Promise<void> {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut().catch((err: any) => console.warn("Supabase signOut error:", err));
    }

    const response = await fetch("/api/auth/logout", {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Failed to clear authenticated session.");
    }
  },
};

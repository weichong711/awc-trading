// ── Single shared Supabase client instance ────────────────────────────────────
// Import this file everywhere instead of calling createClient() directly.
// Having multiple createClient() calls causes the "Multiple GoTrueClient
// instances" warning and can lead to auth state bugs.

import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "/utils/supabase/info";

export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey,
  {
    auth: {
      // Use a single, stable storage key so all parts of the app share the same session
      storageKey: "awc-trading-auth",
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);

// Frontend calls endpoints like `${SERVER}/auth/signup`.
// The Edge Function code registers routes under:
//   /make-server-51f3fb75/*
// so SERVER must include the extra prefix segment.
export const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-51f3fb75/make-server-51f3fb75`;

// ── Admin email — change this to YOUR email address ───────────────────────────
// This must exactly match the email you use to log in.
// Example: "yourealemail@gmail.com"
export const ADMIN_EMAIL = "leongweichong0748@gmail.com";

// Re-export so other files don't need to import from /utils/supabase/info directly
export { publicAnonKey };
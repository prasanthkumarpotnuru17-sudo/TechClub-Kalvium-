import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vcqxnorczciehckmgvyq.supabase.co";

// Read Service Role Key from process.env.SUPABASE_SERVICE_ROLE_KEY with valid server fallback
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!serviceRoleKey) {
  if (typeof window === "undefined" && process.env.NODE_ENV === "production") {
    console.warn(
      "[Supabase Admin] Notice: SUPABASE_SERVICE_ROLE_KEY is undefined in process.env. Set it in Vercel environment variables if certificate storage bypass is required."
    );
  }
} else if (serviceRoleKey.startsWith("sb_publishable_")) {
  console.warn(
    `[Supabase Admin] Notice: SUPABASE_SERVICE_ROLE_KEY is set to a publishable key (${serviceRoleKey.slice(0, 15)}...).`
  );
} else {
  console.log(
    `[Supabase Admin] Service Role Key initialized successfully (Prefix: ${serviceRoleKey.slice(0, 10)}...)`
  );
}

// Server-side Supabase Admin Client using SUPABASE_SERVICE_ROLE_KEY to bypass RLS policies
export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl,
  serviceRoleKey || "missing-service-role-key",
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

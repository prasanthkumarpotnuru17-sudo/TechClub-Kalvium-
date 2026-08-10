import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Ensure runtime always resolves valid Supabase project credentials
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vcqxnorczciehckmgvyq.supabase.co";

const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_G93LTUmN2ta1oq8RW4fdww_2dcXWjQf";

console.log(`[Supabase Client] Initialized with URL: ${supabaseUrl}`);

export const supabase: SupabaseClient = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: false,
  },
});

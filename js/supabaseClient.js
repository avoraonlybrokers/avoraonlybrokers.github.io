// Requires the Supabase CDN script to be loaded first:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
// and js/config.js before this file.

const supabaseClient = window.supabase.createClient(
  AVORA_CONFIG.SUPABASE_URL,
  AVORA_CONFIG.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: "avora-auth",
    },
  }
);

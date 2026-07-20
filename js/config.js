// ============================================================
// AVORA — public configuration
//
// SUPABASE_URL and SUPABASE_ANON_KEY are meant to be public —
// every Supabase project ships them to the browser by design.
// Real protection comes from Row Level Security (see
// sql/policies.sql), not from hiding these two values.
//
// NEVER put the service_role / "secret" key anywhere in this
// project. It is not needed: the admin panel works by signing
// in as the admin user via Supabase Auth, and RLS policies
// grant that authenticated session write access. A secret key
// in a GitHub Pages file would be visible to literally anyone
// who views the page source.
// ============================================================

const AVORA_CONFIG = {
  SUPABASE_URL: "https://nqjkobsbsceheollttak.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_IjfvDQue6nTfMi0KhKPCAw_abivnLy1",

  // The single administrator's login email. This is not a
  // secret — knowing it does not let anyone log in without the
  // real password — it just lets the hidden login form ask for
  // a password only, matching the original design.
  ADMIN_EMAIL: "rthdtest44@gmail.com",

  // Optional: paste a Google Maps embed API key here if you have one.
  GOOGLE_MAPS_API_KEY: "",
};

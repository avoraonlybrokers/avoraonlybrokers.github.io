async function avoraLoadHero() {
  const { data: settings } = await supabaseClient.from("site_settings").select("*").eq("id", 1).single();
  const video = document.getElementById("hero-video");
  const fallback = document.getElementById("hero-fallback");
  if (settings?.hero_video_url) {
    video.src = settings.hero_video_url;
    video.classList.remove("hidden");
    fallback.classList.add("hidden");
  }
}

async function avoraLoadProjects() {
  const grid = document.getElementById("projects-grid");
  const empty = document.getElementById("projects-empty");
  const { data, error } = await supabaseClient
    .from("complexes")
    .select("*")
    .eq("status", "published")
    .order("sort_order", { ascending: true });

  if (error || !data || data.length === 0) {
    empty.classList.remove("hidden");
    return;
  }

  empty.classList.add("hidden");
  grid.innerHTML = data.map(avoraProjectCardHTML).join("");
  avoraApplyTranslations();
  avoraRenderIcons();
  avoraObserveNewReveals(grid);
}

async function avoraLoadGuidesTeaser() {
  const grid = document.getElementById("guides-grid");
  const empty = document.getElementById("guides-empty");
  const { data, error } = await supabaseClient
    .from("guides")
    .select("*")
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .limit(3);

  if (error || !data || data.length === 0) {
    document.getElementById("guides-teaser")?.classList.add("hidden");
    return;
  }

  empty.classList.add("hidden");
  grid.innerHTML = data.map(avoraGuideCardHTML).join("");
  avoraApplyTranslations();
  avoraRenderIcons();
  avoraObserveNewReveals(grid);
}

document.addEventListener("DOMContentLoaded", () => {
  avoraInitReveal();
  avoraLoadHero();
  avoraLoadProjects();
  avoraLoadGuidesTeaser();
  document.addEventListener("avora:locale-changed", () => {
    avoraLoadProjects();
    avoraLoadGuidesTeaser();
  });
});

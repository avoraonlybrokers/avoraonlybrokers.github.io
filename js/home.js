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

  grid.innerHTML = data.map(avoraProjectCardHTML).join("");
  avoraApplyTranslations();
  avoraRenderIcons();
  avoraObserveNewReveals(grid);
}

async function avoraLoadDevelopersTeaser() {
  const grid = document.getElementById("developers-grid");
  const [{ data: developers }, { data: counts }] = await Promise.all([
    supabaseClient.from("developers").select("*").eq("is_hidden", false).order("sort_order", { ascending: true }).limit(6),
    supabaseClient.from("developer_project_counts").select("*"),
  ]);

  if (!developers || developers.length === 0) {
    document.getElementById("developers-teaser").classList.add("hidden");
    return;
  }

  const countMap = {};
  (counts || []).forEach((c) => (countMap[c.developer_id] = c.project_count));

  grid.innerHTML = developers.map((d) => avoraDeveloperCardHTML(d, countMap[d.id] || 0)).join("");
  avoraApplyTranslations();
  avoraRenderIcons();
  avoraObserveNewReveals(grid);
}

document.addEventListener("DOMContentLoaded", () => {
  avoraInitReveal();
  avoraLoadHero();
  avoraLoadProjects();
  avoraLoadDevelopersTeaser();
  document.addEventListener("avora:locale-changed", () => {
    avoraLoadProjects();
    avoraLoadDevelopersTeaser();
  });
});

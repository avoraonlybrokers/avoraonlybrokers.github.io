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

function avoraRunPreloader() {
  const el = document.getElementById("avora-preloader");
  if (!el) return;

  if (sessionStorage.getItem("avora_intro_shown")) {
    el.classList.add("instant");
    return;
  }
  sessionStorage.setItem("avora_intro_shown", "1");

  avoraSplitLetters(document.getElementById("avora-preloader-letters"), "AVORA");
  document.body.style.overflow = "hidden";

  setTimeout(() => {
    el.classList.add("hide");
    document.body.style.overflow = "";
    setTimeout(() => el.remove(), 900);
  }, 1500);
}

document.addEventListener("DOMContentLoaded", () => {
  avoraRunPreloader();
  avoraSplitLetters(document.getElementById("hero-title-letters"), "AVORA");
  avoraInitReveal();
  avoraLoadHero();
  avoraLoadProjects();
  avoraLoadGuidesTeaser();
  avoraLoadReviews("reviews-grid", "reviews-empty", 9);
  avoraWireReviewModal();
  document.addEventListener("avora:locale-changed", () => {
    avoraLoadProjects();
    avoraLoadGuidesTeaser();
  });
});

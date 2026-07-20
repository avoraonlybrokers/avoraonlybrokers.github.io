async function avoraLoadAllGuides() {
  const grid = document.getElementById("guides-grid");
  const empty = document.getElementById("guides-empty");

  const { data, error } = await supabaseClient
    .from("guides")
    .select("*")
    .eq("status", "published")
    .order("sort_order", { ascending: true });

  if (error || !data || data.length === 0) {
    empty.classList.remove("hidden");
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
  avoraLoadAllGuides();
  document.addEventListener("avora:locale-changed", avoraLoadAllGuides);
});

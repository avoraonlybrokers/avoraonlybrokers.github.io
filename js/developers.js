async function avoraLoadAllDevelopers() {
  const grid = document.getElementById("developers-grid");
  const [{ data: developers }, { data: counts }] = await Promise.all([
    supabaseClient.from("developers").select("*").eq("is_hidden", false).order("sort_order", { ascending: true }),
    supabaseClient.from("developer_project_counts").select("*"),
  ]);

  if (!developers || developers.length === 0) return;

  const countMap = {};
  (counts || []).forEach((c) => (countMap[c.developer_id] = c.project_count));

  grid.innerHTML = developers.map((d) => avoraDeveloperCardHTML(d, countMap[d.id] || 0)).join("");
  avoraApplyTranslations();
  avoraRenderIcons();
  avoraObserveNewReveals(grid);
}

document.addEventListener("DOMContentLoaded", () => {
  avoraInitReveal();
  avoraLoadAllDevelopers();
  document.addEventListener("avora:locale-changed", avoraLoadAllDevelopers);
});

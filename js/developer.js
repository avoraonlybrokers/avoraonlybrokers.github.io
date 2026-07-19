async function avoraLoadDeveloperPage() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (!id) return;

  const { data: developer } = await supabaseClient
    .from("developers")
    .select("*")
    .eq("id", id)
    .eq("is_hidden", false)
    .single();

  if (!developer) {
    document.getElementById("developer-header").innerHTML = `<p>Developer not found.</p>`;
    return;
  }

  const name = avoraPick(developer, "name") || developer.name_en;
  const description = avoraPick(developer, "description");

  document.title = `${developer.name_en} — AVORA`;
  document.getElementById("developer-header").innerHTML = `
    <div class="developer-logo-circle" style="width:80px;height:80px;margin:0 auto 20px;">
      ${developer.logo_url
        ? `<img src="${developer.logo_url}" alt="${avoraEscapeHtml(name)}" style="width:56px;height:56px;" />`
        : `<i data-lucide="building-2" width="28" height="28" style="color:rgba(247,247,245,0.5)"></i>`}
    </div>
    <h1 class="font-display" style="font-size:44px">${avoraEscapeHtml(name)}</h1>
    ${description ? `<p style="max-width:640px;margin:16px auto 0;color:rgba(247,247,245,0.7)">${avoraEscapeHtml(description)}</p>` : ""}
    ${developer.website_url ? `
    <a href="${developer.website_url}" target="_blank" rel="noopener noreferrer" class="btn-outline-gold" style="margin-top:20px;display:inline-flex;">
      <i data-lucide="globe" width="13" height="13"></i><span data-i18n="official_site"></span>
    </a>` : ""}
  `;
  avoraApplyTranslations();
  avoraRenderIcons();

  const { data: projects } = await supabaseClient
    .from("complexes")
    .select("*")
    .eq("developer_id", id)
    .eq("status", "published")
    .order("sort_order", { ascending: true });

  const projectsEl = document.getElementById("developer-projects");
  if (projects && projects.length > 0) {
    projectsEl.innerHTML = `
      <h2 class="font-display" style="font-size:28px;margin-bottom:32px" data-i18n="projects_of_developer"></h2>
      <div class="grid-cards">${projects.map(avoraProjectCardHTML).join("")}</div>`;
    avoraApplyTranslations();
    avoraRenderIcons();
    avoraObserveNewReveals(projectsEl);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  avoraInitReveal();
  avoraLoadDeveloperPage();
  document.addEventListener("avora:locale-changed", avoraLoadDeveloperPage);
});
